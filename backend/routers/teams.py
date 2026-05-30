import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
import cache as _cache
from auth import get_current_user
from api import football_data as fd
from api import api_football as apf

SEARCH_CACHE_TTL_HOURS = 24 * 7  # 7 days

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/followed", response_model=list[schemas.TeamResponse])
def list_followed_teams(
    _: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    followed = db.query(models.FollowedTeam).all()
    result = []
    for f in followed:
        team = f.team
        result.append(schemas.TeamResponse(
            id=team.id,
            name=team.name,
            short_name=team.short_name,
            country=team.country,
            crest_url=team.crest_url,
            team_type=team.team_type,
            football_data_id=team.football_data_id,
            api_football_id=team.api_football_id,
            is_followed=True,
        ))
    return result


@router.post("/follow", response_model=schemas.TeamResponse)
async def follow_team(
    data: schemas.FollowTeamRequest,
    _: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Find existing team by either API ID
    team = None
    if data.football_data_id:
        team = db.query(models.Team).filter(models.Team.football_data_id == data.football_data_id).first()
    if not team and data.api_football_id:
        team = db.query(models.Team).filter(models.Team.api_football_id == data.api_football_id).first()

    if not team:
        team = models.Team(
            name=data.name,
            short_name=data.short_name,
            country=data.country,
            crest_url=data.crest_url,
            team_type=data.team_type,
            football_data_id=data.football_data_id,
            api_football_id=data.api_football_id,
        )
        db.add(team)
        db.flush()
    else:
        # Update any missing IDs
        if data.football_data_id and not team.football_data_id:
            team.football_data_id = data.football_data_id
        if data.api_football_id and not team.api_football_id:
            team.api_football_id = data.api_football_id
        if data.crest_url and not team.crest_url:
            team.crest_url = data.crest_url

    # Auto-resolve missing FD ID by scanning competition team lists
    if not team.football_data_id:
        fd_id = await fd.find_team_id_by_name(data.name, db, data.team_type)
        if fd_id:
            team.football_data_id = fd_id

    existing = db.query(models.FollowedTeam).filter(models.FollowedTeam.team_id == team.id).first()
    if not existing:
        db.add(models.FollowedTeam(team_id=team.id))

    db.commit()
    db.refresh(team)
    return schemas.TeamResponse(
        id=team.id,
        name=team.name,
        short_name=team.short_name,
        country=team.country,
        crest_url=team.crest_url,
        team_type=team.team_type,
        football_data_id=team.football_data_id,
        api_football_id=team.api_football_id,
        is_followed=True,
    )


@router.delete("/{team_id}/unfollow")
def unfollow_team(
    team_id: int,
    _: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    followed = db.query(models.FollowedTeam).filter(models.FollowedTeam.team_id == team_id).first()
    if not followed:
        raise HTTPException(status_code=404, detail="Team not followed.")
    db.delete(followed)
    db.commit()
    return {"message": "Unfollowed."}


@router.get("/search", response_model=list[schemas.TeamSearchResult])
async def search_teams(
    q: str = Query(..., min_length=2),
    _: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cache_key = f"team_search:{q.lower().strip()}"
    raw = _cache.get_cached(db, cache_key, SEARCH_CACHE_TTL_HOURS)
    if raw is None:
        fd_results, apf_results = await _do_search(q, db)
        raw = fd_results + apf_results
        # Deduplicate before caching
        seen_names: set[str] = set()
        deduped_raw = []
        for r in raw:
            key = r["name"].lower().strip()
            if key not in seen_names:
                seen_names.add(key)
                deduped_raw.append(r)
        _cache.set_cached(db, cache_key, {"results": deduped_raw})
        raw = deduped_raw
    else:
        raw = raw.get("results", [])

    followed_fd_ids = {t.team.football_data_id for t in db.query(models.FollowedTeam).all() if t.team.football_data_id}
    followed_apf_ids = {t.team.api_football_id for t in db.query(models.FollowedTeam).all() if t.team.api_football_id}

    def enrich(r: dict) -> schemas.TeamSearchResult:
        already = bool(
            (r.get("football_data_id") and r["football_data_id"] in followed_fd_ids)
            or (r.get("api_football_id") and r["api_football_id"] in followed_apf_ids)
        )
        internal_id = None
        if r.get("football_data_id"):
            t = db.query(models.Team).filter(models.Team.football_data_id == r["football_data_id"]).first()
            if t:
                internal_id = t.id
        if not internal_id and r.get("api_football_id"):
            t = db.query(models.Team).filter(models.Team.api_football_id == r["api_football_id"]).first()
            if t:
                internal_id = t.id
        return schemas.TeamSearchResult(**r, already_followed=already, internal_id=internal_id)

    return [enrich(r) for r in raw]


async def _do_search(q: str, db: Session):
    import asyncio
    fd_task = fd.search_teams(q, db)
    apf_task = apf.search_teams(q, db)
    fd_results, apf_results = await asyncio.gather(fd_task, apf_task, return_exceptions=True)
    if isinstance(fd_results, Exception):
        logger.warning(f"FD search failed: {fd_results}")
        fd_results = []
    if isinstance(apf_results, Exception):
        logger.warning(f"APF search failed: {apf_results}")
        apf_results = []
    return fd_results, apf_results
