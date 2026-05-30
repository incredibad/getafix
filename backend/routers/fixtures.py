import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from auth import get_current_user
from api import football_data as fd
from api import api_football as apf

logger = logging.getLogger(__name__)
router = APIRouter()

AEST = timezone(timedelta(hours=10))


@router.get("", response_model=list[schemas.FixtureOut])
async def get_fixtures(
    days_back: int = Query(7, ge=0, le=90),
    days_ahead: int = Query(30, ge=0, le=365),
    _: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    followed = db.query(models.FollowedTeam).all()
    if not followed:
        return []

    now_utc = datetime.now(timezone.utc)
    cutoff_past = now_utc - timedelta(days=days_back)
    cutoff_future = now_utc + timedelta(days=days_ahead)

    all_fixtures: list[dict] = []

    for ft in followed:
        team = ft.team
        fixtures = await _fetch_team_fixtures(team, db)
        all_fixtures.extend(fixtures)

    # Deduplicate by (source, external_id)
    seen: set[str] = set()
    deduped = []
    for f in all_fixtures:
        key = f"{f['source']}:{f['external_id']}"
        if key not in seen:
            seen.add(key)
            deduped.append(f)

    # Filter to date window
    filtered = []
    for f in deduped:
        try:
            utc_date = _parse_date(f["utc_date"])
            if cutoff_past <= utc_date <= cutoff_future:
                filtered.append(f)
        except Exception:
            pass

    # Sort chronologically
    filtered.sort(key=lambda f: f["utc_date"])

    return [_to_schema(f) for f in filtered]


async def _fetch_team_fixtures(team: models.Team, db: Session) -> list[dict]:
    fixtures = []

    if team.football_data_id:
        fixtures = await fd.get_team_matches(team.football_data_id, db)
        if fixtures:
            _auto_link_competitions(team, fixtures, db)
            return fixtures

    if team.api_football_id:
        fixtures = await apf.get_team_fixtures(team.api_football_id, db)
        if fixtures:
            _auto_link_competitions(team, fixtures, db)

    return fixtures


def _auto_link_competitions(team: models.Team, fixtures: list[dict], db: Session):
    """Create TeamCompetition links for any competitions seen in fixture data."""
    seen_comp_ids: set[int] = set()
    for f in fixtures:
        comp_data = f.get("competition", {})
        ext_id = comp_data.get("id")
        comp_name = comp_data.get("name", "")
        if not ext_id:
            continue
        source = f.get("source")
        comp = None

        if source == "football_data":
            # FD competition IDs in match data are numeric; find by api_football_id cross-match
            # or by name since we seed all FD competitions
            comp = db.query(models.Competition).filter(
                models.Competition.name == comp_name,
                models.Competition.preferred_source == "football_data",
            ).first()
        elif source == "api_football":
            comp = db.query(models.Competition).filter(
                models.Competition.api_football_id == ext_id
            ).first()

        if comp and comp.id not in seen_comp_ids:
            seen_comp_ids.add(comp.id)
            existing = db.query(models.TeamCompetition).filter_by(
                team_id=team.id, competition_id=comp.id
            ).first()
            if not existing:
                db.add(models.TeamCompetition(team_id=team.id, competition_id=comp.id))

    if seen_comp_ids:
        try:
            db.commit()
        except Exception:
            db.rollback()


def _parse_date(date_str: str) -> datetime:
    date_str = date_str.rstrip("Z")
    if "+" in date_str[10:]:
        date_str = date_str[:date_str.rfind("+")]
    dt = datetime.fromisoformat(date_str)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def _to_schema(f: dict) -> schemas.FixtureOut:
    return schemas.FixtureOut(
        id=f"{f['source']}:{f['external_id']}",
        external_id=f["external_id"],
        source=f["source"],
        utc_date=f["utc_date"],
        status=f["status"],
        minute=f.get("minute"),
        home_team=schemas.TeamRef(**f["home_team"]),
        away_team=schemas.TeamRef(**f["away_team"]),
        competition=schemas.CompetitionRef(**f["competition"]),
        score_home=f.get("score_home"),
        score_away=f.get("score_away"),
        score_ht_home=f.get("score_ht_home"),
        score_ht_away=f.get("score_ht_away"),
        matchday=f.get("matchday"),
        venue=f.get("venue"),
    )
