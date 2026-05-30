"""
Client for football-data.org v4 API.
Covers: PL, PD, BL1, SA, FL1, CL, DED, PPL, ELC, BSA, WC, EC
Rate limit: 10 req/min (fine for personal use)
"""
import logging
from typing import Optional
import httpx
from sqlalchemy.orm import Session

from config import settings
import cache as _cache

logger = logging.getLogger(__name__)

BASE = "https://api.football-data.org/v4"
HEADERS = {"X-Auth-Token": settings.football_data_api_key}

# Map fd status -> normalised status
STATUS_MAP = {
    "SCHEDULED": "SCHEDULED",
    "TIMED": "SCHEDULED",
    "IN_PLAY": "LIVE",
    "PAUSED": "LIVE",
    "EXTRA_TIME": "LIVE",
    "PENALTY_SHOOTOUT": "LIVE",
    "FINISHED": "FINISHED",
    "AWARDED": "FINISHED",
    "POSTPONED": "POSTPONED",
    "SUSPENDED": "POSTPONED",
    "CANCELLED": "CANCELLED",
}


async def _get(path: str, params: dict | None = None, db: Session | None = None) -> dict:
    if db:
        _cache.track_usage(db, "football_data")
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(f"{BASE}{path}", headers=HEADERS, params=params)
        r.raise_for_status()
        return r.json()


def _norm_status(raw: str) -> str:
    return STATUS_MAP.get(raw, raw)


def _parse_fixture(match: dict, comp_name: str = "", comp_emblem: str = "") -> dict:
    score = match.get("score", {})
    ft = score.get("fullTime", {})
    ht = score.get("halfTime", {})
    status = _norm_status(match.get("status", ""))
    minute = None
    if status == "LIVE":
        minute = match.get("minute")

    return {
        "external_id": match["id"],
        "source": "football_data",
        "utc_date": match.get("utcDate", ""),
        "status": status,
        "minute": minute,
        "home_team": {
            "id": match.get("homeTeam", {}).get("id"),
            "name": match.get("homeTeam", {}).get("name", ""),
            "short_name": match.get("homeTeam", {}).get("shortName"),
            "crest_url": match.get("homeTeam", {}).get("crest"),
        },
        "away_team": {
            "id": match.get("awayTeam", {}).get("id"),
            "name": match.get("awayTeam", {}).get("name", ""),
            "short_name": match.get("awayTeam", {}).get("shortName"),
            "crest_url": match.get("awayTeam", {}).get("crest"),
        },
        "competition": {
            "id": match.get("competition", {}).get("id"),
            "name": match.get("competition", {}).get("name", comp_name),
            "emblem_url": match.get("competition", {}).get("emblem", comp_emblem),
        },
        "score_home": ft.get("home"),
        "score_away": ft.get("away"),
        "score_ht_home": ht.get("home"),
        "score_ht_away": ht.get("away"),
        "matchday": match.get("matchday"),
        "venue": match.get("venue"),
    }


async def get_team_matches(
    fd_team_id: int,
    db: Session,
    ttl_hours: float = 24,
) -> list[dict]:
    cache_key = f"fd:team_matches:{fd_team_id}"
    live_cache_key = f"fd:team_matches_live:{fd_team_id}"

    cached = _cache.get_cached(db, cache_key, ttl_hours)
    if cached:
        live_cached = _cache.get_cached(db, live_cache_key, 1 / 60)
        if live_cached:
            return live_cached.get("matches", cached.get("matches", []))
        return cached.get("matches", [])

    try:
        data = await _get(f"/teams/{fd_team_id}/matches", {"status": "SCHEDULED,LIVE,IN_PLAY,PAUSED,FINISHED,EXTRA_TIME,PENALTY_SHOOTOUT", "limit": 30}, db)
        matches = [_parse_fixture(m) for m in data.get("matches", [])]
        _cache.set_cached(db, cache_key, {"matches": matches})

        # If any are live, also populate short-ttl cache
        live = [m for m in matches if m["status"] == "LIVE"]
        if live:
            _cache.set_cached(db, live_cache_key, {"matches": matches})

        return matches
    except Exception as e:
        logger.error(f"football-data.org team matches error (team {fd_team_id}): {e}")
        return []


async def get_competition_standings(
    comp_code: str,
    db: Session,
    ttl_hours: float = 24,
) -> dict | None:
    cache_key = f"fd:standings:{comp_code}"
    cached = _cache.get_cached(db, cache_key, ttl_hours)
    if cached:
        return cached

    try:
        data = await _get(f"/competitions/{comp_code}/standings", db=db)
        standings = _parse_standings(data, "football_data")
        standings["cached_at"] = _cache.cached_at_str(db, cache_key)
        _cache.set_cached(db, cache_key, standings)
        return standings
    except Exception as e:
        logger.error(f"football-data.org standings error ({comp_code}): {e}")
        return None


def _parse_standings(data: dict, source: str) -> dict:
    comp = data.get("competition", {})
    season = data.get("season", {})
    result = {
        "competition": {
            "id": comp.get("id"),
            "name": comp.get("name", ""),
            "emblem_url": comp.get("emblem"),
        },
        "season": season.get("startDate", "")[:4] if season.get("startDate") else None,
        "source": source,
        "tables": [],
    }
    for standing in data.get("standings", []):
        table_rows = []
        for row in standing.get("table", []):
            team = row.get("team", {})
            table_rows.append({
                "position": row.get("position"),
                "team_name": team.get("name", ""),
                "team_crest": team.get("crest"),
                "played": row.get("playedGames", 0),
                "won": row.get("won", 0),
                "draw": row.get("draw", 0),
                "lost": row.get("lost", 0),
                "goals_for": row.get("goalsScored", 0),
                "goals_against": row.get("goalsConceded", 0),
                "goal_difference": row.get("goalDifference", 0),
                "points": row.get("points", 0),
                "form": row.get("form"),
            })
        result["tables"].append({
            "stage": standing.get("stage"),
            "group": standing.get("group"),
            "table": table_rows,
        })
    return result


