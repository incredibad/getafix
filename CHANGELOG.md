# Changelog

## [0.5.31] — 2026-05-31

### Fixed
- `by-competition` endpoint now normalises incoming ESPN competition names (e.g. "International Friendly" → "International Friendlies") before the DB lookup, so the All view works when the frontend passes the raw ESPN name

## [0.5.30] — 2026-05-31

### Added
- Six new competitions: AFC Champions League, CAF Champions League, Copa Libertadores, Copa Sudamericana, CONCACAF Champions Cup, CONCACAF League — all with ESPN slugs for full "All fixtures" support

### Fixed
- All non-football-data competitions corrected from `preferred_source: api_football` (removed) to `espn`

## [0.5.29] — 2026-05-31

### Fixed
- `by-competition` "All" view now returns fixtures for Europa League (`uefa.europa`), Conference League (`uefa.europa.conf`), and International Friendlies (`fifa.friendly`); previously all three returned empty due to missing ESPN slugs and a competition-name mismatch in the followed-teams fallback

## [0.5.28] — 2026-05-31

### Fixed
- Fixtures team filter now shows full team name instead of short_name (which for national teams is the 3-letter TLA); sort also uses full name

## [0.5.27] — 2026-05-31

### Fixed
- Fixture cards with no crest URL now show a ⚽ emoji scaled to the crest size instead of the team's first letter

## [0.5.26] — 2026-05-31

### Added
- Fixtures: Mine|All toggle in the Leagues section header; "All" fetches every fixture for the selected competition via a new `/fixtures/by-competition` endpoint (FD: single `/competitions/{code}/matches` call; ESPN: team-by-team with dedup); toggle persists across league switches, resets to Mine when no comp filter is active

## [0.5.25] — 2026-05-31

### Changed
- Fixtures card: true 3-column layout — competition (144 px) | home–score–away (flex-1) | provider badge (56 px); score at 26 px, names at text-xl (20 px), crests at 28 px

## [0.5.24] — 2026-05-31

### Changed
- Fixtures: card is now a true single row — home team | score/time | away team — competition and source rows removed entirely; status (LIVE, PST, CANC) shown inline below score in centre column

## [0.5.23] — 2026-05-31

### Changed
- Fixtures: card redesign — team names at `text-2xl`, score at `text-4xl`, crests 36 px; all elements vertically centred in a single main row; kick-off time shown in the centre slot for unplayed fixtures instead of "vs"
- Fixtures: removed FT status badge (LIVE, PST, CANC remain)

## [0.5.22] — 2026-05-31

### Added
- Fixtures: team filters sorted alphabetically in both sidebar and mobile pills
- Fixtures: floating "Today" button (bottom-right, fixed) appears whenever today's section is scrolled out of view; hidden when no today section exists
- Fixtures: extra bottom padding so the floating button never overlaps the last fixture card

## [0.5.21] — 2026-05-31

### Added
- Fixtures: past cards get a red tint, today gets green, future gets blue (subtle highlight, border matches)
- Fixtures: view auto-scrolls to today's section on page load, refresh, and filter changes

## [0.5.20] — 2026-05-31

### Fixed
- Layout changed from `min-h-screen` to `h-screen overflow-hidden` so the two-column pages (Fixtures, Tables) have a fixed viewport height to work within; the left filter/tab columns are now truly sticky while only the right content area scrolls

## [0.5.19] — 2026-05-31

### Changed
- Fixtures desktop layout: filters moved to a full-height 250 px left column sectioned into Teams and Leagues; fixture list fills remaining screen width; reveal and refresh buttons are icon-only in the column header; mobile layout unchanged

## [0.5.18] — 2026-05-31

### Added
- Tables: followed teams are highlighted in green and their row is clickable — navigates to Fixtures with that team pre-filtered
- Tables: "Fixtures ↗" link button in the top-right of every table navigates to Fixtures with that competition pre-filtered
- Fixtures: accepts an `initialFilter` from navigation state so deep-links from Tables land with the correct filter already applied

## [0.5.17] — 2026-05-31

### Changed
- Tables desktop layout: competition tabs moved to a full-height 250 px column with its own title and refresh button; standings content takes the remaining screen width with no max-width cap

## [0.5.16] — 2026-05-31

### Fixed
- La Liga (and all other FD-sourced competitions) now display their preferred names; football-data.org returns "Primera Division" for La Liga — added a canonical display-name map applied at parse time in both fixture and standings responses; stale caches cleared

## [0.5.15] — 2026-05-31

