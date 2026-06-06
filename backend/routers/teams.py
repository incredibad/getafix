import asyncio
import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
import cache as _cache
from auth import get_current_user, get_optional_user
from api import sofascore
from api import espn

SEARCH_CACHE_TTL_HOURS = 24 * 7

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/followed", response_model=list[schemas.TeamResponse])
def list_followed_teams(
    _: models.User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    followed = db.query(models.FollowedTeam).all()
    return [
        schemas.TeamResponse(
            id=ft.team.id,
            name=ft.team.name,
            short_name=ft.team.short_name,
            country=ft.team.country,
            crest_url=ft.team.crest_url,
            team_type=ft.team.team_type,
            football_data_id=ft.team.football_data_id,
            api_football_id=ft.team.api_football_id,
            espn_id=ft.team.espn_id,
            sofascore_id=ft.team.sofascore_id,
            is_followed=True,
        )
        for ft in followed
    ]


@router.post("/follow", response_model=schemas.TeamResponse)
async def follow_team(
    data: schemas.FollowTeamRequest,
    _: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Find existing team by any known ID
    team = None
    if data.sofascore_id:
        team = db.query(models.Team).filter(models.Team.sofascore_id == data.sofascore_id).first()
    if not team and data.espn_id:
        team = db.query(models.Team).filter(models.Team.espn_id == data.espn_id).first()
    if not team and data.football_data_id:
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
            espn_id=data.espn_id,
            sofascore_id=data.sofascore_id,
        )
        db.add(team)
        db.flush()
    else:
        if data.sofascore_id and not team.sofascore_id:
            team.sofascore_id = data.sofascore_id
        if data.espn_id and not team.espn_id:
            team.espn_id = data.espn_id
        if data.football_data_id and not team.football_data_id:
            team.football_data_id = data.football_data_id
        if data.api_football_id and not team.api_football_id:
            team.api_football_id = data.api_football_id
        if data.crest_url and not team.crest_url:
            team.crest_url = data.crest_url

    # Resolve Sofascore ID if still missing
    if not team.sofascore_id:
        ss_id = await sofascore.resolve_sofascore_id(data.name, db)
        if ss_id:
            team.sofascore_id = ss_id

    # Resolve ESPN ID if still missing
    if not team.espn_id:
        espn_id = await espn.resolve_espn_id(data.name, db)
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
        sofascore_id=team.sofascore_id,
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


@router.get("/sofascore/{sofascore_id}/profile", response_model=dict)
async def get_team_browse_profile(
    sofascore_id: int,
    _: models.User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    profile, players, transfers, injuries, ranking = await asyncio.gather(
        sofascore.get_team_profile(sofascore_id, db),
        sofascore.get_team_players(sofascore_id, db),
        sofascore.get_team_transfers(sofascore_id, db),
        sofascore.get_team_injuries(sofascore_id, db),
        sofascore.get_team_ranking(sofascore_id, db),
        return_exceptions=True,
    )
    profile_data = profile if isinstance(profile, dict) else {}
    if isinstance(ranking, int) and profile_data.get("national"):
        profile_data = {**profile_data, "ranking": ranking}
    return {
        "profile": profile_data,
        "players": players if isinstance(players, list) else [],
        "transfers": transfers if isinstance(transfers, dict) else {"in": [], "out": []},
        "injuries": injuries if isinstance(injuries, list) else [],
    }


@router.get("/search", response_model=list[schemas.TeamSearchResult])
async def search_teams(
    q: str = Query(..., min_length=2),
    _: models.User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    cache_key = f"team_search:{q.lower().strip()}"
    raw = _cache.get_cached(db, cache_key, SEARCH_CACHE_TTL_HOURS)
    if raw is None:
        ss_results, espn_results = await _do_search(q, db)
        combined = ss_results + espn_results
        seen_names: set[str] = set()
        deduped: list[dict] = []
        for r in combined:
            key = r["name"].lower().strip()
            if key not in seen_names:
                seen_names.add(key)
                deduped.append(r)
        _cache.set_cached(db, cache_key, {"results": deduped})
        raw = deduped
    else:
        raw = raw.get("results", [])

    followed = db.query(models.FollowedTeam).all()
    followed_fd_ids   = {ft.team.football_data_id for ft in followed if ft.team.football_data_id}
    followed_apf_ids  = {ft.team.api_football_id  for ft in followed if ft.team.api_football_id}
    followed_espn_ids = {ft.team.espn_id          for ft in followed if ft.team.espn_id}
    followed_ss_ids   = {ft.team.sofascore_id      for ft in followed if ft.team.sofascore_id}

    def enrich(r: dict) -> schemas.TeamSearchResult:
        already = bool(
            (r.get("football_data_id") and r["football_data_id"] in followed_fd_ids)
            or (r.get("api_football_id") and r["api_football_id"] in followed_apf_ids)
            or (r.get("espn_id") and r["espn_id"] in followed_espn_ids)
            or (r.get("sofascore_id") and r["sofascore_id"] in followed_ss_ids)
        )
        internal_id = None
        for field, col in [
            ("sofascore_id", models.Team.sofascore_id),
            ("espn_id", models.Team.espn_id),
            ("football_data_id", models.Team.football_data_id),
            ("api_football_id", models.Team.api_football_id),
        ]:
            if r.get(field):
                t = db.query(models.Team).filter(col == r[field]).first()
                if t:
                    internal_id = t.id
                    break
        return schemas.TeamSearchResult(**r, already_followed=already, internal_id=internal_id)

    return [enrich(r) for r in raw]


async def _do_search(q: str, db: Session):
    try:
        ss_results = await sofascore.search_teams(q, db)
    except Exception as e:
        logger.warning(f"Sofascore search failed: {e}")
        ss_results = []

    # ESPN only if Sofascore returned nothing
    if ss_results:
        return ss_results, []

    try:
        espn_results = await espn.search_teams(q, db)
    except Exception as e:
        logger.warning(f"ESPN search failed: {e}")
        espn_results = []
    return [], espn_results


def _link_competitions_from_cache(team: models.Team, db: Session) -> list[str]:
    """Link team to competitions using cached team lists. No live API calls."""
    linked_names: list[str] = []

    # Sofascore: match by sofascore_id in any cached competition team list
    # (Sofascore doesn't expose competition team lists the same way ESPN does,
    # so this path relies on schedule data already fetched and linked via
    # _auto_link_competitions in the fixtures router)

    # ESPN: match by espn_id against cached competition team lists
    espn_id = getattr(team, "espn_id", None)
    if espn_id:
        for comp in db.query(models.Competition).filter(
            models.Competition.espn_slug.isnot(None)
        ).all():
            cached = _cache.get_cached(db, f"espn:comp_teams:{comp.espn_slug}", 24 * 7)
            if not cached:
                continue
            if espn_id not in {t.get("espn_id") for t in cached.get("teams", [])}:
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
