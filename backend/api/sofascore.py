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


def _country_flag_url(category_id: int) -> str:
    return f"{BASE}/category/{category_id}/image"


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


# ── Team profile ──────────────────────────────────────────────────────────────

async def get_team_profile(team_id: int, db: Session) -> dict:
    cache_key = f"sofascore:team_profile:v2:{team_id}"
    cached = _cache.get_cached(db, cache_key, 24 * 7)
    if cached is not None:
        return cached
    try:
        data = await _get(f"/team/{team_id}")
        team = data.get("team") or {}
        manager = team.get("manager") or {}
        venue = team.get("venue") or {}
        primary = team.get("primaryUniqueTournament") or {}
        founded_ts = team.get("foundationDateTimestamp")
        founded_year = None
        if founded_ts:
            try:
                founded_year = datetime.fromtimestamp(founded_ts, tz=timezone.utc).year
            except Exception:
                pass
        result = {
            "name": team.get("name", ""),
            "short_name": team.get("nameCode"),
            "country": (team.get("country") or {}).get("name"),
            "manager": manager.get("name"),
            "venue": venue.get("name") or (venue.get("stadium") or {}).get("name"),
            "venue_city": venue.get("city", {}).get("name") if isinstance(venue.get("city"), dict) else venue.get("city"),
            "founded": founded_year,
            "primary_tournament_id": primary.get("id"),
            "primary_tournament_name": primary.get("name"),
            "primary_tournament_emblem": _tournament_emblem(primary.get("id")),
            "national": bool(team.get("national", False)),
            "gender": team.get("gender"),
            "slug": team.get("slug"),
        }
        _cache.set_cached(db, cache_key, result)
        return result
    except Exception as e:
        logger.error(f"Sofascore team profile error (id={team_id}): {e}")
        return {}


async def get_team_ranking(team_id: int, db: Session) -> int | None:
    cache_key = f"sofascore:team_ranking:{team_id}"
    cached = _cache.get_cached(db, cache_key, 24 * 2)
    if cached is not None:
        return cached.get("ranking")
    try:
        data = await _get(f"/team/{team_id}/rankings")
        rankings = data.get("rankings") or []
        if rankings:
            ranking = rankings[0].get("ranking")
            _cache.set_cached(db, cache_key, {"ranking": ranking})
            return ranking
        return None
    except Exception:
        return None


# ── Team squad ────────────────────────────────────────────────────────────────

async def _get_national_team_id(country_name: str, db: Session) -> int | None:
    """Look up the Sofascore national team ID for a country, cached 30 days."""
    cache_key = f"sofascore:national_team_id:{country_name.lower()}"
    cached = _cache.get_cached(db, cache_key, 24 * 30)
    if cached is not None:
        return cached.get("team_id")
    try:
        data = await _get(f"/search/all?q={urllib.parse.quote(country_name)}")
        team_id = None
        for item in data.get("results", []):
            if item.get("type") != "team":
                continue
            entity = item.get("entity") or {}
            if (entity.get("sport") or {}).get("slug") != "football":
                continue
            if not entity.get("national"):
                continue
            if entity.get("name", "").lower() == country_name.lower():
                team_id = entity.get("id")
                break
            if team_id is None:
                team_id = entity.get("id")
        _cache.set_cached(db, cache_key, {"team_id": team_id})
        return team_id
    except Exception as e:
        logger.error(f"National team lookup error for {country_name}: {e}")
        return None


async def _get_alpha2_category_map(db: Session) -> dict[str, int]:
    """Return a mapping of ISO/Sofascore alpha2 code → Sofascore category id."""
    cache_key = "sofascore:alpha2_category_map"
    cached = _cache.get_cached(db, cache_key, 24 * 30)
    if cached is not None:
        return cached.get("map", {})
    try:
        data = await _get("/sport/football/categories")
        mapping = {c["alpha2"]: c["id"] for c in data.get("categories", []) if c.get("alpha2") and c.get("id")}
        _cache.set_cached(db, cache_key, {"map": mapping})
        return mapping
    except Exception as e:
        logger.error(f"Sofascore alpha2 category map error: {e}")
        return {}


async def _get_team_players_raw(team_id: int, db: Session) -> list[dict]:
    """Fetch and cache the raw /team/{id}/players response items."""
    cache_key = f"sofascore:team_players_raw:v3:{team_id}"
    cached = _cache.get_cached(db, cache_key, 12)
    if cached is not None:
        return cached.get("items", [])
    try:
        data = await _get(f"/team/{team_id}/players")
        items = data.get("players", [])
        _cache.set_cached(db, cache_key, {"items": items})
        return items
    except Exception as e:
        logger.error(f"Sofascore team players raw error (id={team_id}): {e}")
        return []


