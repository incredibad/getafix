# Changelog

## [0.4.11] — 2026-05-31

### Fixed
- ESPN standings season label now matches the actual data: for the Asian Cup it was showing "Season 2028" (the next tournament's metadata) while displaying 2023 tournament groups labeled "Ended Jan 2024"; now correctly shows "Season 2024" by passing the season year when fetching typed data and using the typed response for metadata

## [0.4.10] — 2026-05-31

### Changed
- Source labels (FD/APF/ESPN) are now styled as small bordered badges rather than plain text

## [0.4.9] — 2026-05-31

### Added
- Data source label (FD / APF / ESPN) shown on each fixture card and each competition accordion header in Tables

## [0.4.8] — 2026-05-31

### Fixed
- ESPN standings dates now appear for infrequent tournaments (e.g. AFC Asian Cup) where the most recent completed tournament is older than 1 year; falls back to the most recently ended round rather than showing no dates

## [0.4.7] — 2026-05-31

### Fixed
- Standings status badge "Ended" text was using slate-600 (nearly invisible on dark theme); changed to slate-400

## [0.4.6] — 2026-05-31

### Added
- Standings group/round headings now show a status badge: pulsing green "Active" if current, "Ended Mon YYYY" (slate) if finished, "Starts Mon YYYY" (blue) if upcoming
- Applies to all providers: ESPN rounds get per-round dates; football-data.org groups inherit the season start/end dates

## [0.4.5] — 2026-05-31

### Fixed
- ESPN standings now show all recent rounds (e.g. Third Round + Fourth Round for AFC WC Qualifying) rather than a single round; groups are labelled with the round name when multiple rounds are shown
- Season label now uses the competition's end year (e.g. 2026) rather than ESPN's internal start year (e.g. 2023)

## [0.4.4] — 2026-05-31

### Fixed
- ESPN standings no longer show old historical rounds; the most recently active round with standings is auto-selected (e.g. Third Round for AFC WC Qualifying instead of the 2023 Second Round)

## [0.4.3] — 2026-05-31

### Changed
- Score obfuscation: replaced blur effect with a flat lock icon (Lock from lucide-react); click the icon to reveal the score, Eye/EyeOff button still reveals/hides all at once

## [0.4.2] — 2026-05-31

### Added
- Score obfuscation: scores are blurred by default on the Fixtures list and Match Detail pages; click an individual score to reveal it, or use the Eye/EyeOff button in the page header to reveal/hide all scores at once; state always resets to hidden on page load

## [0.4.1] — 2026-05-31

### Changed
- Tables page: replaced tab layout with accordion; only one competition open at a time; first competition auto-expands on load; chevron rotates to indicate state

## [0.4.0] — 2026-05-31

### Changed
- Tables page: competitions now displayed in tabs (one tab per competition, scrollable on mobile); groups within each competition are stacked below the active tab
- Fixtures page: two rows of filter pills — one for followed teams, one for competitions seen in fixture data; pills toggle on/off; tapping the same pill a second time clears the filter

## [0.3.0] — 2026-05-31

### Added
- ESPN standings support for international competitions: AFC Asian Cup and AFC World Cup Qualifying now show group tables sourced from ESPN (tried before APF since APF free tier is frozen at 2024)
- `espn_slug` field on Competition model; seed data includes slugs for AFC Asian Cup and AFC WC Qualifying
- ESPN fixtures auto-link to seeded competitions using keyword name mapping (handles ESPN naming differences like "FIFA World Cup Qualifying - AFC" → "AFC World Cup Qualifying")
- Startup migration adds `espn_slug` column to existing competition tables

## [0.2.1] — 2026-05-31

### Fixed
- Fixture window expanded to 365 days back / 90 days ahead so AFC qualifiers and international friendlies from ESPN are visible (previously hidden by the 7-day lookback default)

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
