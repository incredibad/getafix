import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from auth import get_optional_user
from api import sofascore
from api import espn
import cache as _cache

logger = logging.getLogger(__name__)
router = APIRouter()


def _is_matchday(db: Session) -> bool:
    today = datetime.now(timezone.utc).date().isoformat()
    entries = db.query(models.ApiCache).filter(
        models.ApiCache.cache_key.contains("schedule") | models.ApiCache.cache_key.contains("fixtures")
    ).all()
    for entry in entries:
        import json
        try:
            data = json.loads(entry.data_json)
            fixtures = data.get("fixtures") or []
            for f in fixtures:
                date_str = f.get("utc_date", "")[:10]
                if date_str == today and f.get("status") in ("LIVE", "FINISHED"):
                    return True
        except Exception:
            pass
    return False


def _standings_ttl(db: Session) -> float:
    return 6.0 if _is_matchday(db) else 24.0


@router.get("/competition/{competition_id}", response_model=list[dict])
async def get_standings_by_competition(
    competition_id: int,
    _: models.User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    comp = db.query(models.Competition).filter(models.Competition.id == competition_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Competition not found.")
    return await _fetch_standings(comp, db)


@router.get("/followed", response_model=list[dict])
async def get_standings_for_followed_teams(
    _: models.User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    followed = db.query(models.FollowedTeam).all()
    if not followed:
        return []

    comp_ids: set[int] = set()
    for ft in followed:
        for tc in ft.team.competitions:
            comp_ids.add(tc.competition_id)

    results = []
    for comp_id in comp_ids:
        comp = db.query(models.Competition).filter(models.Competition.id == comp_id).first()
        if comp:
            data = await _fetch_standings(comp, db)
            if data:
                results.extend(data)
    return results


async def _fetch_standings(comp: models.Competition, db: Session) -> list[dict]:
    ttl = _standings_ttl(db)

    # Sofascore primary
    ss_tid = getattr(comp, "sofascore_tournament_id", None)
    if ss_tid:
        result = await sofascore.get_competition_standings(ss_tid, db, ttl)
        if result:
            result["competition"]["name"] = comp.name
            result["competition"]["emblem_url"] = result["competition"].get("emblem_url") or comp.emblem_url
            result["cached_at"] = _cache.cached_at_str(db, f"sofascore:standings:{ss_tid}:{result.get('season', '')}")
            return _expand_tables(result)

    # ESPN fallback
    espn_slug = getattr(comp, "espn_slug", None)
    if espn_slug:
        result = await espn.get_competition_standings(espn_slug, db, ttl)
        if result:
            result["cached_at"] = _cache.cached_at_str(db, f"espn:standings:{espn_slug}") or result.get("cached_at", "")
            return _expand_tables(result)

    return []


def _expand_tables(standings: dict) -> list[dict]:
    tables = standings.get("tables", [])
    if not tables:
        return []
    results = []
    for t in tables:
        if not t.get("table"):
            continue
        results.append({
            **standings,
            "stage": t.get("stage"),
            "group": t.get("group"),
            "table": t["table"],
            "start_date": t.get("start_date"),
            "end_date": t.get("end_date"),
            "tables": [],
        })
    return results or []