async def get_team_players(team_id: int, db: Session) -> list[dict]:
    items, alpha2_map = await asyncio.gather(
        _get_team_players_raw(team_id, db),
        _get_alpha2_category_map(db),
    )

    # Batch-fetch national team IDs for all unique nationalities in parallel
    unique_countries: set[str] = set()
    for item in items:
        name = (item.get("player") or {}).get("country", {}).get("name")
        if name:
            unique_countries.add(name)
    nat_team_ids: dict[str, int | None] = {}
    if unique_countries:
        results = await asyncio.gather(*[_get_national_team_id(c, db) for c in unique_countries])
        nat_team_ids = dict(zip(unique_countries, results))

    players = []
    for item in items:
        player = item.get("player") or {}
        dob_ts = player.get("dateOfBirthTimestamp")
        age = None
        if dob_ts:
            try:
                dob = datetime.fromtimestamp(dob_ts, tz=timezone.utc)
                today = datetime.now(timezone.utc)
                age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
            except Exception:
                pass
        detailed = player.get("positionsDetailed") or []
        country = player.get("country") or {}
        alpha2 = country.get("alpha2")
        country_name = country.get("name")
        cat_id = alpha2_map.get(alpha2) if alpha2 else None
        club = player.get("team") or {}
        players.append({
            "name": player.get("name", ""),
            "short_name": player.get("shortName") or player.get("name", ""),
            "position": item.get("position") or player.get("position"),
            "positions_detailed": detailed,
            "jersey_number": player.get("shirtNumber") or player.get("jerseyNumber"),
            "nationality": country_name,
            "nationality_flag": _country_flag_url(cat_id) if cat_id else None,
            "nationality_team_id": nat_team_ids.get(country_name) if country_name else None,
            "height": player.get("height"),
            "age": age,
            "player_id": player.get("id"),
            "club_id": club.get("id"),
            "club_name": club.get("name"),
            "club_short_name": club.get("shortName") or club.get("name"),
            "club_crest_url": _team_crest(club.get("id")),
        })
    return players


# ── Team injuries ────────────────────────────────────────────────────────────

async def get_team_injuries(team_id: int, db: Session) -> list[dict]:
    items = await _get_team_players_raw(team_id, db)
    injuries = []
    for item in items:
        player = item.get("player") or {}
        inj = player.get("injury")
        if not inj:
            continue
        status = inj.get("status", "")
        reason = inj.get("reason") or inj.get("type") or ""
        end_ts = inj.get("endDateTimestamp")
        return_str = None
        if end_ts:
            try:
                return_str = datetime.fromtimestamp(end_ts, tz=timezone.utc).strftime("%-d %b %Y")
            except Exception:
                pass
        if not return_str:
            ret = inj.get("expectedReturnDateData") or {}
            if ret.get("month") and ret.get("year"):
                months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
                m = ret["month"]
                if 1 <= m <= 12:
                    return_str = f"{months[m-1]} {ret['year']}"
        injuries.append({
            "player": player.get("name", ""),
            "type": reason,
            "severity": "red" if status == "out" else "yellow",
            "expected_return": return_str,
        })
    return injuries


# ── Team transfers ────────────────────────────────────────────────────────────

async def get_team_transfers(team_id: int, db: Session) -> dict:
    cache_key = f"sofascore:team_transfers:{team_id}"
    cached = _cache.get_cached(db, cache_key, 24)
    if cached is not None:
        return cached
    try:
        data = await _get(f"/team/{team_id}/transfers/last/0")
        arrivals, departures = [], []
        for t in (data.get("transferHistory") or []):
            player = t.get("player") or {}
            from_team = t.get("fromTeam") or {}
            to_team = t.get("toTeam") or {}
            ts = t.get("transferDateTimestamp")
            date_str = None
            if ts:
                try:
                    date_str = datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%b %Y")
                except Exception:
                    pass
            entry = {
                "player": player.get("name", ""),
                "from_team": from_team.get("name"),
                "to_team": to_team.get("name"),
                "date": date_str,
                "transfer_type": t.get("type"),
                "fee": t.get("transferFee"),
            }
            if to_team.get("id") == team_id:
                arrivals.append(entry)
            elif from_team.get("id") == team_id:
                departures.append(entry)
        result = {"in": arrivals[:15], "out": departures[:15]}
        _cache.set_cached(db, cache_key, result)
        return result
    except Exception as e:
        logger.error(f"Sofascore team transfers error (id={team_id}): {e}")
        return {"in": [], "out": []}


