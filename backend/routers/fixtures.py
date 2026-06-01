import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from auth import get_optional_user
from api import sofascore
from api import espn

logger = logging.getLogger(__name__)
router = APIRouter()

AEST = timezone(timedelta(hours=10))


@router.get("/by-competition", response_model=list[schemas.FixtureOut])
async def get_fixtures_by_competition(
    name: str = Query(...),
    sofascore_id: int | None = Query(None),
    _: models.User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    # Look up the DB competition — try sofascore_id first (exact), then name
    comp = None
    if sofascore_id:
        comp = db.query(models.Competition).filter(
            models.Competition.sofascore_tournament_id == sofascore_id
        ).first()
    if not comp:
        comp = db.query(models.Competition).filter(models.Competition.name == name).first()

    # Determine sofascore tournament ID: from URL param, then from DB row
    ss_id = sofascore_id or (getattr(comp, "sofascore_tournament_id", None) if comp else None)

    raw: list[dict] = []

    # Sofascore primary — works even if competition isn't in DB
    if ss_id:
        raw = await sofascore.get_competition_fixtures(ss_id, db)

    # ESPN fallback (needs a DB row with espn_slug)
    if not raw and comp:
        espn_slug = getattr(comp, "espn_slug", None)
        if espn_slug:
            teams = await espn._get_competition_teams(espn_slug, db)
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

    # Final fallback: filter followed-team fixtures by competition name / sofascore_id
    if not raw:
        followed = db.query(models.FollowedTeam).all()
        seen: set[str] = set()
        for ft in followed:
            for f in await _fetch_team_fixtures(ft.team, db):
                f_comp = f.get("competition", {})
                match = (
                    (ss_id and f_comp.get("id") == ss_id)
                    or (comp and (f_comp.get("name") == comp.name or _comp_name_matches(f_comp.get("name", ""), comp.name)))
                )
                if match:
                    key = _dedup_key(f)
                    if key and key not in seen:
                        seen.add(key)
                        raw.append(f)

    now_utc = datetime.now(timezone.utc)
    cutoff_past = now_utc - timedelta(days=60)
    cutoff_future = now_utc + timedelta(days=120)
    filtered = [f for f in raw if _in_window(f, cutoff_past, cutoff_future)]
    filtered.sort(key=lambda f: f["utc_date"])
    return [_to_schema(f) for f in filtered]


@router.get("", response_model=list[schemas.FixtureOut])
async def get_fixtures(
    days_back: int = Query(365, ge=0, le=730),
    days_ahead: int = Query(90, ge=0, le=365),
    _: models.User | None = Depends(get_optional_user),
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
        all_fixtures.extend(await _fetch_team_fixtures(ft.team, db))

    seen: set[str] = set()
    deduped = []
    for f in all_fixtures:
        key = f"{f['source']}:{f['external_id']}"
        if key not in seen:
            seen.add(key)
            deduped.append(f)

    filtered = [f for f in deduped if _in_window(f, cutoff_past, cutoff_future)]
    filtered.sort(key=lambda f: f["utc_date"])
    return [_to_schema(f) for f in filtered]


async def _fetch_team_fixtures(team: models.Team, db: Session) -> list[dict]:
    is_national = team.team_type == "national"

    ss_id = getattr(team, "sofascore_id", None)

    # Dynamically resolve Sofascore ID if missing
    if not ss_id:
        ss_id = await sofascore.resolve_sofascore_id(team.name, db)
        if ss_id:
            team.sofascore_id = ss_id
            try:
                db.commit()
            except Exception:
                db.rollback()

    if ss_id:
        fixtures = await sofascore.get_team_schedule(ss_id, db)
        if fixtures:
            _auto_link_competitions(team, fixtures, db)
            return fixtures

    # ESPN fallback
    espn_id = getattr(team, "espn_id", None)
    if not espn_id:
        espn_id = await espn.resolve_espn_id(team.name, db)
        if espn_id:
            team.espn_id = espn_id
            try:
                db.commit()
            except Exception:
                db.rollback()

    if espn_id:
        fixtures = await espn.get_team_schedule(espn_id, db)
        if fixtures:
            _auto_link_competitions(team, fixtures, db)
            return fixtures

    return []


def _auto_link_competitions(team: models.Team, fixtures: list[dict], db: Session):
    seen_comp_ids: set[int] = set()
    for f in fixtures:
        comp_data = f.get("competition", {})
        source = f.get("source")
        comp = None

        if source == "sofascore":
            ss_tid = comp_data.get("id")
            if ss_tid:
                comp = db.query(models.Competition).filter(
                    models.Competition.sofascore_tournament_id == ss_tid
                ).first()
        elif source == "espn":
            comp_name = comp_data.get("name", "")
            if comp_name:
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


_ESPN_COMP_KEYWORDS = {
    # FD competition ESPN name aliases
    "english premier league": "Premier League",
    "spanish laliga": "La Liga",
    "german bundesliga": "Bundesliga",
    "italian serie a": "Serie A",
    "french ligue 1": "Ligue 1",
    "uefa champions league": "Champions League",
    "dutch eredivisie": "Eredivisie",
    "portuguese primeira liga": "Primeira Liga",
    "english league championship": "Championship",
    "brazilian serie a": "Brazilian Série A",
    "uefa european championship": "European Championship",
    # AFC / Asian
    "afc asian cup": "AFC Asian Cup",
    "afc world cup qualifying": "AFC World Cup Qualifying",
    "fifa world cup qualifying - afc": "AFC World Cup Qualifying",
    # Australia
    "australian a-league men": "A-League Men",
    "a-league": "A-League Men",
    "australian a-league women": "A-League Women",
    # Friendlies
    "international friendly": "International Friendlies",
    # UEFA club
    "uefa europa league": "Europa League",
    "uefa conference league": "Conference League",
    "afc champions league elite": "AFC Champions League",
    # South America club
    "conmebol libertadores": "Copa Libertadores",
    "conmebol sudamericana": "Copa Sudamericana",
    # CONCACAF club
    "concacaf champions cup": "CONCACAF Champions Cup",
    "concacaf league": "CONCACAF League",
    # Americas domestic
    "mexican liga bbva mx": "Liga MX",
    "argentine liga profesional de fútbol": "Argentine Liga Profesional",
    "argentine liga profesional de futbol": "Argentine Liga Profesional",
    # Asia domestic
    "japanese j.league": "J1 League",
    # Europe domestic
    "turkish super lig": "Turkish Süper Lig",
    # International tournaments
    "copa américa": "Copa América",
    "copa america": "Copa América",
    "africa cup of nations": "Africa Cup of Nations",
    "uefa nations league": "UEFA Nations League",
    # World Cup qualifying
    "fifa world cup qualifying - conmebol": "CONMEBOL World Cup Qualifying",
    "fifa world cup qualifying - uefa": "UEFA World Cup Qualifying",
    "fifa world cup qualifying - concacaf": "CONCACAF World Cup Qualifying",
    "fifa world cup qualifying - caf": "CAF World Cup Qualifying",
}


def _match_espn_competition(comp_name: str, db: Session) -> models.Competition | None:
    name_lower = comp_name.lower()
    for keyword, db_name in _ESPN_COMP_KEYWORDS.items():
        if keyword in name_lower or name_lower in keyword:
            return db.query(models.Competition).filter(
                models.Competition.name == db_name
            ).first()
    return db.query(models.Competition).filter(
        models.Competition.name.ilike(f"%{comp_name}%")
    ).first()


def _comp_name_matches(espn_name: str, db_name: str) -> bool:
    mapped = _ESPN_COMP_KEYWORDS.get(espn_name.lower())
    return mapped == db_name


def _dedup_key(f: dict) -> str | None:
    date = f.get("utc_date", "")[:10]
    home = f.get("home_team", {}).get("name", "").lower().strip()
    away = f.get("away_team", {}).get("name", "").lower().strip()
    if not date or not home or not away:
        return None
    return f"{date}:{min(home, away)}:{max(home, away)}"


def _in_window(f: dict, cutoff_past: datetime, cutoff_future: datetime) -> bool:
    try:
        return cutoff_past <= _parse_date(f["utc_date"]) <= cutoff_future
    except Exception:
        return False


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
        league_slug=f.get("league_slug"),
    )
