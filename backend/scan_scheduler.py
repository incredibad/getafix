"""Daily background scan that force-refreshes the cache for every followed
team's fixtures and every followed competition's standings, so real user
requests almost always land on warm cache instead of paying a live-fetch cost.
"""
import asyncio
import logging
import time
from datetime import datetime, timezone, timedelta

from sqlalchemy.orm import Session

import models
from routers.fixtures import _fetch_team_fixtures
from routers.standings import _fetch_standings

logger = logging.getLogger(__name__)

AEST = timezone(timedelta(hours=10))


def get_or_create_schedule(db: Session) -> models.ScanSchedule:
    sched = db.query(models.ScanSchedule).first()
    if not sched:
        sched = models.ScanSchedule(enabled=False, time_of_day=None)
        db.add(sched)
        db.commit()
        db.refresh(sched)
    return sched


async def run_scan(db: Session) -> dict:
    """Force-refresh fixtures for every followed team and standings for every
    followed competition. Returns a summary dict."""
    start = time.perf_counter()

    followed = db.query(models.FollowedTeam).all()
    team_results = await asyncio.gather(
        *[_fetch_team_fixtures(ft.team, db, disable_sofascore=False, force=True) for ft in followed],
        return_exceptions=True,
    )
    for ft, result in zip(followed, team_results):
        if isinstance(result, Exception):
            logger.warning(f"Scan: fixture refresh failed for team {ft.team_id}: {result}")

    comp_ids: set[int] = set()
    for ft in followed:
        for tc in ft.team.competitions:
            comp_ids.add(tc.competition_id)
    comps = db.query(models.Competition).filter(models.Competition.id.in_(comp_ids)).all() if comp_ids else []

    comp_results = await asyncio.gather(
        *[_fetch_standings(comp, db, disable_sofascore=False, force=True) for comp in comps],
        return_exceptions=True,
    )
    for comp, result in zip(comps, comp_results):
        if isinstance(result, Exception):
            logger.warning(f"Scan: standings refresh failed for competition {comp.id}: {result}")

    duration = time.perf_counter() - start
    return {
        "teams_scanned": len(followed),
        "teams_ok": sum(1 for r in team_results if not isinstance(r, Exception)),
        "competitions_scanned": len(comps),
        "competitions_ok": sum(1 for r in comp_results if not isinstance(r, Exception)),
        "duration_s": duration,
    }


async def execute_and_record_scan(db: Session) -> models.ScanSchedule:
    """Run the scan and persist the result onto the schedule row. Used by both
    the daily loop and the admin 'run now' button."""
    sched = get_or_create_schedule(db)
    now_aest = datetime.now(timezone.utc).astimezone(AEST)
    try:
        result = await run_scan(db)
        sched.last_run_status = "success"
        sched.last_run_error = None
        sched.last_run_duration_s = result["duration_s"]
        logger.info(f"Cache-warm scan complete: {result}")
    except Exception as exc:
        sched.last_run_status = "error"
        sched.last_run_error = str(exc)[:500]
        logger.error(f"Cache-warm scan failed: {exc}")
    sched.last_run_at = datetime.utcnow()
    sched.last_run_date = now_aest.date().isoformat()
    db.commit()
    db.refresh(sched)
    return sched


async def _maybe_run_scheduled_scan(db: Session) -> None:
    sched = get_or_create_schedule(db)
    if not sched.enabled or not sched.time_of_day:
        return

    now_aest = datetime.now(timezone.utc).astimezone(AEST)
    if sched.last_run_date == now_aest.date().isoformat():
        return  # already ran today

    try:
        hh, mm = (int(x) for x in sched.time_of_day.split(":"))
    except Exception:
        logger.warning(f"Invalid scan_schedule.time_of_day: {sched.time_of_day!r}")
        return

    if (now_aest.hour, now_aest.minute) < (hh, mm):
        return  # not yet time

    logger.info(f"Scheduled scan time ({sched.time_of_day} AEST) reached — running cache-warm scan")
    await execute_and_record_scan(db)


async def scheduled_scan_loop():
    from database import SessionLocal

    while True:
        await asyncio.sleep(60)
        db = SessionLocal()
        try:
            await _maybe_run_scheduled_scan(db)
        except Exception as exc:
            logger.error(f"Scheduled scan check failed: {exc}")
        finally:
            db.close()
