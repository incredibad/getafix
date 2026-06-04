"""
Client for Sofascore's unofficial API.
No auth or API key required. Used as primary source for all fixture, standings,
and match detail data. ESPN is the fallback when Sofascore returns nothing.
"""
import asyncio
import logging
import urllib.parse
from datetime import datetime, timezone

from curl_cffi.requests import AsyncSession
from sqlalchemy.orm import Session

import cache as _cache
import models as _models

logger = logging.getLogger(__name__)

BASE = "https://api.sofascore.com/api/v1"
_HEADERS = {"Referer": "https://www.sofascore.com/"}

_NORM_STATUS = {
    "notstarted":  "SCHEDULED",
    "inprogress":  "LIVE",
    "finished":    "FINISHED",
    "postponed":   "POSTPONED",
    "canceled":    "CANCELLED",
    "cancelled":   "CANCELLED",
}


class _HTTPError(Exception):
    def __init__(self, status_code: int):
        super().__init__(f"HTTP {status_code}")
        self.status_code = status_code


async def _get(path: str, params: dict | None = None) -> dict:
    url = f"{BASE}{path}"
    if params:
        url = f"{url}?{urllib.parse.urlencode(params)}"
    async with AsyncSession(impersonate="chrome120", timeout=15) as session:
        r = await session.get(url, headers=_HEADERS)
        if r.status_code >= 400:
            raise _HTTPError(r.status_code)
        return r.json()


def _team_crest(team_id) -> str | None:
    if not team_id:
        return None
    return f"{BASE}/team/{team_id}/image"


def _tournament_emblem(tournament_id) -> str | None:
    if not tournament_id:
        return None
    return f"{BASE}/unique-tournament/{tournament_id}/image/dark"


def _names_match(a: str, b: str) -> bool:
    if a in b or b in a:
        return True
    a_words = {w for w in a.split() if len(w) > 3}
    b_words = {w for w in b.split() if len(w) > 3}
    return bool(a_words & b_words)


def _norm_status(status_type: str) -> str:
    return _NORM_STATUS.get(status_type.lower(), "SCHEDULED")


