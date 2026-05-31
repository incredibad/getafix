# Changelog

## [0.13.0] — 2026-06-01

### Changed
- App rebranded to **GetAFix**: logo added to nav sidebar (desktop + mobile drawer), login screen, and setup screen using new `AppLogo` component with Bebas Neue bold display font.
- Favicon updated to GetAFix logo on dark square background.
- App name updated throughout (page title, loading screen, API title, Docker service/container name).
- `frontend/package.json` name updated to `getafix`.
- Project folder renamed from `footrack` to `getafix`.

## [0.12.4] — 2026-06-01

### Added
- Fixtures: active filter and Mine/All selection are now persisted to localStorage and restored on next visit. Navigation via `location.state` (e.g. clicking through from Tables) still overrides the stored filter.

## [0.12.3] — 2026-06-01

### Changed
- Fixtures: when today has fixtures, the Today divider is hidden and today's date group header turns green with "Today" on the right — consistent visual language with the standalone divider. Scroll ref moves to this header so auto-scroll and the Today button target it correctly.
- Fixtures: standalone Today divider (no fixtures today) now shows "Today" label on the right side instead of centred, matching the header style.
- Fixtures: fixed today's header never turning green (was passing formatted label string to `isToday()` which expected a UTC date — now uses `category === 'today'` from `getDateCategory` instead).

## [0.12.2] — 2026-06-01

### Fixed
- Fixtures mobile: Today divider no longer scrolls behind the fixed top bar and sticky filter bar; uses `scroll-margin-top: 116px` on mobile to clear both headers.

## [0.12.1] — 2026-06-01

### Fixed
- Fixtures mobile: star icon now persists in the dropdown trigger when "All My Fixtures" is the active selection, not just when the sheet is open.

## [0.12.0] — 2026-06-01

### Added
- Fixtures: permanent "Today" divider — a green centred horizontal rule with "TODAY" label — always present in the fixture list between past and future dates. Scroll on load always targets this divider.
- Fixtures mobile sheet: star icon added to "All My Fixtures" option, matching the desktop sidebar.

## [0.11.10] — 2026-06-01

### Changed
- Fixtures: "All My Fixtures" sidebar item now has a star icon, aligned with the crest icons below it.

## [0.11.9] — 2026-06-01

### Fixed
- Fixtures: when all visible fixtures are in the past, the page now scrolls to the most recent past date (last in the list) instead of staying at the top.

## [0.11.8] — 2026-06-01

### Fixed
- Fixtures: Today button centred correctly within the fixture cards column on desktop (accounts for both the nav sidebar 224px and filter panel 250px offsets).

## [0.11.7] — 2026-06-01

### Changed
- Fixtures: Today button sits 10px from the bottom of the screen on desktop, and 10px above the mobile bottom nav bar on mobile.

## [0.11.6] — 2026-06-01

### Fixed
- Fixtures: Today button now correctly centres within the content column on desktop (Tailwind calc arbitrary value syntax fix).

## [0.11.5] — 2026-06-01

### Changed
- Fixtures: increased bottom padding so the last fixture cards sit clear of the Today button when scrolled to the bottom.

## [0.11.4] — 2026-06-01

### Fixed
- Fixtures: Today button now centres correctly in the content area on desktop (accounts for the 14rem sidebar offset).

## [0.11.3] — 2026-06-01

### Changed
- Fixtures: "All Fixtures" renamed to "All My Fixtures" everywhere (sidebar, mobile sheet, dropdown trigger).

## [0.11.2] — 2026-06-01

### Changed
- Fixtures desktop: Mine/All toggle moved to the sidebar header (global, always visible). Hidden only when a team filter is active.
- Fixtures desktop: removed refresh button.
- Tables desktop: removed refresh button.
- Fixtures desktop: removed Mine/All from the Leagues section header.

## [0.11.1] — 2026-06-01

### Changed
- Tables desktop: calendar icon in the competition heading pushed to the right edge and increased to 20px.

## [0.11.0] — 2026-06-01

### Added
- Fixtures desktop sidebar: "All Fixtures" item at the top of the filter list, in its own section above Teams. Highlighted green when no filter is active; clicking it clears any active filter.
- Fixtures mobile: tapping X on the dropdown trigger returns it to "All fixtures" state (already the default label when no filter is active).

## [0.10.9] — 2026-06-01

### Changed
- Tables desktop: removed group/stage label row above each table (still visible on mobile).
- Tables desktop: fixtures link moved from each table's header row to the selected-competition heading, now rendered as a calendar icon button matching the mobile sticky bar.

## [0.10.8] — 2026-06-01

### Removed
- FD/ESPN/APF provider badges from Teams page team cards.

## [0.10.7] — 2026-06-01

### Removed
- Provider badge (FD/ESPN/SS/APF) removed everywhere — Tables desktop heading was the last remaining instance.

## [0.10.6] — 2026-06-01

### Changed
- Tables: competition list sorted alphabetically on both desktop sidebar and mobile dropdown.

## [0.10.5] — 2026-06-01

### Changed
- Fixtures: Today button sits ~5px above the mobile bottom nav bar (72px from bottom, down from 96px).