### Added
- Following a team now shows a persistent toast naming the competitions linked (e.g. "Following SSC Napoli · added to Serie A"); toast survives client-side navigation (Toaster is at root) and page refresh (replayed from localStorage within a 5-minute window)

## [0.5.14] — 2026-05-31

### Fixed
- Following a new team now immediately creates competition links from cached team lists, so the Tables screen picks up the new standings on first visit without needing to visit Fixtures first

## [0.5.13] — 2026-05-31

### Fixed
- Team search now finds Italian, French, and all other FD-covered leagues; the previous `/teams?name=` FD endpoint silently ignored the name filter and returned unrelated teams, so local matches never hit. Search now scans per-competition team lists (all 12 FD-covered competitions, already cached) and filters locally.

## [0.5.12] — 2026-05-31

### Changed
- Tables: alternating column backgrounds (even columns get a subtle tint) composing with existing row alternating and hover

## [0.5.11] — 2026-05-31

### Fixed
- Scores re-hide when the filter is changed on the Fixtures screen (both reveal-all and individually revealed scores reset)

## [0.5.10] — 2026-05-31

### Fixed
- A-League Men switched from API-Football to ESPN as the standings source (`aus.1` slug); no more APF badge on the Tables screen
- Brisbane Roar ESPN ID (5326) populated so its team card shows `· ESPN` instead of `· APF`
- Teams screen source badge now shows `· ESPN` when a team has an ESPN ID but no football-data ID

## [0.5.9] — 2026-05-31

### Fixed
- Removed stale `api_football` imports from `matches.py` and `teams.py` that would crash the backend at startup after `api_football.py` was deleted; team search now uses FD only

## [0.5.8] — 2026-05-31

### Fixed
- APF fixture and standings lookups now try 3 seasons back instead of 2; fixes split-season leagues like A-League where the 2024-25 season is keyed as 2024 in API-Football, two years behind the current calendar year

## [0.5.7] — 2026-05-31

### Fixed
- Logo wrappers changed from white to slate-200 (light grey) to reduce contrast; active tab highlight in Tables sidebar restored to bg-white/10; trophy fallback icon darkened to slate-600 for visibility on grey background; team crest pills in Fixtures also get the grey wrapper

## [0.5.6] — 2026-05-31

### Fixed
- Competition logo wrappers now use a solid white background (was white/10 — insufficient for dark-on-transparent logos like the Premier League badge)

## [0.5.5] — 2026-05-31

### Changed
- Fixtures page: competition logos in filter pills and on fixture cards now use the same light-tinted wrapper as the Tables page; competitions with no logo show a Trophy icon fallback; removed the opacity reduction on card emblems

## [0.5.4] — 2026-05-31

### Changed
- Competition logos throughout the Tables page now render inside a subtle light-tinted wrapper so dark/transparent logos are visible on the dark theme; competitions with no logo show a Trophy icon fallback

## [0.5.3] — 2026-05-31

### Changed
- Tables page: replaced accordion with a vertical tab list on desktop (competition list left, standings right) and a dropdown above the table on mobile; selection is persisted to localStorage

## [0.5.2] — 2026-05-31

### Added
- FD matches now pull events, lineups, and stats from ESPN as a fallback when FD's free tier returns none; covers all major competitions (PL, CL, La Liga, Bundesliga, Serie A, Ligue 1, etc.)
- ESPN scoreboard lookup matches by date and fuzzy team name; result is permanently cached so the supplement only runs once per match

## [0.5.1] — 2026-05-31

### Fixed
- Match event rows now align to the correct side: home events on the left, away events on the right (consistent with the score header)
- Match detail URL no longer includes the data source; source is passed via navigation state so the URL is a clean `/fixtures/:id`

## [0.5.0] — 2026-05-31

### Added
- ESPN match detail: match events (goals, cards, substitutions), lineups, and statistics now load for ESPN-sourced fixtures (AFC WC qualifying, Asian Cup, international friendlies) via the ESPN summary endpoint
- League slug stored per ESPN fixture and passed through navigation state so the correct slug is used when fetching match detail; falls back through known slugs if not available

## [0.4.13] — 2026-05-31

### Changed
- Fixture card detail button now has a subtle background and left border to visually distinguish it from the card body; added a little more right padding on the card content area

## [0.4.12] — 2026-05-31

### Changed
- Fixture cards are no longer whole-card clickable; a 30px ChevronRight button on the right edge navigates to match detail, only shown for FINISHED and LIVE matches
- Lock icon and revealed score now share a fixed height so revealing a score no longer shifts card height

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