def _parse_fixture(event: dict) -> dict | None:
    home = event.get("homeTeam") or {}
    away = event.get("awayTeam") or {}
    if not home or not away:
        return None

    status = event.get("status") or {}
    status_type = status.get("type", "notstarted")

    # Always use uniqueTournament for stable competition identity
    tournament = event.get("tournament") or {}
    unique_t = tournament.get("uniqueTournament") or {}

    start_ts = event.get("startTimestamp")
    utc_date = (
        datetime.fromtimestamp(start_ts, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        if start_ts else ""
    )

    home_score = event.get("homeScore") or {}
    away_score = event.get("awayScore") or {}

    minute = None
    if status_type == "inprogress":
        time_data = event.get("time") or {}
        minute = time_data.get("current") or time_data.get("played")

    tournament_id = unique_t.get("id")

    return {
        "external_id": event.get("id"),
        "source": "sofascore",
        "utc_date": utc_date,
        "status": _norm_status(status_type),
        "minute": minute,
        "home_team": {
            "id": home.get("id"),
            "name": home.get("name", ""),
            "short_name": home.get("nameCode"),
            "crest_url": _team_crest(home.get("id")),
            "country": (home.get("country") or {}).get("name"),
            "national": bool(home.get("national", False)),
        },
        "away_team": {
            "id": away.get("id"),
            "name": away.get("name", ""),
            "short_name": away.get("nameCode"),
            "crest_url": _team_crest(away.get("id")),
            "country": (away.get("country") or {}).get("name"),
            "national": bool(away.get("national", False)),
        },
        "competition": {
            "id": tournament_id,
            "name": unique_t.get("name", tournament.get("name", "")),
            "emblem_url": _tournament_emblem(tournament_id),
        },
        "score_home": home_score.get("current"),
        "score_away": away_score.get("current"),
        "score_ht_home": home_score.get("period1"),
        "score_ht_away": away_score.get("period1"),
        "matchday": (event.get("roundInfo") or {}).get("round"),
        "round_name": (lambda ri: ri.get("name") or (f"Round {ri['round']}" if ri.get("round") else None))(event.get("roundInfo") or {}),
        "venue": None,
        "league_slug": str(tournament_id) if tournament_id else None,
    }


# ── Team primary league ───────────────────────────────────────────────────────

async def get_team_primary_league(team_id: int, db: Session) -> str | None:
    cache_key = f"sofascore:team_primary_league:{team_id}"
    cached = _cache.get_cached(db, cache_key, 24 * 30)
    if cached is not None:
        return cached.get("league_name")
    try:
        data = await _get(f"/team/{team_id}")
        team = data.get("team") or {}
        primary = team.get("primaryUniqueTournament") or {}
        league_name = primary.get("name") or None
        _cache.set_cached(db, cache_key, {"league_name": league_name})
        return league_name
    except Exception:
        return None


# ── All competitions index ────────────────────────────────────────────────────

async def get_all_competitions(db: Session) -> list[dict]:
    """Return a flat list of all Sofascore football competitions, cached for 30 days."""
    cache_key = "sofascore:all_competitions"
    cached = _cache.get_cached(db, cache_key, 24 * 30)
    if cached is not None:
        return cached.get("competitions", [])

    # Fetch all categories (countries/regions)
    try:
        data = await _get("/sport/football/categories")
    except Exception as e:
        logger.error(f"Sofascore categories error: {e}")
        return []

    categories = data.get("categories", [])
    cat_ids = [c["id"] for c in categories]
    cat_names = {c["id"]: c["name"] for c in categories}

    # Fetch tournaments per category in batches of 25
    BATCH = 25
    competitions: list[dict] = []
    for i in range(0, len(cat_ids), BATCH):
        batch = cat_ids[i:i + BATCH]
        results = await asyncio.gather(
            *[_get(f"/category/{cid}/unique-tournaments") for cid in batch],
            return_exceptions=True,
        )
        for cid, result in zip(batch, results):
            if isinstance(result, Exception):
                continue
            for group in result.get("groups", []):
                for t in group.get("uniqueTournaments", []):
                    tid = t.get("id")
                    if not tid:
                        continue
                    competitions.append({
                        "id": tid,
                        "name": t.get("name", ""),
                        "slug": t.get("slug", ""),
                        "country": cat_names.get(cid, ""),
                        "emblem_url": _tournament_emblem(tid),
                    })

    _cache.set_cached(db, cache_key, {"competitions": competitions})
    return competitions


# ── Season ID ─────────────────────────────────────────────────────────────────

async def get_current_season(tournament_id: int, db: Session) -> int | None:
    cache_key = f"sofascore:season:{tournament_id}"
    cached = _cache.get_cached(db, cache_key, 24 * 7)
    if cached is not None:
        return cached.get("season_id")
    try:
        data = await _get(f"/unique-tournament/{tournament_id}/seasons")
        seasons = data.get("seasons", [])
        season_id = seasons[0].get("id") if seasons else None
        _cache.set_cached(db, cache_key, {"season_id": season_id})
        return season_id
    except Exception as e:
        logger.error(f"Sofascore seasons error (tournament={tournament_id}): {e}")
        return None


# ── Team search & ID resolution ───────────────────────────────────────────────

async def search_teams(q: str, db: Session) -> list[dict]:
    """Search Sofascore for teams matching q. Returns football teams only."""
    try:
        data = await _get(f"/search/all?q={urllib.parse.quote(q)}")
        results = []
        for item in data.get("results", []):
            if item.get("type") != "team":
                continue
            entity = item.get("entity") or {}
            if (entity.get("sport") or {}).get("slug") != "football":
                continue
            team_id = entity.get("id")
            results.append({
                "name": entity.get("name", ""),
                "short_name": entity.get("nameCode"),
                "country": (entity.get("country") or {}).get("name"),
                "crest_url": _team_crest(team_id),
                "team_type": "national" if entity.get("national") else "club",
                "football_data_id": None,
                "api_football_id": None,
                "espn_id": None,
                "sofascore_id": team_id,
                "source": "sofascore",
            })
        return results
    except Exception as e:
        logger.error(f"Sofascore search error: {e}")
        return []


async def resolve_sofascore_id(name: str, db: Session) -> int | None:
    """Find Sofascore team ID by name, using search API."""
    results = await search_teams(name, db)
    name_lower = name.lower()
    for r in results:
        if _names_match(name_lower, r["name"].lower()):
            return r["sofascore_id"]
    return None


# ── Team schedule ─────────────────────────────────────────────────────────────

async def get_team_schedule(sofascore_id: int, db: Session, ttl_hours: float = 6) -> list[dict]:
    cache_key = f"sofascore:team_schedule:{sofascore_id}"
    cached = _cache.get_cached(db, cache_key, ttl_hours)
    if cached is not None:
        fixtures = cached.get("fixtures", [])
        if any(f["status"] == "LIVE" for f in fixtures):
            live_cached = _cache.get_cached(db, f"sofascore:team_schedule_live:{sofascore_id}", 1 / 60)
            if live_cached:
                return live_cached.get("fixtures", fixtures)
        return fixtures

    fixtures: list[dict] = []
    seen_ids: set = set()

    # Fetch 3 pages of past results in parallel (~90 events, covers ~18 months for active teams)
    past_pages = await asyncio.gather(
        *[_get(f"/team/{sofascore_id}/events/last/{p}") for p in range(3)],
        return_exceptions=True,
    )
    for result in past_pages:
        if isinstance(result, Exception):
            continue
        for event in result.get("events", []):
            eid = event.get("id")
            if eid and eid not in seen_ids:
                seen_ids.add(eid)
                f = _parse_fixture(event)
                if f:
                    fixtures.append(f)

    # Upcoming (404 when between seasons — handled gracefully)
    try:
        data = await _get(f"/team/{sofascore_id}/events/next/0")
        for event in data.get("events", []):
            eid = event.get("id")
            if eid and eid not in seen_ids:
                seen_ids.add(eid)
                f = _parse_fixture(event)
                if f:
                    fixtures.append(f)
    except _HTTPError as e:
        if e.status_code != 404:
            logger.error(f"Sofascore team next events error (id={sofascore_id}): {e}")
    except Exception as e:
        logger.error(f"Sofascore team next events error (id={sofascore_id}): {e}")

    _cache.set_cached(db, cache_key, {"fixtures": fixtures})
    if any(f["status"] == "LIVE" for f in fixtures):
        _cache.set_cached(db, f"sofascore:team_schedule_live:{sofascore_id}", {"fixtures": fixtures})
    return fixtures


# ── Competition fixtures ──────────────────────────────────────────────────────

async def get_competition_fixtures(tournament_id: int, db: Session, ttl_hours: float = 6) -> list[dict]:
    season_id = await get_current_season(tournament_id, db)
    if not season_id:
        return []

    cache_key = f"sofascore:comp_fixtures:{tournament_id}:{season_id}"
    cached = _cache.get_cached(db, cache_key, ttl_hours)
    if cached is not None:
        return cached.get("fixtures", [])

    fixtures: list[dict] = []

    for direction in ("last", "next"):
        try:
            data = await _get(f"/unique-tournament/{tournament_id}/season/{season_id}/events/{direction}/0")
            for event in data.get("events", []):
                f = _parse_fixture(event)
                if f:
                    fixtures.append(f)
        except _HTTPError as e:
            if e.status_code != 404:
                logger.error(f"Sofascore comp fixtures error (t={tournament_id}, {direction}): {e}")
        except Exception as e:
            logger.error(f"Sofascore comp fixtures error (t={tournament_id}, {direction}): {e}")

    _cache.set_cached(db, cache_key, {"fixtures": fixtures})
    return fixtures


# ── Standings ─────────────────────────────────────────────────────────────────

async def get_competition_standings(tournament_id: int, db: Session, ttl_hours: float = 24) -> dict | None:
    season_id = await get_current_season(tournament_id, db)
    if not season_id:
        return None

    cache_key = f"sofascore:standings:{tournament_id}:{season_id}"
    cached = _cache.get_cached(db, cache_key, ttl_hours)
    if cached is not None:
        return cached or None

    try:
        data = await _get(f"/unique-tournament/{tournament_id}/season/{season_id}/standings/total")
        standings_list = data.get("standings", [])
        if not standings_list:
            _cache.set_cached(db, cache_key, {})
            return None

        tables = []
        for standing in standings_list:
            rows = []
            for entry in standing.get("rows", []):
                team = entry.get("team") or {}
                gf = entry.get("scoresFor", 0) or 0
                ga = entry.get("scoresAgainst", 0) or 0
                rows.append({
                    "position": entry.get("position", 0),
                    "team_name": team.get("name", ""),
                    "team_crest": _team_crest(team.get("id")),
                    "played": entry.get("matches", 0) or 0,
                    "won": entry.get("wins", 0) or 0,
                    "draw": entry.get("draws", 0) or 0,
                    "lost": entry.get("losses", 0) or 0,
                    "goals_for": gf,
                    "goals_against": ga,
                    "goal_difference": gf - ga,
                    "points": entry.get("points", 0) or 0,
                    "form": None,
                })
            tables.append({
                "stage": None,
                "group": standing.get("name"),
                "table": rows,
                "start_date": None,
                "end_date": None,
            })

        # Pull season year from season endpoint (already cached)
        season_data = _cache.get_cached(db, f"sofascore:season:{tournament_id}", 24 * 7)
        season_year = None
        if season_data:
            try:
                seasons_resp = await _get(f"/unique-tournament/{tournament_id}/seasons")
                for s in seasons_resp.get("seasons", []):
                    if s.get("id") == season_id:
                        season_year = s.get("year")
                        break
            except Exception:
                pass

        result = {
            "competition": {
                "id": tournament_id,
                "name": "",
                "emblem_url": _tournament_emblem(tournament_id),
            },
            "season": season_year,
            "source": "sofascore",
            "tables": tables,
            "cached_at": datetime.utcnow().isoformat() + "Z",
        }
        _cache.set_cached(db, cache_key, result)
        return result
    except Exception as e:
        logger.error(f"Sofascore standings error (tournament={tournament_id}): {e}")
        _cache.set_cached(db, cache_key, {})
        return None


# ── Match detail ──────────────────────────────────────────────────────────────

def _parse_incidents(data: dict, home_name: str, away_name: str) -> list[dict]:
    events = []
    for inc in data.get("incidents", []):
        inc_class = inc.get("incidentClass", "")
        inc_type = inc.get("incidentType", "")

        if inc_type == "goal":
            ev_type = "goal"
        elif inc_type == "card":
            ev_type = "yellow_card" if inc_class in ("yellow", "yellowRed") else "red_card"
        elif inc_type == "substitution":
            ev_type = "substitution"
        else:
            continue

        team_side = inc.get("isHome")
        team_name = home_name if team_side else away_name

        player = (inc.get("player") or {}).get("name")
        assist = None
        if ev_type == "substitution":
            assist = (inc.get("playerOut") or {}).get("name")
        elif ev_type == "goal":
            assist = (inc.get("assist1") or {}).get("name")

        events.append({
            "minute": inc.get("time"),
            "extra_time": inc.get("addedTime"),
            "type": ev_type,
            "team": team_name,
            "player": player,
            "assist": assist,
            "detail": inc_class if ev_type not in ("goal", "substitution") else None,
        })

    events.sort(key=lambda e: (e.get("minute") or 0))
    return events


def _parse_stats(data: dict) -> list[dict]:
    stats = []
    for group in data.get("statistics", []):
        for stat_group in group.get("groups", []):
            for item in stat_group.get("statisticsItems", []):
                name = item.get("name", "").lower()
                home_val = item.get("home")
                away_val = item.get("away")
                if name == "ball possession":
                    try:
                        stats.append({"key": "possession", "home": float(str(home_val).rstrip("%")), "away": float(str(away_val).rstrip("%"))})
                    except Exception:
                        pass
                elif name == "total shots":
                    stats.append({"key": "shots", "home": home_val, "away": away_val})
                elif name == "shots on target":
                    stats.append({"key": "shots_on_target", "home": home_val, "away": away_val})
                elif name == "corner kicks":
                    stats.append({"key": "corners", "home": home_val, "away": away_val})
                elif name == "fouls":
                    stats.append({"key": "fouls", "home": home_val, "away": away_val})
                elif name == "yellow cards":
                    stats.append({"key": "yellow_cards", "home": home_val, "away": away_val})
                elif name == "red cards":
                    stats.append({"key": "red_cards", "home": home_val, "away": away_val})
                elif name == "offsides":
                    stats.append({"key": "offsides", "home": home_val, "away": away_val})
                elif name == "goalkeeper saves":
                    stats.append({"key": "saves", "home": home_val, "away": away_val})
    return stats


def _format_stats(raw_stats: list[dict], home_name: str, away_name: str) -> list[dict]:
    """Convert flat key/value stat pairs into per-team dicts matching MatchStats schema."""
    home = {"team": home_name}
    away = {"team": away_name}
    for s in raw_stats:
        k = s["key"]
        home[k] = s.get("home")
        away[k] = s.get("away")
    if len(home) > 1 or len(away) > 1:
        return [home, away]
    return []


async def get_match_detail(event_id: int, db: Session) -> dict | None:
    cache_key = f"sofascore:match:{event_id}"
    cached = _cache.get_cached(db, cache_key, None)
    if cached:
        if cached.get("is_permanent"):
            return cached
        live_age = (
            datetime.utcnow()
            - datetime.fromisoformat(cached.get("cached_at", "2000-01-01T00:00:00").rstrip("Z"))
        ).total_seconds()
        if cached.get("status") != "LIVE" or live_age < 60:
            return cached

    try:
        event_data, incidents_data = await asyncio.gather(
            _get(f"/event/{event_id}"),
            _get(f"/event/{event_id}/incidents"),
            return_exceptions=True,
        )
    except Exception as e:
        logger.error(f"Sofascore match detail error (id={event_id}): {e}")
        return None

    if isinstance(event_data, Exception) or not isinstance(event_data, dict):
        return None

    event = event_data.get("event") or {}
    fixture = _parse_fixture(event)
    if not fixture:
        return None

    home_name = fixture["home_team"]["name"]
    away_name = fixture["away_team"]["name"]

    raw_events: list[dict] = []
    raw_stats: list[dict] = []
    if isinstance(incidents_data, dict):
        raw_events = _parse_incidents(incidents_data, home_name, away_name)

    # Stats — best-effort, non-fatal if missing
    try:
        stats_data = await _get(f"/event/{event_id}/statistics")
        raw_stats = _parse_stats(stats_data)
    except Exception:
        pass

    # Lineups — best-effort
    lineups: list[dict] = []
    try:
        lineup_data = await _get(f"/event/{event_id}/lineups")
        for team_key in ("home", "away"):
            team_info = lineup_data.get(team_key) or {}
            team_name = home_name if team_key == "home" else away_name
            players = team_info.get("players") or []
            xi = []
            subs = []
            for p in players:
                player = p.get("player") or {}
                entry = {
                    "name": player.get("name", ""),
                    "number": p.get("shirtNumber"),
                    "position": (p.get("position") or ""),
                    "grid": p.get("positionCoordinates"),
                }
                if p.get("substitute"):
                    subs.append(entry)
                else:
                    xi.append(entry)
            if xi or subs:
                lineups.append({
                    "team": team_name,
                    "formation": team_info.get("formation"),
                    "starting_xi": xi,
                    "substitutes": subs,
                })
    except Exception:
        pass

    from schemas import FixtureOut, TeamRef, CompetitionRef
    fixture_out = FixtureOut(
        id=f"sofascore:{fixture['external_id']}",
        external_id=fixture["external_id"],
        source="sofascore",
        utc_date=fixture["utc_date"],
        status=fixture["status"],
        minute=fixture.get("minute"),
        home_team=TeamRef(**fixture["home_team"]),
        away_team=TeamRef(**fixture["away_team"]),
        competition=CompetitionRef(**fixture["competition"]),
        score_home=fixture.get("score_home"),
        score_away=fixture.get("score_away"),
        score_ht_home=fixture.get("score_ht_home"),
        score_ht_away=fixture.get("score_ht_away"),
        matchday=fixture.get("matchday"),
        venue=fixture.get("venue"),
        league_slug=fixture.get("league_slug"),
    )

    is_finished = fixture["status"] == "FINISHED"
    detail = {
        "fixture": fixture_out.model_dump(),
        "events": raw_events,
        "stats": _format_stats(raw_stats, home_name, away_name),
        "lineups": lineups,
        "source": "sofascore",
        "cached_at": datetime.utcnow().isoformat() + "Z",
        "is_permanent": is_finished,
        "status": fixture["status"],
    }
    _cache.set_cached(db, cache_key, detail, is_permanent=is_finished)
    return detail