## [0.10.4] — 2026-06-01

### Changed
- Fixtures: increased bottom padding so the Today button has more breathing room above the nav bar.
- Fixtures: Today button is slightly smaller (xs text, tighter padding).
- Fixtures: Today button now shows a chevron icon pointing in the scroll direction — up when today is above the viewport, down when below.

## [0.10.3] — 2026-06-01

### Changed
- Fixtures mobile: removed header and refresh button; layout now mirrors Tables page.
- Fixtures mobile: filter is a sticky bar below the top nav with the same dropdown style as Tables; Mine/All toggle and Show/Hide eye button sit to the right of the dropdown in the bar.
- Fixtures: "Today" floating button is now horizontally centred on screen (both mobile and desktop).
- Fixtures: fixture card background and border colours increased in opacity (~2×) for better visibility for colour-blind users (past red, today green, future blue).

## [0.10.2] — 2026-06-01

### Fixed
- Standings table: followed team names now truncate correctly instead of overflowing their column. Added `max-w-0 overflow-hidden` to the team name cell so the CSS `truncate` on the inner span is honoured by the table layout engine.

## [0.10.1] — 2026-06-01

### Changed
- Tables mobile: removed "Tables" header and refresh button; refresh remains on desktop sidebar only.
- Tables mobile: competition dropdown is now a sticky bar below the top nav — content scrolls underneath it.
- Tables mobile: season year shown next to competition name in the sticky bar trigger and in each dropdown item.
- Tables mobile: removed the selected competition heading div (name + season + source); that info is now in the sticky bar.
- Tables mobile: "Fixtures" link moved from each table header (desktop-only) to a calendar icon button in the sticky bar.

## [0.10.0] — 2026-06-01

### Added
- Mobile bottom navigation bar (Fixtures + Tables) — always visible, replaces scrolling to find those routes in the hamburger menu.
- Searchable full-screen filter sheet on mobile (replaces horizontal scroll pills): tap the filter bar, search teams or leagues by name, tap to apply. Mine/All toggle appears below when a competition is active.

### Changed
- Fixture cards: provider badge (SS/ESPN/FD) removed on both mobile and desktop.
- Fixture cards: competition column shows logo only on mobile (no text), logo + name on desktop — reclaims horizontal space.
- Mobile hamburger drawer now shows only Teams and Settings (auth items); Fixtures and Tables moved to bottom nav.
- "Today" floating button clears the mobile bottom nav bar.
- All pages have bottom padding on mobile to prevent content hiding behind the bottom nav.

## [0.9.1] — 2026-05-31

### Changed
- Fixtures History "Season" option replaced with "Calendar Year" (Jan 1 of the current year) — more universal, works for World Cup cycles, qualifiers, and non-European leagues.

## [0.9.0] — 2026-05-31

### Added
- Fixtures History setting in Settings page: choose how far back previous fixtures are shown (7d / 14d / 30d / 60d / 90d / 6 mo / 12 mo / Start of Season). Default is 30 days. "Season" dynamically computes from 1 Aug of the current or most recent season year. Stored in localStorage.

### Removed
- API Usage card from Settings (football-data.org and API-Football are no longer used).

## [0.8.8] — 2026-05-31

### Fixed
- "All" view for competitions returning empty when Sofascore's competition name differs from the DB name (e.g. "International Friendly Games" vs "International Friendlies", "World Cup Qual. AFC" vs "AFC World Cup Qualifying", FA Cup with no DB entry). The frontend now passes the Sofascore tournament ID alongside the name; the backend uses the ID for the primary lookup and falls back to name matching, and will fetch from Sofascore directly even if the competition has no DB entry.

## [0.8.7] — 2026-05-31

### Changed
- Slightly increased crest/emblem icon sizes in Fixtures and Tables filter sidebars and mobile pills without affecting row height.

## [0.8.6] — 2026-05-31

### Changed
- Removed white background containers from competition emblems in the Tables sidebar, mobile dropdown, and selected competition header. Same treatment as Fixtures filters.

## [0.8.5] — 2026-05-31

### Changed
- Removed white background containers from crests/emblems in the fixtures sidebar, mobile pills, and fixture card competition column. Images now render at full size directly on the dark background; fallback icons use a matching slate colour instead of a white box.

## [0.8.4] — 2026-05-31

### Added
- Hovering a team crest on the fixtures page shows a styled tooltip with the full team name (and country if available).

## [0.8.3] — 2026-05-31

### Changed
- Fixtures page now scrolls to the nearest future date group on load if no fixtures exist for today, rather than staying at the top.

## [0.8.2] — 2026-05-31

### Fixed
- Team crests from Sofascore were not loading because the image proxy (`/api/img`) used `httpx` for all upstream requests, which gets 403'd by Sofascore's CDN. The proxy now uses `curl-cffi` (Chrome 120 impersonation) for `sofascore.com` URLs and retains `httpx` for all others (ESPN, etc.).

## [0.8.1] — 2026-05-31

