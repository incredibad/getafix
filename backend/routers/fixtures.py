import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from auth import get_current_user
from api import football_data as fd
from api import espn

logger = logging.getLogger(__name__)
router = APIRouter()

AEST = timezone(timedelta(hours=10))


@router.get("/by-competition", response_model=list[schemas.FixtureOut])
async def get_fixtures_by_competition(
    name: str = Query(...),
    _: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    comp = db.query(models.Competition).filter(models.Competition.name == name).first()
    if not comp:
        return []

    raw: list[dict] = []

    if comp.preferred_source == "football_data" and comp.football_data_id:
        raw = await fd.get_competition_matches(comp.football_data_id, db)
    elif comp.espn_slug:
        # Iterate all teams in the competition and merge their schedules
        teams = await espn._get_competition_teams(comp.espn_slug, db)
        seen: set[str] = set()
        for t in teams:
            espn_id = t.get("espn_id")
            if not espn_id:
                continue
            for f in await espn.get_team_schedule(espn_id, db):
                key = _dedup_key(f)
                if key and key not in seen:
                    seen.add(key)
                    raw.append(f)

    # Fallback for competitions with no dedicated all-fixture source (e.g. International Friendlies):
    # return followed-teams fixtures filtered to this competition
    if not raw:
        followed = db.query(models.FollowedTeam).all()
        seen: set[str] = set()
        for ft in followed:
            for f in await _fetch_team_fixtures(ft.team, db):
                raw_cname = f.get("competition", {}).get("name", "")
                canon = _ESPN_COMP_KEYWORDS.get(raw_cname.lower(), raw_cname)
                if canon == comp.name or raw_cname == comp.name:
                    key = _dedup_key(f)
                    if key and key not in seen:
                        seen.add(key)
                        raw.append(f)

    now_utc = datetime.now(timezone.utc)
    cutoff_past = now_utc - timedelta(days=60)
    cutoff_future = now_utc + timedelta(days=120)
    filtered = []
    for f in raw:
        try:
            if cutoff_past <= _parse_date(f["utc_date"]) <= cutoff_future:
                filtered.append(f)
        except Exception:
            pass
    filtered.sort(key=lambda f: f["utc_date"])
    return [_to_schema(f) for f in filtered]


@router.get("", response_model=list[schemas.FixtureOut])
async def get_fixtures(
    days_back: int = Query(365, ge=0, le=730),
    days_ahead: int = Query(90, ge=0, le=365),
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
    all_fixtures: list[dict] = []
    is_national = team.team_type == "national"

    if team.football_data_id:
        fd_fixtures = await fd.get_team_matches(team.football_data_id, db)
        if fd_fixtures:
            all_fixtures.extend(fd_fixtures)
            _auto_link_competitions(team, fd_fixtures, db)

    # ESPN: supplement national teams or serve as fallback when FD has no data
    espn_id = getattr(team, "espn_id", None)
    if espn_id and (is_national or not all_fixtures):
        espn_fixtures = await espn.get_team_schedule(espn_id, db)
        if espn_fixtures:
            _auto_link_competitions(team, espn_fixtures, db)
            all_fixtures = _merge_espn(all_fixtures, espn_fixtures)

    return all_fixtures


def _merge_espn(primary: list[dict], espn_fixtures: list[dict]) -> list[dict]:
    """Append ESPN fixtures not already present in primary sources, matched by date+teams."""
    existing: set[str] = {k for f in primary if (k := _dedup_key(f))}
    merged = list(primary)
    for f in espn_fixtures:
        key = _dedup_key(f)
        if key and key not in existing:
            existing.add(key)
            merged.append(f)
    return merged


_ESPN_COMP_KEYWORDS = {
    "afc asian cup": "AFC Asian Cup",
    "afc world cup qualifying": "AFC World Cup Qualifying",
    "fifa world cup qualifying - afc": "AFC World Cup Qualifying",
    "international friendly": "International Friendlies",
    "a-league": "A-League Men",
}

def _match_espn_competition(comp_name: str, db: Session) -> models.Competition | None:
    name_lower = comp_name.lower()
    # Try exact keyword map first
    for keyword, db_name in _ESPN_COMP_KEYWORDS.items():
        if keyword in name_lower or name_lower in keyword:
            return db.query(models.Competition).filter(
                models.Competition.name == db_name
            ).first()
    # Fall back to partial match
    return db.query(models.Competition).filter(
        models.Competition.name.ilike(f"%{comp_name}%")
    ).first()


def _dedup_key(f: dict) -> str | None:
    date = f.get("utc_date", "")[:10]
    home = f.get("home_team", {}).get("name", "").lower().strip()
    away = f.get("away_team", {}).get("name", "").lower().strip()
    if not date or not home or not away:
        return None
    return f"{date}:{min(home, away)}:{max(home, away)}"


def _auto_link_competitions(team: models.Team, fixtures: list[dict], db: Session):
    """Create TeamCompetition links for any competitions seen in fixture data."""
    seen_comp_ids: set[int] = set()
    for f in fixtures:
        comp_data = f.get("competition", {})
        ext_id = comp_data.get("id")
        comp_name = comp_data.get("name", "")
        source = f.get("source")
        if not ext_id and source != "espn":
            continue
        if not comp_name:
            continue
        comp = None

        if source == "football_data":
            comp = db.query(models.Competition).filter(
                models.Competition.name == comp_name,
                models.Competition.preferred_source == "football_data",
            ).first()
        elif source == "espn":
            # ESPN names don't always match DB names exactly — use keyword matching
            comp = _match_espn_competition(comp_name, db)

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