async def get_match_detail(match_id: int, db: Session) -> dict | None:
    cache_key = f"fd:match:{match_id}"

    cached = _cache.get_cached(db, cache_key, None)
    if cached:
        if cached.get("is_permanent"):
            return cached
        # Live: re-fetch after 60s
        live_age = (
            __import__("datetime").datetime.utcnow()
            - __import__("datetime").datetime.fromisoformat(
                cached.get("cached_at", "2000-01-01T00:00:00").rstrip("Z")
            )
        ).total_seconds()
        if cached.get("status") not in ("LIVE",) or live_age < 60:
            return cached

    try:
        data = await _get(f"/matches/{match_id}", db=db)
        match = data.get("match", data)
        fixture = _parse_fixture(match)
        is_finished = fixture["status"] == "FINISHED"

        events = _parse_events_fd(match)
        stats = _parse_stats_fd(match)
        lineups = _parse_lineups_fd(match)

        detail = {
            "fixture": fixture,
            "events": events,
            "stats": stats,
            "lineups": lineups,
            "source": "football_data",
            "cached_at": __import__("datetime").datetime.utcnow().isoformat() + "Z",
            "is_permanent": is_finished,
            "status": fixture["status"],
        }
        _cache.set_cached(db, cache_key, detail, is_permanent=is_finished)
        return detail
    except Exception as e:
        logger.error(f"football-data.org match detail error ({match_id}): {e}")
        return None


def _parse_events_fd(match: dict) -> list:
    events = []
    for g in match.get("goals", []):
        events.append({
            "minute": g.get("minute"),
            "extra_time": g.get("extraTime"),
            "type": "goal",
            "team": g.get("team", {}).get("name", ""),
            "player": g.get("scorer", {}).get("name"),
            "assist": g.get("assist", {}).get("name") if g.get("assist") else None,
            "detail": g.get("type"),
        })
    for b in match.get("bookings", []):
        events.append({
            "minute": b.get("minute"),
            "extra_time": None,
            "type": "yellow_card" if b.get("card") == "YELLOW_CARD" else "red_card",
            "team": b.get("team", {}).get("name", ""),
            "player": b.get("player", {}).get("name"),
            "assist": None,
            "detail": b.get("card"),
        })
    for s in match.get("substitutions", []):
        events.append({
            "minute": s.get("minute"),
            "extra_time": None,
            "type": "substitution",
            "team": s.get("team", {}).get("name", ""),
            "player": s.get("playerIn", {}).get("name"),
            "assist": s.get("playerOut", {}).get("name"),
            "detail": None,
        })
    events.sort(key=lambda e: (e.get("minute") or 0))
    return events


def _parse_stats_fd(match: dict) -> list:
    # football-data.org v4 free tier doesn't return stats in match detail
    return []


def _parse_lineups_fd(match: dict) -> list:
    lineups = []
    for side in ("homeTeam", "awayTeam"):
        team_data = match.get(side, {})
        formation = team_data.get("formation")
        xi = [
            {"name": p.get("name", ""), "number": p.get("shirtNumber"), "position": p.get("position"), "grid": None}
            for p in team_data.get("lineup", [])
        ]
        subs = [
            {"name": p.get("name", ""), "number": p.get("shirtNumber"), "position": p.get("position"), "grid": None}
            for p in team_data.get("bench", [])
        ]
        if xi or subs:
            lineups.append({
                "team": team_data.get("name", ""),
                "formation": formation,
                "starting_xi": xi,
                "substitutes": subs,
            })
    return lineups


async def search_teams(query: str, db: Session) -> list[dict]:
    try:
        data = await _get("/teams", {"name": query, "limit": 10}, db)
        q = query.lower()
        results = []
        for team in data.get("teams", []):
            name = team.get("name", "")
            short = team.get("shortName") or ""
            if q not in name.lower() and q not in short.lower():
                continue
            results.append({
                "name": name,
                "short_name": team.get("shortName"),
                "country": team.get("area", {}).get("name"),
                "crest_url": team.get("crest"),
                "team_type": "national" if team.get("type") == "NATIONAL" else "club",
                "football_data_id": team.get("id"),
                "api_football_id": None,
                "source": "football_data",
            })
        return results
    except Exception as e:
        logger.error(f"football-data.org team search error: {e}")
        return []


async def get_competition_teams(comp_code: str, db: Session) -> list[dict]:
    cache_key = f"fd:comp_teams:{comp_code}"
    cached = _cache.get_cached(db, cache_key, 24 * 7)
    if cached:
        return cached.get("teams", [])

    try:
        data = await _get(f"/competitions/{comp_code}/teams", db=db)
        teams = []
        for team in data.get("teams", []):
            teams.append({
                "name": team.get("name", ""),
                "short_name": team.get("shortName"),
                "country": team.get("area", {}).get("name"),
                "crest_url": team.get("crest"),
                "team_type": "national" if team.get("type") == "NATIONAL" else "club",
                "football_data_id": team.get("id"),
                "api_football_id": None,
                "source": "football_data",
            })
        _cache.set_cached(db, cache_key, {"teams": teams})
        return teams
    except Exception as e:
        logger.error(f"football-data.org competition teams error ({comp_code}): {e}")
        return []
