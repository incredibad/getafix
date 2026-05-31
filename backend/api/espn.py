"""
Client for ESPN's unofficial soccer API.
No auth or API key required. Used as fallback for international fixtures
(AFC qualifiers, friendlies, Asian Cup) not covered by football-data.org
or API-Football on the free tier.
"""
import logging
from datetime import datetime, timezone, timedelta
import httpx
from sqlalchemy.orm import Session

import cache as _cache

logger = logging.getLogger(__name__)

BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer"
BASE_V2 = "https://site.api.espn.com/apis/v2/sports/soccer"

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


async def _get_v2(path: str, params: dict | None = None) -> dict:
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(f"{BASE_V2}{path}", params=params)
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
        "league_slug": event.get("league", {}).get("slug"),
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


def _parse_iso(s: str | None) -> datetime | None:
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except ValueError:
        return None


def _find_recent_seasontypes(data: dict) -> list[tuple[int, str, str, str, int]]:
    """
    Return (seasontype_id, round_name, start_iso, end_iso, season_year) for relevant rounds.

    Strategy: find the first season (newest-first) that has at least one type
    with hasStandings=True that has already started. Among those types, prefer
    ones that ended within the last year. If none are that recent (e.g. an
    infrequent tournament like the Asian Cup), fall back to the single most
    recently ended type so dates still show.

    season_year is included so callers can pass it to the ESPN API to ensure
    the correct season's metadata is returned (not just the latest/default season).

    Returns empty list for simple league tables with no round types.
    """
    now = datetime.now(timezone.utc)
    one_year_ago = now - timedelta(days=365)

    for s in data.get("seasons", []):
        season_year = s.get("year")
        started = []
        for t in s.get("types", []):
            if not t.get("hasStandings"):
                continue
            start = _parse_iso(t.get("startDate"))
            end = _parse_iso(t.get("endDate"))
            if start and start <= now:
                started.append((int(t["id"]), t.get("name", f"Round {t['id']}"), t["startDate"], t["endDate"], end, season_year))

        if not started:
            continue

        recent = [(i, n, sd, ed, sy) for (i, n, sd, ed, end, sy) in started if end and end >= one_year_ago]
        if recent:
            return [(i, n, sd, ed, sy) for (i, n, sd, ed, sy) in recent]

        # Nothing within the last year — return the single most recently ended type
        # (handles infrequent tournaments like the Asian Cup)
        latest = max(started, key=lambda x: x[4] or datetime.min.replace(tzinfo=timezone.utc))
        return [(latest[0], latest[1], latest[2], latest[3], latest[5])]

    return []


def _parse_standings(data: dict) -> dict:
    def _int(v) -> int:
        try:
            return int(float(v)) if v is not None else 0
        except (ValueError, TypeError):
            return 0

    tables = []
    for group in data.get("children", []):
        rows = []
        entries = group.get("standings", {}).get("entries", [])
        for i, entry in enumerate(entries):
            team = entry.get("team", {})
            logos = team.get("logos", [])
            crest = logos[0].get("href") if logos else None
            stats = {s["name"]: s.get("value") for s in entry.get("stats", [])}
            rows.append({
                "position": i + 1,
                "team_name": team.get("displayName", ""),
                "team_crest": crest,
                "played": _int(stats.get("gamesPlayed")),
                "won": _int(stats.get("wins")),
                "draw": _int(stats.get("ties")),
                "lost": _int(stats.get("losses")),
                "goals_for": _int(stats.get("pointsFor") or stats.get("goalsFor")),
                "goals_against": _int(stats.get("pointsAgainst") or stats.get("goalsAgainst")),
                "goal_difference": _int(stats.get("pointDifferential") or stats.get("goalsDiff")),
                "points": _int(stats.get("points")),
                "form": None,
            })
        tables.append({
            "stage": None,
            "group": group.get("name"),
            "table": rows,
        })

    season_data = data.get("season") or {}
    # Use the end year of the season (e.g. 2026 for 2023-26 WC qualifying) since
    # ESPN's "year" field reflects when the campaign started, not what it's called.
    end_date = _parse_iso(season_data.get("endDate")) if isinstance(season_data, dict) else None
    season_year = end_date.year if end_date else (season_data.get("year") if isinstance(season_data, dict) else None)

    return {
        "competition": {
            "id": None,
            "name": data.get("name", ""),
            "emblem_url": None,
        },
        "season": season_year,
        "source": "espn",
        "tables": tables,
        "cached_at": datetime.utcnow().isoformat() + "Z",
    }


