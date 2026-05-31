import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
import cache as _cache
from auth import get_current_user, get_optional_user
from api import football_data as fd
from api import espn

SEARCH_CACHE_TTL_HOURS = 24 * 7  # 7 days

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/followed", response_model=list[schemas.TeamResponse])
def list_followed_teams(
    _: models.User | None = Depends(get_optional_user),
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
            espn_id=team.espn_id,
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

    # Auto-resolve ESPN ID for national teams (covers qualifiers/friendlies)
    if not team.espn_id and data.team_type == "national":
        espn_id = await espn.find_espn_id_by_name(data.name, db)
        if espn_id:
            team.espn_id = espn_id

    existing = db.query(models.FollowedTeam).filter(models.FollowedTeam.team_id == team.id).first()
    if not existing:
        db.add(models.FollowedTeam(team_id=team.id))

    db.commit()
    db.refresh(team)

    linked = _link_competitions_from_cache(team, db)

    return schemas.TeamResponse(
        id=team.id,
        name=team.name,
        short_name=team.short_name,
        country=team.country,
        crest_url=team.crest_url,
        team_type=team.team_type,
        football_data_id=team.football_data_id,
        api_football_id=team.api_football_id,
        espn_id=team.espn_id,
        is_followed=True,
        linked_competitions=linked,
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
    try:
        fd_results = await fd.search_teams(q, db)
    except Exception as e:
        logger.warning(f"FD search failed: {e}")
        fd_results = []
    return fd_results, []


_FD_COMP_CODES = ["PL", "PD", "BL1", "SA", "FL1", "CL", "DED", "PPL", "ELC", "BSA", "WC", "EC"]

def _link_competitions_from_cache(team: models.Team, db: Session) -> list[str]:
    """Create TeamCompetition rows using cached competition team lists — no live API calls.
    Returns names of competitions newly linked."""
    linked_names: list[str] = []

    if team.football_data_id:
        for code in _FD_COMP_CODES:
            cached = _cache.get_cached(db, f"fd:comp_teams:{code}", 24 * 7)
            if not cached:
                continue
            fd_ids = {t.get("football_data_id") for t in cached.get("teams", [])}
            if team.football_data_id not in fd_ids:
                continue
            comp = db.query(models.Competition).filter(
                models.Competition.football_data_id == code
            ).first()
            if comp and not db.query(models.TeamCompetition).filter_by(
                team_id=team.id, competition_id=comp.id
            ).first():
                db.add(models.TeamCompetition(team_id=team.id, competition_id=comp.id))
                linked_names.append(comp.name)

    espn_id = getattr(team, "espn_id", None)
    if espn_id:
        for comp in db.query(models.Competition).filter(
            models.Competition.espn_slug.isnot(None)
        ).all():
            cached = _cache.get_cached(db, f"espn:comp_teams:{comp.espn_slug}", 24 * 7)
            if not cached:
                continue
            espn_ids = {t.get("espn_id") for t in cached.get("teams", [])}
            if espn_id not in espn_ids:
                continue
            if not db.query(models.TeamCompetition).filter_by(
                team_id=team.id, competition_id=comp.id
            ).first():
                db.add(models.TeamCompetition(team_id=team.id, competition_id=comp.id))
                linked_names.append(comp.name)

    if linked_names:
        try:
            db.commit()
        except Exception:
            db.rollback()
            linked_names = []

    return linked_names
