"""
Client for API-Football (api-sports.io) v3.
Rate limit: 100 requests/day — track carefully.
Use for competitions not covered by football-data.org.
"""
import logging
import datetime
from typing import Optional
import httpx
from sqlalchemy.orm import Session

from config import settings
import cache as _cache

logger = logging.getLogger(__name__)

BASE = "https://v3.football.api-sports.io"
HEADERS = {"x-apisports-key": settings.api_football_key}

CURRENT_YEAR = datetime.date.today().year

STATUS_MAP = {
    "TBD": "SCHEDULED",
    "NS": "SCHEDULED",
    "1H": "LIVE",
    "HT": "LIVE",
    "2H": "LIVE",
    "ET": "LIVE",
    "BT": "LIVE",
    "P": "LIVE",
    "SUSP": "POSTPONED",
    "INT": "LIVE",
    "FT": "FINISHED",
    "AET": "FINISHED",
    "PEN": "FINISHED",
    "PST": "POSTPONED",
    "CANC": "CANCELLED",
    "ABD": "CANCELLED",
    "AWD": "FINISHED",
    "WO": "FINISHED",
    "LIVE": "LIVE",
}


async def _get(path: str, params: dict | None = None, db: Session | None = None) -> dict:
    if db:
        _cache.track_usage(db, "api_football")
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(f"{BASE}{path}", headers=HEADERS, params=params)
        r.raise_for_status()
        return r.json()


def _norm_status(raw: str) -> str:
    return STATUS_MAP.get(raw, raw)


def _parse_fixture(f: dict) -> dict:
    fix = f.get("fixture", {})
    league = f.get("league", {})
    teams = f.get("teams", {})
    goals = f.get("goals", {})
    score = f.get("score", {})
    status_info = fix.get("status", {})
    status = _norm_status(status_info.get("short", ""))
    minute = status_info.get("elapsed") if status == "LIVE" else None

    halftime = score.get("halftime", {})

    return {
        "external_id": fix.get("id"),
        "source": "api_football",
        "utc_date": fix.get("date", ""),
        "status": status,
        "minute": minute,
        "home_team": {
            "id": teams.get("home", {}).get("id"),
            "name": teams.get("home", {}).get("name", ""),
            "short_name": None,
            "crest_url": teams.get("home", {}).get("logo"),
        },
        "away_team": {
            "id": teams.get("away", {}).get("id"),
            "name": teams.get("away", {}).get("name", ""),
            "short_name": None,
            "crest_url": teams.get("away", {}).get("logo"),
        },
        "competition": {
            "id": league.get("id"),
            "name": league.get("name", ""),
            "emblem_url": league.get("logo"),
        },
        "score_home": goals.get("home"),
        "score_away": goals.get("away"),
        "score_ht_home": halftime.get("home") if halftime else None,
        "score_ht_away": halftime.get("away") if halftime else None,
        "matchday": league.get("round"),
        "venue": fix.get("venue", {}).get("name"),
    }


async def get_team_fixtures(
    apf_team_id: int,
    db: Session,
    season: int = CURRENT_YEAR,
    ttl_hours: float = 24,
) -> list[dict]:
    cache_key = f"apf:team_fixtures:{apf_team_id}:{season}"
    live_cache_key = f"apf:team_fixtures_live:{apf_team_id}:{season}"

    cached = _cache.get_cached(db, cache_key, ttl_hours)
    if cached:
        live_cached = _cache.get_cached(db, live_cache_key, 1 / 60)
        if live_cached:
            return live_cached.get("fixtures", cached.get("fixtures", []))
        return cached.get("fixtures", [])

    try:
        data = await _get("/fixtures", {"team": apf_team_id, "season": season}, db)
        fixtures = [_parse_fixture(f) for f in data.get("response", [])]
        _cache.set_cached(db, cache_key, {"fixtures": fixtures})

        live = [f for f in fixtures if f["status"] == "LIVE"]
        if live:
            _cache.set_cached(db, live_cache_key, {"fixtures": fixtures})

        return fixtures
    except Exception as e:
        logger.error(f"API-Football team fixtures error (team {apf_team_id}): {e}")
        return []


async def get_competition_standings(
    league_id: int,
    db: Session,
    season: int = CURRENT_YEAR,
    ttl_hours: float = 24,
) -> dict | None:
    cache_key = f"apf:standings:{league_id}:{season}"
    cached = _cache.get_cached(db, cache_key, ttl_hours)
    if cached:
        return cached

    try:
        data = await _get("/standings", {"league": league_id, "season": season}, db)
        response = data.get("response", [])
        if not response:
            return None
        result = _parse_standings(response[0])
        result["cached_at"] = _cache.cached_at_str(db, cache_key)
        _cache.set_cached(db, cache_key, result)
        return result
    except Exception as e:
        logger.error(f"API-Football standings error (league {league_id}): {e}")
        return None


def _parse_standings(league_resp: dict) -> dict:
    league = league_resp.get("league", {})
    result = {
        "competition": {
            "id": league.get("id"),
            "name": league.get("name", ""),
            "emblem_url": league.get("logo"),
        },
        "season": league.get("season"),
        "source": "api_football",
        "tables": [],
    }
    for standing_group in league.get("standings", []):
        rows = []
        for row in standing_group:
            team = row.get("team", {})
            all_stats = row.get("all", {})
            goals = all_stats.get("goals", {})
            rows.append({
                "position": row.get("rank"),
                "team_name": team.get("name", ""),
                "team_crest": team.get("logo"),
                "played": all_stats.get("played", 0),
                "won": all_stats.get("win", 0),
                "draw": all_stats.get("draw", 0),
                "lost": all_stats.get("lose", 0),
                "goals_for": goals.get("for", 0),
                "goals_against": goals.get("against", 0),
                "goal_difference": row.get("goalsDiff", 0),
                "points": row.get("points", 0),
                "form": row.get("form"),
            })
        result["tables"].append({
            "stage": None,
            "group": row.get("group") if standing_group else None,
            "table": rows,
        })
    return result


