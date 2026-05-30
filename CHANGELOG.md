# Changelog

## [0.2.0] — 2026-05-31

### Added
- ESPN unofficial API as a third fixture source for international teams
- Covers AFC qualifiers, AFC Asian Cup, and international friendlies not available via football-data.org or API-Football free tier
- ESPN team ID auto-resolved on follow for national teams (scans AFC/WC competition team lists)
- Fixture merging: ESPN supplements primary sources without duplicating matches already covered by FD or APF
- `espn_id` field stored on Team model; startup migration adds column to existing databases

## [0.1.1] — 2026-05-31

### Fixed
- FD fixture fetch now uses date range instead of status filter, so upcoming matches with "TIMED" status (e.g. World Cup fixtures) are included
- FD team ID auto-resolution via competition team list scan when following a new team
- Team search deduplication and 7-day cache
- APF season fallback (tries current year then previous year) for league fixture lookups
- docker-compose.yml now references external `footrack_data` volume correctly

## [0.1.0] — 2026-05-31

### Added
- Initial release
- Single-user auth with first-run setup screen and JWT tokens
- Team search across football-data.org and API-Football, follow/unfollow teams
- Consolidated fixture calendar for all followed teams, grouped by date (AEST)
- League tables for competitions linked to followed teams
- Match detail view: scoreline, events (goals, cards, subs), stats, lineups
- SQLite caching with TTLs: 24h fixtures, 6h standings on matchdays, 60s live, permanent finished matches, 7d metadata
- Dual API source routing: football-data.org for its 12 competitions, API-Football for everything else
- ID mapping tables for teams and competitions across both APIs
- Competition seeding at startup (Premier League, La Liga, Bundesliga, Serie A, Ligue 1, Champions League, Eredivisie, Primeira Liga, Championship, Brazilian Série A, World Cup, Euros, AFC Asian Cup, AFC qualifiers, A-League, International Friendlies, Europa League, Conference League)
- API usage tracking with daily counter and warning at 90/100 for API-Football
- Settings page: change password, cache management, API usage display
- Mobile-friendly responsive layout with collapsible sidebar
- Dark theme with green accent colour
- Rotating application log at /data/app.log