### Fixed
- Sofascore API returning 403 from within the Docker container due to Python 3.12 / OpenSSL 3.5 TLS fingerprint being blocked by Sofascore's CDN. Switched the Sofascore HTTP client from `httpx` to `curl-cffi` (Chrome 120 TLS impersonation) and pinned the Docker base image to `python:3.12-slim-bookworm` to ensure a compatible OpenSSL version.
- Cleared 263 stale ESPN/Sofascore cache entries accumulated before the fix so fresh Sofascore data is fetched on next request.

## [0.8.0] — 2026-05-31

### Changed
- **Sofascore replaces football-data.org as the primary data source** for all fixtures, standings, and match detail. ESPN is retained as a fallback when Sofascore returns nothing. FD is no longer called.
- Team search now queries Sofascore first (rich coverage, no API key); ESPN fallback only if Sofascore returns nothing
- All 50 seeded competitions now have `sofascore_tournament_id`; 47 also retain `espn_slug` as fallback
- Dynamic `sofascore_id` resolution at follow time and at first fixture fetch (same lazy pattern as ESPN IDs)
- `sofascore_id` stored on teams; `sofascore_tournament_id` on competitions (DB migrations added)
- `league_slug` added to `FixtureOut` response — Sofascore fixtures carry the tournament ID so match detail navigates directly
- Match detail (`source=sofascore`): incidents, stats, and lineups fetched from Sofascore
- Fixtures page source badge: `sofascore` → **SS**

## [0.7.1] — 2026-05-31

### Fixed
- Wrexham (and any Championship/ELC team) had no fixtures because football-data.org returns 403 on the team-level matches endpoint for ELC on the free tier; all 12 FD-covered competitions now have an ESPN slug so the dynamic fallback can find teams and serve their fixtures via ESPN
- Added ESPN→DB name mappings for all FD competition aliases (e.g. "English Premier League"→"Premier League", "Spanish LALIGA"→"La Liga", "English League Championship"→"Championship", etc.)

## [0.7.0] — 2026-05-31

### Added
- ESPN club team search: team search now queries all ESPN league team lists in parallel (cached for 7 days) so teams from MLS, Liga MX, J1 League, Scottish Premiership, etc. appear in results
- Dynamic ESPN ID resolution: `resolve_espn_id` searches all cached competition team lists first, then fetches any uncached ones in parallel — called automatically at follow time and during fixture fetching if no ESPN ID is stored
- ESPN fixtures now used for any team (not just nationals) when football-data.org has no coverage — removes the `is_national` gate
- `espn_id` flows through the full follow pipeline: search result → follow request → team record

## [0.6.5] — 2026-05-31

### Added
- FIFA Club World Cup competition (ESPN slug `fifa.cwc`)

## [0.6.4] — 2026-05-31

### Added
- 22 new competitions seeded: MLS, Liga MX, Argentine Liga Profesional, Colombian Primera A, Chilean Primera División, J1 League, Chinese Super League, Indian Super League, A-League Women, Scottish Premiership, Belgian Pro League, Turkish Süper Lig, Danish Superliga, Norwegian Eliteserien, Swedish Allsvenskan, Austrian Bundesliga, Swiss Super League, Greek Super League, Russian Premier League, Copa América, Africa Cup of Nations, UEFA Nations League, plus World Cup qualifying series for CONMEBOL/UEFA/CONCACAF/CAF
- ESPN name→DB name mappings for all new competitions
- Seed upsert now falls back to name-based lookup, preventing duplicate rows on restart for competitions with no football-data or API-Football ID

## [0.6.3] — 2026-05-31

### Fixed
- ESPN competition name map expanded to cover all mismatches found by auditing every ESPN-sourced slug: UEFA Europa League, UEFA Conference League, AFC Champions League Elite, CONMEBOL Libertadores, CONMEBOL Sudamericana, Concacaf Champions Cup, Concacaf League — all now resolve correctly to their DB entries for the "All" fixtures view and auto-linking

## [0.6.2] — 2026-05-31

### Fixed
- A-League Men "All" view now loads fixtures; ESPN returns the competition name as "Australian A-League Men" which wasn't mapped to the DB entry "A-League Men"

## [0.6.1] — 2026-05-31

### Fixed
- Fixtures: future (scheduled) fixtures were misaligned because the detail-chevron column was absent; a same-width placeholder is now always rendered so home and away teams stay in the same columns across all cards

## [0.6.0] — 2026-05-31

### Added
- Image proxy at `/api/img`: club crests and competition emblems are fetched once through the backend, cached on disk at `/data/img_cache/`, and served with `Cache-Control: public, max-age=31536000, immutable` so browsers cache them indefinitely

## [0.5.32] — 2026-05-31

### Added
- Permanent view-only mode: Fixtures, Tables, and Match Detail are now accessible without logging in
- Login button in sidebar bottom-left when unauthenticated; Teams and Settings nav items hidden until logged in
- Teams and Settings pages redirect to login if accessed without a session

### Changed
- Backend read endpoints (fixtures, competitions, standings, match detail, followed teams) now use optional auth — no token required
- API client 401 handler only redirects to login if a token was present (session expiry), not for anonymous access

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
