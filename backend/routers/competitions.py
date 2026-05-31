import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from auth import get_optional_user
from api import football_data as fd

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("", response_model=list[schemas.CompetitionResponse])
def list_competitions(
    _: models.User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    return db.query(models.Competition).order_by(models.Competition.name).all()


@router.get("/{competition_id}/teams", response_model=list[schemas.TeamSearchResult])
async def list_competition_teams(
    competition_id: int,
    _: models.User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    comp = db.query(models.Competition).filter(models.Competition.id == competition_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Competition not found.")

    followed_fd_ids = {t.team.football_data_id for t in db.query(models.FollowedTeam).all() if t.team.football_data_id}
    followed_apf_ids = {t.team.api_football_id for t in db.query(models.FollowedTeam).all() if t.team.api_football_id}

    teams_raw = []
    if comp.preferred_source == "football_data" and comp.football_data_id:
        teams_raw = await fd.get_competition_teams(comp.football_data_id, db)

    results = []
    for t in teams_raw:
        already = (
            (t.get("football_data_id") and t["football_data_id"] in followed_fd_ids)
            or (t.get("api_football_id") and t["api_football_id"] in followed_apf_ids)
        )
        results.append(schemas.TeamSearchResult(**t, already_followed=already))
    return results


@router.get("/followed", response_model=list[schemas.CompetitionResponse])
def list_followed_competitions(
    _: models.User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Competitions that have at least one followed team registered."""
    followed = db.query(models.FollowedTeam).all()
    comp_ids: set[int] = set()
    for ft in followed:
        for tc in ft.team.competitions:
            comp_ids.add(tc.competition_id)
    if not comp_ids:
        return []
    return db.query(models.Competition).filter(models.Competition.id.in_(comp_ids)).all()


@router.post("/{competition_id}/link-team/{team_id}")
def link_team_to_competition(
    competition_id: int,
    team_id: int,
    _: models.User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Manually link a team to a competition for standings tracking."""
    comp = db.query(models.Competition).filter(models.Competition.id == competition_id).first()
    team = db.query(models.Team).filter(models.Team.id == team_id).first()
    if not comp or not team:
        raise HTTPException(status_code=404, detail="Competition or team not found.")

    existing = db.query(models.TeamCompetition).filter_by(team_id=team_id, competition_id=competition_id).first()
    if not existing:
        db.add(models.TeamCompetition(team_id=team_id, competition_id=competition_id))
        db.commit()
    return {"message": "Linked."}