async def get_competition_standings(slug: str, db: Session, ttl_hours: float = 24) -> dict | None:
    cache_key = f"espn:standings:{slug}"
    cached = _cache.get_cached(db, cache_key, ttl_hours)
    if cached is not None:
        return cached if cached else None

    try:
        data = await _get_v2(f"/{slug}/standings")

        # For multi-round competitions, fetch every recent round and combine their groups.
        seasontypes = _find_recent_seasontypes(data)
        if seasontypes:
            all_tables = []
            multi = len(seasontypes) > 1
            meta_data = None  # use first successful typed response for season metadata
            for st_id, st_name, st_start, st_end, season_year in seasontypes:
                params = {"seasontype": st_id}
                if season_year:
                    params["season"] = season_year
                typed = await _get_v2(f"/{slug}/standings", params)
                if not typed.get("children"):
                    continue
                if meta_data is None:
                    meta_data = typed
                partial = _parse_standings(typed)
                for table in partial["tables"]:
                    if multi:
                        group = table.get("group") or ""
                        table["group"] = f"{st_name}: {group}" if group else st_name
                    table["start_date"] = st_start
                    table["end_date"] = st_end
                    all_tables.append(table)
            if all_tables:
                result = _parse_standings(meta_data or data)
                result["tables"] = all_tables
                _cache.set_cached(db, cache_key, result)
                return result

        if not data.get("children"):
            _cache.set_cached(db, cache_key, {})
            return None
        result = _parse_standings(data)
        _cache.set_cached(db, cache_key, result)
        return result
    except Exception as e:
        logger.error(f"ESPN standings error ({slug}): {e}")
        return None


_KNOWN_SLUGS = ["fifa.worldq.afc", "afc.asian.cup", "fifa.world.2026", "fifa.friendly", "afc.champions"]


def _names_match(a: str, b: str) -> bool:
    """Fuzzy team name match: substring containment or shared significant word."""
    if a in b or b in a:
        return True
    a_words = {w for w in a.split() if len(w) > 3}
    b_words = {w for w in b.split() if len(w) > 3}
    return bool(a_words & b_words)


async def get_match_events_by_teams(
    slug: str, utc_date: str, home_name: str, away_name: str, db: Session
) -> dict | None:
    """Find an ESPN match by date+team names and return its full detail dict."""
    try:
        dt = datetime.fromisoformat(utc_date.replace("Z", "+00:00"))
        date_str = dt.strftime("%Y%m%d")
    except (ValueError, AttributeError):
        return None

    cache_key = f"espn:scoreboard:{slug}:{date_str}"
    board = _cache.get_cached(db, cache_key, 24 * 7)
    if board is None:
        try:
            board = await _get(f"/{slug}/scoreboard", params={"dates": date_str})
            _cache.set_cached(db, cache_key, board)
        except Exception as e:
            logger.warning(f"ESPN scoreboard error ({slug}, {date_str}): {e}")
            return None

    home_lower = home_name.lower()
    away_lower = away_name.lower()
    event_id = None

    for event in board.get("events", []):
        comps = event.get("competitions", [])
        if not comps:
            continue
        competitors = comps[0].get("competitors", [])
        h = next((c for c in competitors if c.get("homeAway") == "home"), {})
        a = next((c for c in competitors if c.get("homeAway") == "away"), {})
        h_name = h.get("team", {}).get("displayName", "").lower()
        a_name = a.get("team", {}).get("displayName", "").lower()
        if _names_match(home_lower, h_name) and _names_match(away_lower, a_name):
            try:
                event_id = int(event["id"])
            except (KeyError, ValueError, TypeError):
                pass
            break

    if not event_id:
        return None

    return await get_match_detail(event_id, slug, db)


def _parse_fixture_from_summary(data: dict) -> dict | None:
    header = data.get("header", {})
    comps = header.get("competitions", [])
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
    date = comp.get("date") or ""

    event_id = header.get("id") or comp.get("id")
    league = header.get("league") or {}

    return {
        "external_id": int(event_id) if event_id else 0,
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
            "name": league.get("name", ""),
            "emblem_url": None,
        },
        "score_home": _parse_score(home.get("score")),
        "score_away": _parse_score(away.get("score")),
        "score_ht_home": None,
        "score_ht_away": None,
        "matchday": None,
        "venue": venue_data.get("fullName"),
    }


