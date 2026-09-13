import asyncio
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
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


def _disable_sofascore(request: Request) -> bool:
    return request.headers.get("X-Disable-Sofascore", "").lower() == "true"


def _is_matchday(db: Session) -> bool:
    # Expensive: scans every cached schedule/fixtures blob (can be 100+ rows,
    # megabytes of JSON) and fully deserializes each one. _fetch_standings calls
    # this (via _standings_ttl) once per followed competition, so without caching
    # a single /standings/followed request pays this cost N times over — and since
    # it's synchronous CPU-bound work inside an async endpoint, it blocks the whole
    # event loop (and, via the GIL, other threads) for the duration. Cache the
    # result briefly; matchday status doesn't need to be recomputed every call.
    cache_key = "internal:is_matchday"
    cached = _cache.get_cached(db, cache_key, 0.1)
    if cached is not None:
        return cached.get("value", False)

    today = datetime.now(timezone.utc).date().isoformat()
    entries = db.query(models.ApiCache).filter(
        models.ApiCache.cache_key.contains("schedule") | models.ApiCache.cache_key.contains("fixtures")
    ).all()
    result = False
    for entry in entries:
        import json
        try:
            data = json.loads(entry.data_json)
            fixtures = data.get("fixtures") or []
            for f in fixtures:
                date_str = f.get("utc_date", "")[:10]
                if date_str == today and f.get("status") in ("LIVE", "FINISHED"):
                    result = True
                    break
        except Exception:
            pass
        if result:
            break
    _cache.set_cached(db, cache_key, {"value": result})
    return result


def _standings_ttl(db: Session) -> float:
    return 6.0 if _is_matchday(db) else 24.0


@router.get("/competition/{competition_id}", response_model=list[dict])
async def get_standings_by_competition(
    competition_id: int,
    _: models.User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
    disable_sofascore: bool = Depends(_disable_sofascore),
):
    comp = db.query(models.Competition).filter(models.Competition.id == competition_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Competition not found.")
    return await _fetch_standings(comp, db, disable_sofascore)


@router.get("/sofascore/{tournament_id}", response_model=list[dict])
async def get_standings_by_sofascore_id(
    tournament_id: int,
    season_id: int | None = None,
    _: models.User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
    disable_sofascore: bool = Depends(_disable_sofascore),
):
    """Fetch standings for any Sofascore tournament by ID."""
    ttl = _standings_ttl(db)

    if not disable_sofascore:
        result = await sofascore.get_competition_standings(tournament_id, db, ttl, season_id=season_id)
        if result:
            result["source"] = "sofascore"
            result["cached_at"] = _cache.cached_at_str(db, f"sofascore:standings:{tournament_id}:{result.get('season', '')}")
            return _expand_tables(result)
        raise HTTPException(status_code=404, detail="No standings available for this competition.")

    # Sofascore disabled — try ESPN fallback via the competition's espn_slug
    comp = db.query(models.Competition).filter(
        models.Competition.sofascore_tournament_id == tournament_id
    ).first()
    if comp and comp.espn_slug:
        result = await espn.get_competition_standings(comp.espn_slug, db, ttl)
        if result:
            result["source"] = "espn"
            result["competition"]["name"] = comp.name
            emblem = result["competition"].get("emblem_url") or comp.emblem_url or sofascore._tournament_emblem(tournament_id)
            result["competition"]["emblem_url"] = emblem
            result["cached_at"] = _cache.cached_at_str(db, f"espn:standings:{comp.espn_slug}") or result.get("cached_at", "")
            return _expand_tables(result)

    raise HTTPException(status_code=404, detail="No standings available for this competition.")


@router.get("/cups/sofascore/{tournament_id}", response_model=dict)
async def get_cup_tree(
    tournament_id: int,
    team_id: int,
    season_id: int | None = None,
    db: Session = Depends(get_db),
):
    """Fetch a team's cup run for a given Sofascore tournament."""
    ttl = _standings_ttl(db)
    result = await sofascore.get_cup_tree_for_team(tournament_id, team_id, db, ttl, season_id=season_id)
    if not result:
        raise HTTPException(status_code=404, detail="No cup data available.")
    return result


@router.get("/followed", response_model=list[dict])
async def get_standings_for_followed_teams(
    _: models.User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
    disable_sofascore: bool = Depends(_disable_sofascore),
):
    followed = db.query(models.FollowedTeam).all()
    if not followed:
        return []

    comp_ids: set[int] = set()
    for ft in followed:
        for tc in ft.team.competitions:
            comp_ids.add(tc.competition_id)

    comps = db.query(models.Competition).filter(models.Competition.id.in_(comp_ids)).all()

    # Fetch all competitions in parallel rather than sequentially
    fetched = await asyncio.gather(
        *[_fetch_standings(comp, db, disable_sofascore) for comp in comps],
        return_exceptions=True,
    )

    results = []
    for data in fetched:
        if isinstance(data, Exception):
            logger.warning("Error fetching standings for a competition: %s", data)
            continue
        if data:
            results.extend(data)
    return results


async def _fetch_standings(comp: models.Competition, db: Session, disable_sofascore: bool = False) -> list[dict]:
    ttl = _standings_ttl(db)

    # Sofascore primary
    ss_tid = getattr(comp, "sofascore_tournament_id", None)
    if ss_tid and not disable_sofascore:
        result = await sofascore.get_competition_standings(ss_tid, db, ttl)
        if result:
            result["source"] = "sofascore"
            result["competition"]["name"] = comp.name
            result["competition"]["emblem_url"] = result["competition"].get("emblem_url") or comp.emblem_url
            result["cached_at"] = _cache.cached_at_str(db, f"sofascore:standings:{ss_tid}:{result.get('season', '')}")
            return _expand_tables(result)

    # ESPN fallback
    espn_slug = getattr(comp, "espn_slug", None)
    if espn_slug:
        result = await espn.get_competition_standings(espn_slug, db, ttl)
        if result:
            result["source"] = "espn"
            result["competition"]["name"] = comp.name
            emblem = result["competition"].get("emblem_url") or comp.emblem_url
            if not emblem and ss_tid:
                emblem = sofascore._tournament_emblem(ss_tid)
            result["competition"]["emblem_url"] = emblem
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