# ── All competitions index ────────────────────────────────────────────────────

async def get_all_competitions(db: Session) -> list[dict]:
    """Return a flat list of all Sofascore football competitions, cached for 30 days."""
    cache_key = "sofascore:all_competitions:v2"
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
                        "user_count": t.get("userCount", 0),
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

    # Upcoming — paginate until 404 so all scheduled fixtures are included
    for page in range(10):
        try:
            data = await _get(f"/team/{sofascore_id}/events/next/{page}")
            events = data.get("events", [])
            if not events:
                break
            for event in events:
                eid = event.get("id")
                if eid and eid not in seen_ids:
                    seen_ids.add(eid)
                    f = _parse_fixture(event)
                    if f:
                        fixtures.append(f)
        except _HTTPError as e:
            if e.status_code != 404:
                logger.error(f"Sofascore team next events error (id={sofascore_id}, page={page}): {e}")
            break
        except Exception as e:
            logger.error(f"Sofascore team next events error (id={sofascore_id}, page={page}): {e}")
            break

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
    seen_ids: set = set()

    for direction in ("last", "next"):
        for page in range(10):
            try:
                data = await _get(f"/unique-tournament/{tournament_id}/season/{season_id}/events/{direction}/{page}")
                events = data.get("events", [])
                if not events:
                    break
                for event in events:
                    eid = event.get("id")
                    if eid and eid not in seen_ids:
                        seen_ids.add(eid)
                        f = _parse_fixture(event)
                        if f:
                            fixtures.append(f)
            except _HTTPError as e:
                if e.status_code != 404:
                    logger.error(f"Sofascore comp fixtures error (t={tournament_id}, {direction}/{page}): {e}")
                break
            except Exception as e:
                logger.error(f"Sofascore comp fixtures error (t={tournament_id}, {direction}/{page}): {e}")
                break

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
                    "sofascore_id": team.get("id"),
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

        season_year = None
        season_name = None
        try:
            seasons_resp = await _get(f"/unique-tournament/{tournament_id}/seasons")
            for s in seasons_resp.get("seasons", []):
                if s.get("id") == season_id:
                    season_year = s.get("year")
                    season_name = s.get("name")
                    break
        except Exception:
            pass

        result = {
            "competition": {
                "id": tournament_id,
                "name": season_name or "",
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


# ── Cup tree ─────────────────────────────────────────────────────────────────

async def get_cup_tree_for_team(tournament_id: int, team_id: int, db: Session, ttl_hours: float = 24) -> dict | None:
    season_id = await get_current_season(tournament_id, db)
    if not season_id:
        return None

    cache_key = f"sofascore:cuptree:{tournament_id}:{season_id}"
    cached = _cache.get_cached(db, cache_key, ttl_hours)
    if cached is not None:
        raw_tree = cached if cached else None
    else:
        try:
            data = await _get(f"/unique-tournament/{tournament_id}/season/{season_id}/cuptrees")
            trees = data.get("cupTrees", [])
            raw_tree = trees[0] if trees else None
            _cache.set_cached(db, cache_key, raw_tree or {})
        except _HTTPError as e:
            if e.status_code == 404:
                _cache.set_cached(db, cache_key, {})
                return None
            raise
        except Exception as e:
            logger.error(f"Sofascore cup tree error (tournament={tournament_id}): {e}")
            return None

    if not raw_tree:
        return None

    rounds = []
    for r in raw_tree.get("rounds", []):
        for b in r.get("blocks", []):
            for p in b.get("participants", []):
                if p.get("team", {}).get("id") == team_id:
                    other = next((x for x in b["participants"] if x.get("team", {}).get("id") != team_id), None)
                    rounds.append({
                        "round": r.get("description"),
                        "round_order": r.get("order", 0),
                        "opponent": other["team"]["name"] if other else None,
                        "opponent_id": other["team"]["id"] if other else None,
                        "opponent_crest": _team_crest(other["team"].get("id")) if other else None,
                        "result": b.get("result"),
                        "won": p.get("winner", False),
                        "finished": b.get("finished", False),
                    })

    if not rounds:
        return None

    return {
        "competition": {
            "id": tournament_id,
            "name": raw_tree.get("name", ""),
            "emblem_url": _tournament_emblem(tournament_id),
        },
        "rounds": sorted(rounds, key=lambda x: x["round_order"]),
    }


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