def _parse_events_espn(data: dict) -> list:
    events = []
    for ev in data.get("keyEvents", []):
        ev_type_raw = ev.get("type", {}).get("type", "")
        if ev_type_raw == "yellow-card":
            ev_type = "yellow_card"
        elif ev_type_raw in ("red-card", "yellow-red-card"):
            ev_type = "red_card"
        elif ev_type_raw in ("goal", "penalty-goal", "own-goal"):
            ev_type = "goal"
        elif ev_type_raw == "substitution":
            ev_type = "substitution"
        else:
            continue

        clock = ev.get("clock", {}).get("displayValue", "")
        try:
            minute = int(clock.rstrip("'").split("+")[0])
        except (ValueError, TypeError):
            minute = None

        participants = ev.get("participants", [])
        player = participants[0].get("athlete", {}).get("displayName") if participants else None
        assist = None
        if ev_type == "substitution" and len(participants) > 1:
            assist = participants[1].get("athlete", {}).get("displayName")
        elif ev_type == "goal":
            for p in participants[1:]:
                role = (p.get("type") or {}).get("name", "")
                if "assist" in role.lower():
                    assist = p.get("athlete", {}).get("displayName")
                    break

        events.append({
            "minute": minute,
            "extra_time": None,
            "type": ev_type,
            "team": ev.get("team", {}).get("displayName", ""),
            "player": player,
            "assist": assist,
            "detail": ev_type_raw if ev_type_raw not in ("goal", "yellow-card", "red-card", "substitution") else None,
        })

    events.sort(key=lambda e: (e.get("minute") or 0))
    return events


def _parse_lineups_espn(data: dict) -> list:
    lineups = []
    for roster_data in data.get("rosters", []):
        team = roster_data.get("team", {})
        formation = roster_data.get("formation")
        xi = []
        subs = []
        for p in roster_data.get("roster", []):
            athlete = p.get("athlete", {})
            entry = {
                "name": athlete.get("displayName", ""),
                "number": p.get("jersey"),
                "position": (p.get("position") or {}).get("abbreviation"),
                "grid": None,
            }
            if p.get("starter"):
                xi.append(entry)
            else:
                subs.append(entry)
        if xi or subs:
            lineups.append({
                "team": team.get("displayName", ""),
                "formation": formation,
                "starting_xi": xi,
                "substitutes": subs,
            })
    return lineups


def _parse_stats_espn(data: dict) -> list:
    stats = []
    for team_data in data.get("boxscore", {}).get("teams", []):
        team_name = team_data.get("team", {}).get("displayName", "")
        stat_map = {s["name"]: s.get("displayValue") for s in team_data.get("statistics", [])}
        if not stat_map:
            continue

        def _num(v):
            if v is None:
                return None
            try:
                return float(str(v).rstrip("%"))
            except (ValueError, TypeError):
                return None

        stats.append({
            "team": team_name,
            "possession": _num(stat_map.get("possessionPct")),
            "shots": _num(stat_map.get("totalShots")),
            "shots_on_target": _num(stat_map.get("shotsOnTarget")),
            "corners": _num(stat_map.get("cornerKicks")),
            "fouls": _num(stat_map.get("foulsCommitted")),
            "yellow_cards": _num(stat_map.get("yellowCards")),
            "red_cards": _num(stat_map.get("redCards")),
            "offsides": _num(stat_map.get("offsides")),
            "saves": _num(stat_map.get("saves")),
        })
    return stats


async def get_match_detail(event_id: int, league_slug: str | None, db: Session) -> dict | None:
    cache_key = f"espn:match:{event_id}"
    cached = _cache.get_cached(db, cache_key, None)
    if cached:
        if cached.get("is_permanent"):
            return cached
        live_age = (
            datetime.utcnow()
            - datetime.fromisoformat(cached.get("cached_at", "2000-01-01T00:00:00").rstrip("Z"))
        ).total_seconds()
        if cached.get("status") not in ("LIVE",) or live_age < 60:
            return cached

    slugs_to_try = []
    if league_slug:
        slugs_to_try.append(league_slug)
    for s in _KNOWN_SLUGS:
        if s not in slugs_to_try:
            slugs_to_try.append(s)

    data = None
    for slug in slugs_to_try:
        try:
            candidate = await _get(f"/{slug}/summary", params={"event": event_id})
            if candidate.get("header"):
                data = candidate
                break
        except Exception:
            continue

    if not data:
        return None

    fixture = _parse_fixture_from_summary(data)
    if not fixture:
        return None

    is_finished = fixture["status"] == "FINISHED"
    detail = {
        "fixture": fixture,
        "events": _parse_events_espn(data),
        "stats": _parse_stats_espn(data),
        "lineups": _parse_lineups_espn(data),
        "source": "espn",
        "cached_at": datetime.utcnow().isoformat() + "Z",
        "is_permanent": is_finished,
        "status": fixture["status"],
    }
    _cache.set_cached(db, cache_key, detail, is_permanent=is_finished)
    return detail
