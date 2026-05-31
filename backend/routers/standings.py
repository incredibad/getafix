import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from auth import get_current_user
from api import football_data as fd
from api import espn
import cache as _cache

logger = logging.getLogger(__name__)
router = APIRouter()


def _is_matchday(db: Session) -> bool:
    """True if any followed team has a LIVE or recently-finished match today."""
    today = datetime.now(timezone.utc).date().isoformat()
    entries = db.query(models.ApiCache).filter(
        models.ApiCache.cache_key.contains("matches") | models.ApiCache.cache_key.contains("fixtures")
    ).all()
    for entry in entries:
        import json
        try:
            data = json.loads(entry.data_json)
            fixtures = data.get("matches") or data.get("fixtures") or []
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
    _: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    comp = db.query(models.Competition).filter(models.Competition.id == competition_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Competition not found.")
    return await _fetch_standings(comp, db)


@router.get("/followed", response_model=list[dict])
async def get_standings_for_followed_teams(
    _: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return standings for all competitions that followed teams play in."""
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

    if comp.preferred_source == "football_data" and comp.football_data_id:
        result = await fd.get_competition_standings(comp.football_data_id, db, ttl)
        if result:
            result["cached_at"] = _cache.cached_at_str(db, f"fd:standings:{comp.football_data_id}")
            return [result]

    espn_slug = getattr(comp, "espn_slug", None)
    if espn_slug:
        result = await espn.get_competition_standings(espn_slug, db, ttl)
        if result:
            result["cached_at"] = _cache.cached_at_str(db, f"espn:standings:{espn_slug}") or result.get("cached_at", "")
            return _expand_groups(result)

    return []


def _expand_groups(standings: dict) -> list[dict]:
    """Flatten multi-group ESPN standings into one dict per group (matching existing schema)."""
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
    return results if results else []
