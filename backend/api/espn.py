"""
Client for ESPN's unofficial soccer API.
No auth or API key required. Used as fallback for international fixtures
(AFC qualifiers, friendlies, Asian Cup) not covered by football-data.org
or API-Football on the free tier.
"""
import logging
import httpx
from sqlalchemy.orm import Session

import cache as _cache

logger = logging.getLogger(__name__)

BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer"

STATUS_MAP = {
    "STATUS_SCHEDULED": "SCHEDULED",
    "STATUS_IN_PROGRESS": "LIVE",
    "STATUS_HALFTIME": "LIVE",
    "STATUS_END_PERIOD": "LIVE",
    "STATUS_FULL_TIME": "FINISHED",
    "STATUS_FINAL": "FINISHED",
    "STATUS_FINAL_AET": "FINISHED",
    "STATUS_FINAL_PEN": "FINISHED",
    "STATUS_POSTPONED": "POSTPONED",
    "STATUS_SUSPENDED": "POSTPONED",
    "STATUS_DELAYED": "POSTPONED",
    "STATUS_CANCELLED": "CANCELLED",
    "STATUS_ABANDONED": "CANCELLED",
}

# Competition slugs to scan when resolving ESPN team IDs for international teams
_INTL_SLUGS = [
    "fifa.worldq.afc",
    "afc.asian.cup",
    "fifa.world.2026",
]


async def _get(path: str, params: dict | None = None) -> dict:
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(f"{BASE}{path}", params=params)
        r.raise_for_status()
        return r.json()


def _norm_status(raw: str) -> str:
    return STATUS_MAP.get(raw, "SCHEDULED")


def _parse_score(s) -> int | None:
    if s is None:
        return None
    if isinstance(s, dict):
        v = s.get("displayValue") or s.get("value")
    else:
        v = s
    try:
        return int(float(v)) if v is not None else None
    except (ValueError, TypeError):
        return None


def _team_logo(team_data: dict) -> str | None:
    logos = team_data.get("logos", [])
    return logos[0].get("href") if logos else None


def _parse_fixture(event: dict) -> dict | None:
    comps = event.get("competitions", [])
    if not comps:
        return None
    comp = comps[0]
    competitors = comp.get("competitors", [])
    home = next((c for c in competitors if c.get("homeAway") == "home"), {})
    away = next((c for c in competitors if c.get("homeAway") == "away"), {})
    if not home or not away:
        return None

    status_type = comp.get("status", {}).get("type", {})
    status = _norm_status(status_type.get("name", ""))

    home_team = home.get("team", {})
    away_team = away.get("team", {})
    venue_data = comp.get("venue") or {}
    date = comp.get("date") or event.get("date", "")

    try:
        external_id = int(event.get("id", 0))
    except (ValueError, TypeError):
        external_id = 0

    return {
        "external_id": external_id,
        "source": "espn",
        "utc_date": date,
        "status": status,
        "minute": None,
        "home_team": {
            "id": home_team.get("id"),
            "name": home_team.get("displayName", ""),
            "short_name": home_team.get("abbreviation"),
            "crest_url": _team_logo(home_team),
        },
        "away_team": {
            "id": away_team.get("id"),
            "name": away_team.get("displayName", ""),
            "short_name": away_team.get("abbreviation"),
            "crest_url": _team_logo(away_team),
        },
        "competition": {
            "id": None,
            "name": event.get("league", {}).get("name", ""),
            "emblem_url": None,
        },
        "score_home": _parse_score(home.get("score")),
        "score_away": _parse_score(away.get("score")),
        "score_ht_home": None,
        "score_ht_away": None,
        "matchday": None,
        "venue": venue_data.get("fullName"),
    }


async def get_team_schedule(espn_id: int, db: Session, ttl_hours: float = 24) -> list[dict]:
    cache_key = f"espn:team_schedule:{espn_id}"
    live_cache_key = f"espn:team_schedule_live:{espn_id}"

    cached = _cache.get_cached(db, cache_key, ttl_hours)
    if cached is not None:
        fixtures = cached.get("fixtures", [])
        if fixtures:
            live_cached = _cache.get_cached(db, live_cache_key, 1 / 60)
            if live_cached:
                return live_cached.get("fixtures", fixtures)
        return fixtures

    try:
        data = await _get(f"/all/teams/{espn_id}/schedule")
        fixtures = [f for event in data.get("events", []) if (f := _parse_fixture(event))]
        _cache.set_cached(db, cache_key, {"fixtures": fixtures})
        if any(f["status"] == "LIVE" for f in fixtures):
            _cache.set_cached(db, live_cache_key, {"fixtures": fixtures})
        return fixtures
    except Exception as e:
        logger.error(f"ESPN team schedule error (espn_id={espn_id}): {e}")
        return []


async def _get_competition_teams(slug: str, db: Session) -> list[dict]:
    cache_key = f"espn:comp_teams:{slug}"
    cached = _cache.get_cached(db, cache_key, 24 * 7)
    if cached is not None:
        return cached.get("teams", [])

    try:
        data = await _get(f"/{slug}/teams")
        teams = []
        for sport in data.get("sports", []):
            for league in sport.get("leagues", []):
                for item in league.get("teams", []):
                    team = item.get("team", {})
                    espn_id = team.get("id")
                    if espn_id:
                        teams.append({
                            "espn_id": int(espn_id),
                            "name": team.get("displayName", ""),
                            "short_name": team.get("abbreviation"),
                        })
        _cache.set_cached(db, cache_key, {"teams": teams})
        return teams
    except Exception as e:
        logger.warning(f"ESPN competition teams error ({slug}): {e}")
        return []


async def find_espn_id_by_name(name: str, db: Session) -> int | None:
    name_lower = name.lower()
    for slug in _INTL_SLUGS:
        teams = await _get_competition_teams(slug, db)
        for team in teams:
            t_name = team.get("name", "").lower()
            t_short = (team.get("short_name") or "").lower()
            if name_lower in t_name or t_name in name_lower or (t_short and name_lower == t_short):
                return team["espn_id"]
    return None