async def get_match_detail(fixture_id: int, db: Session) -> dict | None:
    cache_key = f"apf:match:{fixture_id}"

    cached = _cache.get_cached(db, cache_key, None)
    if cached:
        if cached.get("is_permanent"):
            return cached
        age = (
            datetime.datetime.utcnow()
            - datetime.datetime.fromisoformat(
                cached.get("cached_at", "2000-01-01T00:00:00").rstrip("Z")
            )
        ).total_seconds()
        if cached.get("status") not in ("LIVE",) or age < 60:
            return cached

    try:
        data = await _get(f"/fixtures", {"id": fixture_id}, db)
        response = data.get("response", [])
        if not response:
            return None

        f = response[0]
        fixture = _parse_fixture(f)
        is_finished = fixture["status"] == "FINISHED"

        events = await _get_events(fixture_id, db)
        stats = await _get_stats(fixture_id, db)
        lineups = await _get_lineups(fixture_id, db)

        detail = {
            "fixture": fixture,
            "events": events,
            "stats": stats,
            "lineups": lineups,
            "source": "api_football",
            "cached_at": datetime.datetime.utcnow().isoformat() + "Z",
            "is_permanent": is_finished,
            "status": fixture["status"],
        }
        _cache.set_cached(db, cache_key, detail, is_permanent=is_finished)
        return detail
    except Exception as e:
        logger.error(f"API-Football match detail error ({fixture_id}): {e}")
        return None


async def _get_events(fixture_id: int, db: Session) -> list:
    try:
        data = await _get("/fixtures/events", {"fixture": fixture_id}, db)
        events = []
        for ev in data.get("response", []):
            ev_type = ev.get("type", "").lower()
            detail_str = ev.get("detail", "")
            if "goal" in ev_type:
                t = "goal"
            elif "card" in ev_type:
                t = "yellow_card" if "yellow" in detail_str.lower() else "red_card"
            elif "subst" in ev_type:
                t = "substitution"
            elif "var" in ev_type:
                t = "var"
            else:
                t = ev_type
            events.append({
                "minute": ev.get("time", {}).get("elapsed"),
                "extra_time": ev.get("time", {}).get("extra"),
                "type": t,
                "team": ev.get("team", {}).get("name", ""),
                "player": ev.get("player", {}).get("name"),
                "assist": ev.get("assist", {}).get("name"),
                "detail": detail_str,
            })
        return events
    except Exception:
        return []


async def _get_stats(fixture_id: int, db: Session) -> list:
    try:
        data = await _get("/fixtures/statistics", {"fixture": fixture_id}, db)
        stats = []
        for team_stats in data.get("response", []):
            team_name = team_stats.get("team", {}).get("name", "")
            stat_map = {s["type"]: s["value"] for s in team_stats.get("statistics", [])}
            stats.append({
                "team": team_name,
                "possession": stat_map.get("Ball Possession"),
                "shots": _int(stat_map.get("Total Shots")),
                "shots_on_target": _int(stat_map.get("Shots on Goal")),
                "corners": _int(stat_map.get("Corner Kicks")),
                "fouls": _int(stat_map.get("Total Fouls")),
                "yellow_cards": _int(stat_map.get("Yellow Cards")),
                "red_cards": _int(stat_map.get("Red Cards")),
                "offsides": _int(stat_map.get("Offsides")),
                "saves": _int(stat_map.get("Goalkeeper Saves")),
            })
        return stats
    except Exception:
        return []


async def _get_lineups(fixture_id: int, db: Session) -> list:
    try:
        data = await _get("/fixtures/lineups", {"fixture": fixture_id}, db)
        lineups = []
        for team_lineup in data.get("response", []):
            team_name = team_lineup.get("team", {}).get("name", "")
            formation = team_lineup.get("formation")
            xi = [
                {
                    "name": p.get("player", {}).get("name", ""),
                    "number": p.get("player", {}).get("number"),
                    "position": p.get("player", {}).get("pos"),
                    "grid": p.get("player", {}).get("grid"),
                }
                for p in team_lineup.get("startXI", [])
            ]
            subs = [
                {
                    "name": p.get("player", {}).get("name", ""),
                    "number": p.get("player", {}).get("number"),
                    "position": p.get("player", {}).get("pos"),
                    "grid": None,
                }
                for p in team_lineup.get("substitutes", [])
            ]
            lineups.append({
                "team": team_name,
                "formation": formation,
                "starting_xi": xi,
                "substitutes": subs,
            })
        return lineups
    except Exception:
        return []


def _int(val) -> int | None:
    try:
        return int(val) if val is not None else None
    except (ValueError, TypeError):
        return None


async def search_teams(query: str, db: Session) -> list[dict]:
    try:
        data = await _get("/teams", {"search": query}, db)
        results = []
        for item in data.get("response", [])[:15]:
            team = item.get("team", {})
            results.append({
                "name": team.get("name", ""),
                "short_name": team.get("code"),
                "country": team.get("country"),
                "crest_url": team.get("logo"),
                "team_type": "national" if team.get("national") else "club",
                "football_data_id": None,
                "api_football_id": team.get("id"),
                "source": "api_football",
            })
        return results
    except Exception as e:
        logger.error(f"API-Football team search error: {e}")
        return []
