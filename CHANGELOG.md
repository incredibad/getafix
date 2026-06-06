# Changelog

## [0.17.30] — 2026-06-06

### Changed
- Renamed all `footrack:` localStorage keys to `getafix:` across Fixtures, Tables, Settings, Teams, App, and the sidebar resize utility.
- `backend/config.py`: database path updated to `/data/getafix.db`.
- `docker-compose.yml`: volume reference updated to `getafix_data`.

## [0.17.29] — 2026-06-06

### Fixed
- Revealed scores are now persistent across the app. BrowseTeam now reads from and writes to the same `REVEALED_IDS_KEY` localStorage store as the Fixtures page, so revealing a score in one place keeps it revealed everywhere (subject to the same persist setting).

## [0.17.28] — 2026-06-06

### Fixed
- "Scroll to Today" button now correctly centres within the fixtures column. The position accounts for both the 224px nav sidebar and the resizable filter sidebar: `calc(50% + 112 + sidebarWidth/2)`. The previous fix (`0.17.27`) omitted the nav sidebar offset.

## [0.17.27] — 2026-06-06

### Fixed
- "Scroll to Today" button on the Fixtures page now centres correctly within the fixture column. The position was hardcoded to `calc(50% + 237px)` regardless of actual sidebar width; it now uses `calc(50% + sidebarWidth/2)` dynamically.

## [0.17.26] — 2026-06-05

### Changed
- Squad nationality flags now link directly to that country's national team page. A `_get_national_team_id` helper searches Sofascore by country name (cached 30 days per country). All unique nationalities in a squad are fetched in parallel on first load.

## [0.17.25] — 2026-06-05

### Fixed
- Squad nationality flag links: SquadCard was missing `const navigate = useNavigate()`, so clicking the flag threw a silent ReferenceError and did nothing.

## [0.17.24] — 2026-06-05

### Fixed
- Squad nationality flags: switched from flagcdn.com to Sofascore category images (`/category/{id}/image`), which work through the existing img proxy with browser impersonation. Sofascore's alpha2 codes (including non-standard ones like EN for England) are resolved to category IDs via a cached map from `/sport/football/categories`.
- Browse page: clicking a nationality flag now correctly pre-fills the search query even when Browse is already mounted (useEffect on location state, not just useState initializer).

## [0.17.23] — 2026-06-05

### Fixed
- Squad nationality flags: Sofascore's country image endpoint returns 403; switched to flagcdn.com (16×12 PNG, public CDN). Bumped player cache key to v3 to force refresh.

## [0.17.22] — 2026-06-05

### Changed
- Squad list: Nationality cell now shows the country's flag (from Sofascore's country image API) alongside the name. Clicking navigates to Browse with the country name pre-searched, making it easy to find the national team.
- Browse page now accepts an `initialQuery` from route state so it can be deep-linked with a pre-filled search.

## [0.17.21] — 2026-06-05

### Changed
- Squad list: Position column now shows Sofascore's detailed position codes (DC, RW, ST, DM, etc.) instead of the generic group label (DEF/MID/FWD). Grouping sections still use the broad category.
- Squad list: Added Nationality, Height (cm), and Age columns. Height and Age are hidden on small screens (md breakpoint).

## [0.17.20] — 2026-06-05

### Changed
- Injury dates now labelled "Ret. [date]" so it's clear the date is the expected return, not the injury start.

## [0.17.19] — 2026-06-05

### Fixed
- Injuries & Suspensions: was calling a dead `/team/{id}/injuries` endpoint (404). Now reads the `injury` field embedded in each player's record from `/team/{id}/players`, which is where Sofascore actually puts it.
- Squad jersey numbers: were reading `item.shirtNumber` (always undefined) instead of `player.shirtNumber`. Corrected to read from the player sub-object.
- Both fixes share a single `/team/{id}/players` raw cache (12h TTL, key `team_players_raw:v2`) so no duplicate API calls.

## [0.17.18] — 2026-06-05

### Changed
- Browse team standings card: redesigned for symmetry — Position and Points shown as two centred equal-weight numbers with labels, followed by a uniform 5-column grid (P W D L GD) with consistent value-over-label layout.

## [0.17.17] — 2026-06-05

### Fixed
- League crest links now work for ESPN-sourced fixtures: the enrichment step looks up the DB competition record and injects the Sofascore tournament ID + emblem, so clicking a competition emblem navigates correctly regardless of data source.
- Browse team standings card: position/pts/W-D-L are now hidden behind a spoiler lock (like Season Stats and Form); the competition name link remains visible so users can still navigate to the table. "Standing" added to the global eye toggle.

## [0.17.16] — 2026-06-05

### Changed
- Competition/league crests are now clickable everywhere they appear: fixture cards (across all pages), match detail header, and the BrowseLeague header — all navigate to the league browse page.
- Opponent rows in the Browse team "Recent Form" card are now clickable (crest + name), navigating to that team's browse page.
- Team crests were already linked via TeamCrest component in fixture cards; no regressions introduced.

## [0.17.15] — 2026-06-05

### Changed
- Browse league search results now sorted by Sofascore `userCount` (follower count) descending — LaLiga appears before amateur Spanish leagues. Same ordering applied within each country group in the All Tables sidebar.
- Backend: `userCount` stored in the all-competitions cache (cache key bumped to `v2` to force refresh).

## [0.17.14] — 2026-06-05

### Fixed
- Browse search bar: removed green focus outline on the input field; increased padding for breathing room.
- Browse league results: slug-derived official name shown as a dim hint (e.g. "· Brasileirao Serie A") when it differs from the commercial/sponsor display name, making it clear the two names refer to the same competition.
- Standings backend: `competition.name` is now populated with the current season's official name (e.g. "Brasileiro Serie A 2026") instead of empty string, so it shows consistently in standings cards and table headers.

## [0.17.13] — 2026-06-05

### Fixed
- Browse team spoilers: each section (Season Stats, Recent Form, fixtures) now has an independent reveal; clicking one lock no longer blows open all sections. Global eye toggle still reveals/hides everything at once.

### Added
- Browse team header: national teams now show "FIFA ranking #N" in place of the country/league subtitle.
- Browse team header: Sofascore link button opens the team's page on sofascore.com in a new tab.

## [0.17.12] — 2026-06-05

### Changed
- Browse team standings card: competition name is now a tappable link that opens the Tables page on the "All Tables" tab with that competition pre-selected.
- Browse team standings card: last-match date shown as subtitle so users know how stale the standings are; GD moved inline with position/pts; layout tightened.

## [0.17.11] — 2026-06-05

### Fixed
- Browse team page: increase fixture history window from 90 to 400 days so national teams with long qualifying cycles (e.g. Australia's WC Qual. AFC, ~359 days ago) are correctly identified as the base competition rather than falling back to an upcoming tournament with 0 games played.

## [0.17.10] — 2026-06-05

### Changed
- Browse team standings algorithm: always show the most recently played competitive competition as the baseline, and supplement with any competition that has a match within 7 days. The two-week cutoff is removed — the WC (or any tournament) only appears once it's within a week, regardless of how far in the past the current league season is.

## [0.17.9] — 2026-06-05

### Fixed
- Browse team page: standings were not showing for teams whose most recent or next match is a friendly/exhibition (e.g. Austria, Australia). Two fixes: (1) friendly competitions are excluded from the standings selection algorithm by name pattern; (2) the "imminent" window widened from 7 to 14 days so teams with a competitive match 8–14 days away (e.g. upcoming World Cup groups) are correctly selected.

## [0.17.8] — 2026-06-05

### Changed
- Browse team page: standings selection algorithm replaced. Old approach counted fixture appearances (arbitrary tie-breaking). New approach:
  1. If any competition has a match within 7 days, show standings for all such competitions.
  2. Otherwise, show the competition(s) with the most recently played match (any that played within 24h of the most recent).
  3. Fallback: if no finished matches, show the soonest upcoming competition.
- Multiple standing cards are shown simultaneously when a team is active in more than one competition at the same time.

## [0.17.7] — 2026-06-05

### Fixed
- Browse team page: League Standing card was showing "League" as the competition title. The standings API endpoint returns an empty name; the fix enriches the response with the competition name and emblem sourced from the already-loaded fixture data.

## [0.17.6] — 2026-06-05

### Added
- Browse team page: Injuries & Suspensions card in left column (red/yellow severity dot, player name, type, expected return date). Shows "No injuries reported" when clean.

### Changed
- Recent Form moved to right 2 columns above Upcoming Fixtures.
- Recent Form now shows opponent crest, name, H/A indicator, and score for each of the last 5 results — not just W/D/L pills.

## [0.17.5] — 2026-06-05

### Changed
- Browse team page: Club Info, League Standing, Recent Form, and Season Stats each occupy one column in a 2-column sub-grid within the left half. Squad spans both sub-columns below them.

## [0.17.4] — 2026-06-05

### Changed
- Browse team page layout: stat boxes (Club Info, Standing, Form, Season Stats, Squad) occupy the left 2 columns; Upcoming and Recent Results occupy the right 2 columns stacked.
- Upcoming and Recent Results each show 3 fixtures initially with an expand arrow to reveal the rest.
- League Standing card now shows competition emblem and name prominently so it's clear which league is being shown.
- Season Stats card now lists the competitions the stats are drawn from beneath the title.
- Transfers moved to full width at the bottom.

## [0.17.3] — 2026-06-05

### Changed
- Browse team page layout redesigned to a 4-column desktop grid.
  - Row 1: Header (full width).
  - Row 2: Upcoming fixtures (2 col) | Club Info + Standing (1 col) | Form + Season Stats (1 col).
  - Row 3: Recent Results (2 col) | Squad table (2 col).
  - Row 4: Transfers full width with arrivals/departures side by side.
- Squad is now a proper table with #, Name, Position badge, and Country columns grouped by position.
- Form pills now stretch evenly across the full card width.
- Season stats is now a two-column label/value table instead of an isolated number grid.
- Standing card shows position prominently with a compact P/W/D/L row beneath.

## [0.17.2] — 2026-06-05

### Added
- Browse team page now shows Club Info (manager, stadium, founded year), Squad grouped by position, Transfers (arrivals/departures), and Season Stats (goals, conceded, clean sheets, W/D/L) alongside the existing fixtures, standing, and form cards.
- Season stats and form are spoiler-protected when spoiler mode is on.

## [0.17.1] — 2026-06-05

### Fixed
- Standings table rows were not clickable for cached data (fetched before `sofascore_id` was added to the schema). Now falls back to extracting the team ID from the crest URL pattern (`/team/{id}/image`), so all Sofascore-sourced rows are always navigable without requiring a cache flush.

## [0.17.0] — 2026-06-05

### Added
- Browse section: search any team or league not in your followed list.
  - Landing page (`/browse`) with debounced team search (Sofascore API) and instant client-side league search, results in segregated Teams / Leagues sections.
  - Team page (`/browse/team/:id`) — mosaic grid: header with Follow/Unfollow + "My Fixtures" shortcut for followed teams; upcoming fixtures card; league standing card; recent form (spoiler-protected); recent results card.
  - League page (`/browse/league/:id`) — Fixtures tab (default, spoiler-protected) and Table tab with clickable team rows.
- Browse added as a top-level nav item (Compass icon) alongside Fixtures and Tables.
- Settings moved to the bottom of the nav column (above Sign out).
- Teams renamed to My Teams in the nav.
- Team crests in fixture cards now navigate to the team's Browse page when clicked.
- Team names/crests in match detail header now navigate to Browse.
- All standings table rows (not just followed teams) now navigate to Browse when clicked.

### Changed
- Extracted `FixtureCard`, `TeamCrest`, `RoundSeparator`, `DATE_CAT_STYLE` to shared `components/FixtureCard.jsx` — used by Fixtures, BrowseTeam, and BrowseLeague.
- `StandingEntry` schema now includes `sofascore_id` for table row navigation.
- Team search endpoint (`/api/teams/search`) now works without authentication.

## [0.16.24] — 2026-06-05

### Fixed
- Sidebar Mine/All tabs now fill the full row width when spoiler mode is off and the reveal button is absent. Previously the empty button container left a dead space on the right.

## [0.16.23] — 2026-06-05

### Fixed
- Per-day reveal button now has a solid page-background fill (`var(--bg)`) so the divider line stops cleanly on each side rather than cutting through it.

## [0.16.22] — 2026-06-05

### Changed
- Per-day reveal button is now absolutely positioned at the horizontal centre of the content column (above the score cell), rather than inline with the date label.
- Per-day reveal state now persists across page navigation using the same TTL settings as individual score reveals (`footrack:fixtures:revealed_days`). Cleared when the global hide is triggered or the filter changes.

## [0.16.21] — 2026-06-05

### Added
- Per-day reveal toggle in date group headers: when spoiler mode is on and a day has 4+ fixtures, an Eye/EyeOff button appears centred in the divider line to reveal/hide all scores for that day at once.

### Changed
- Reveal/hide icons now reflect current state (Eye = scores visible, EyeOff = scores hidden) rather than intended action, on both the global toggle and the new per-day toggles.
- Global reveal button now has a coloured background: green tint when scores are showing, red tint when hidden.
- Global hide clears all per-day and per-filter reveals. Filter changes also reset reveal state.

## [0.16.20] — 2026-06-04

### Fixed
- Sidebar resize cursor was invisible because child buttons override parent cursor. Added `[&_*]:!cursor-col-resize` to force col-resize on all descendants when near the edge, so the 16px grab zone is now visually obvious.

## [0.16.19] — 2026-06-04

### Changed
- Sidebar resize grab zone widened from 6px to 16px, making it much easier to grab the edge to resize.

## [0.16.18] — 2026-06-04

### Reverted
- Removed ExpandableSidebarItem hover overlay from Fixtures and Tables sidebars. Replaced with plain truncated buttons with native title tooltips. The position:fixed overlay caused unresolvable scroll interference in Firefox.

## [0.16.17] — 2026-06-04

### Fixed
- Fixtures & Tables: filter overlay kept re-attaching to cursor while scrolling. When the wheel handler called setRect(null) to hide the overlay, onMouseEnter immediately fired on the button (now under the cursor), re-showing the overlay and re-entering the same loop. Added a suppressShow ref flag that blocks show() for 300ms after scroll starts so the button's mouseenter is ignored until the user has stopped scrolling.

## [0.16.16] — 2026-06-04

### Fixed
- Fixtures & Tables: sidebar scroll still blocked while hovering a filter item. Portalled overlay now forwards wheel events to the sidebar scroll container via a non-passive native listener, and immediately hides itself on scroll so the detached overlay doesn't appear to drag while items scroll beneath it.

## [0.16.15] — 2026-06-04

### Fixed
- Fixtures & Tables: sidebar scroll broke after hovering any item. A `position:fixed` element rendered as a DOM child of an `overflow:auto` scroll container causes Firefox to promote the container to a compositing layer and stop delivering wheel events to it. Fixed by rendering the hover overlay via `createPortal` into `document.body` so it is never a DOM descendant of the scroll container.

## [0.16.14] — 2026-06-04

### Fixed
- Fixtures, Tables, Settings: reverted flex layout restructure (caused mobile scroll regression) and replaced all sidebar/tab scroll containers with `position:absolute; inset:0; overflow-y:auto` inside a `flex-1 relative` wrapper. Absolute children have no height in normal flow so the parent's `min-height:auto` is effectively 0, the flex algorithm assigns the correct remaining height, and the absolute child fills it exactly — independent of any flex height chain or browser quirk.
- Added `h-screen` to sidebar outer divs so their height is set directly from the viewport, removing the dependency on `h-full` resolving through ancestor flex/overflow contexts.
- Changed `scrollIntoView` for the "today" marker from `behavior:smooth` to instant — a smooth scroll animation can temporarily block user scroll input in Firefox.

## [0.16.13] — 2026-06-04

### Fixed
- Fixtures, Tables, Settings: sidebar (and settings tab content) scroll containers never actually scrolled in any browser. Root cause: flex children have `min-height: auto` by default, which lets them expand past their allocated space regardless of `overflow-y: auto`. Added `min-h-0` to all four `flex-1 overflow-y-auto` scroll containers so flex can properly constrain their height.

## [0.16.12] — 2026-06-04

### Fixed
- Fixtures & Tables: sidebar scroll permanently broken in Firefox. Root cause: Firefox does not resolve `height: 100%` (`h-full`) on a child of an `overflow-y: auto` flex item, so the sidebar's outer div had no height constraint, its inner `overflow-y: auto` scroll container grew to fit content (`scrollHeight === clientHeight`), and nothing was scrollable. Fixed by restructuring the layout: `main` is now `flex flex-col overflow-hidden` (no longer `overflow-y: auto`); Fixtures, Tables, and Settings fill it with `flex-1 min-h-0`; Teams and MatchDetail add `flex-1 overflow-y-auto` on their own content wrappers.

## [0.16.11] — 2026-06-04

### Fixed
- Fixtures & Tables: sidebar trackpad scroll stopped working ~2s after page load. Root cause: `overflow: hidden` on the outer sidebar div creates a CSS scroll container. `scrollIntoView` (called after load to centre the active filter) set `scrollTop` on it; subsequent trackpad scroll that hit the inner div's boundary chained to the outer div, which absorbed the input invisibly. Changed to `overflow: clip` — same visual clipping, but `clip` is not a scroll container so scroll events cannot chain into it.

## [0.16.10] — 2026-06-04

### Fixed
- Fixtures & Tables: sidebar scrollbar was still blocked after the drag-handle removal. The `onMouseDown` handler was calling `e.preventDefault()` near the right edge, which cancelled native scrollbar interactions (the scrollbar lives at the same right-edge zone). Removed `preventDefault` — `userSelect: none` on `document.body` already prevents text selection during resize drags.

## [0.16.9] — 2026-06-04

### Fixed
- Fixtures & Tables: sidebar scroll was blocked by the drag handle div sitting over the scrollbar. Replaced the absolutely-positioned drag handle with edge-proximity detection on the sidebar container itself — cursor changes to col-resize within 6px of the right border, click-and-drag there resizes. No element blocks scroll events.

## [0.16.8] — 2026-06-04

### Changed
- Fixtures & Tables: sidebar filter items now expand on hover to show the full name inline, overflowing the sidebar bounds to the right. The expanded button has a solid background, rounded corners, and a drop shadow and is fully clickable.

## [0.16.7] — 2026-06-04

### Added
- Fixtures & Tables: desktop filter sidebar is now resizable by dragging the right border (200–500px). Width persists across sessions via localStorage.
- Fixtures & Tables: filter items show a tooltip with the full name on hover, useful when text is truncated.

## [0.16.6] — 2026-06-04

### Changed
- Tables (All Tables): country/region headings are now accordion toggles. All groups load collapsed; the group containing the currently selected competition is pre-expanded. Groups auto-expand when a search query is active.

## [0.16.5] — 2026-06-04

### Fixed
- Fixtures: competition and team schedule fixture fetching now paginates until Sofascore returns a 404, ensuring all scheduled future fixtures are included regardless of how many there are (e.g. World Cup with 104 fixtures across 4 pages).
- Fixtures: future window increased from 90 to 365 days so fixtures scheduled far in advance are always visible.

## [0.16.4] — 2026-06-04

### Fixed
- Fixtures: Mine/All tabs are now always visible in the desktop sidebar. They are greyed out with Mine appearing selected when no filter or a team filter is active, and only become interactive when a competition filter is selected.

## [0.16.3] — 2026-06-04

### Changed
- Settings: "Each session" renamed to "Current view only" with a context-specific description explaining that revealed scores are forgotten as soon as you navigate away from the fixtures screen.

## [0.16.2] — 2026-06-04

### Changed
- Settings: each tab now uses a 2-column mosaic layout on desktop (columns flow left-to-right, cards never split mid-content). Single column on mobile.

## [0.16.1] — 2026-06-04

### Changed
- Settings: reorganised into three tabs — General (Fixture History, Spoilers), System (Cache, About), Account (account info, Change Password).
- Settings → System: new About section shows the installed version and a link to the GitHub repo.

## [0.16.0] — 2026-06-04

### Added
- Settings: new Spoilers card with three controls:
  - **Spoilers Mode** — hide scores and match events by default (on by default). Toggling resets all saved revealed fixtures.
  - **Keep revealed scores** — once a score is revealed it stays visible permanently across sessions (on by default). Turning off exposes a duration select.
  - **Hide again after** — visible when Keep revealed is off; options are Each session, 1 week, 1 month, 6 months.
- Fixtures: individually revealed scores are now persisted to localStorage and restored on page load, respecting the reveal duration setting. Reveal All remains session-only. When Spoilers Mode is off, all scores are always visible and the eye button is hidden.

## [0.15.11] — 2026-06-04

### Changed
- Match detail: scores and events now open revealed or hidden based on whether the score was revealed on the fixtures screen before navigating. Refreshing the fixtures page resets reveal state, so the match detail will also open hidden.

## [0.15.10] — 2026-06-04

### Changed
- Fixtures: round name now appears on the right end of the date header line (e.g. "Saturday 5 July ─── QUARTERFINALS"). When it's today, round name sits just left of the TODAY label.

## [0.15.9] — 2026-06-04

### Changed
- Fixtures: round name now appears inline in the date header (e.g. "Saturday 5 July — QUARTERFINALS ———") rather than as a separate separator. A separator still appears mid-group if the round changes within the same date.

## [0.15.8] — 2026-06-04

### Fixed
- Fixtures: "All" competition view now respects the same days_back setting as My Fixtures instead of a fixed window.

## [0.15.7] — 2026-06-04

### Fixed
- Fixtures: "All" view for competitions now uses a ±365-day window instead of 60 days back / 120 days forward. This fixes competitions like the FIFA Club World Cup (played ~11 months ago) showing no fixtures in the All view.
- Fixtures: `round_name` was not being passed through `_to_schema`, so round separators were missing from the by-competition endpoint response.

## [0.15.6] — 2026-06-04

### Changed
- Fixtures: desktop sidebar now scrolls instantly to the active filter (team or competition) when the page loads.
- Tables: desktop sidebar now scrolls instantly to the selected competition (My Tables and All Tables) when the list finishes loading.

## [0.15.5] — 2026-06-04

### Added
- Fixtures: round separators now appear within date groups when the round changes. Named cup rounds show as "Round of 16", "Quarterfinals" etc; league matchdays show as "Round 12" etc.

## [0.15.4] — 2026-06-04

### Changed
- Fixtures: Mine/All toggle in the desktop sidebar now uses the same tab style as the Tables page (underline indicator, full-width). Score reveal button sits in a fixed-width square on the right.

## [0.15.3] — 2026-06-04

### Fixed
- Tables: competition logos that fail to load (no image on Sofascore) now fall back to a Trophy icon instead of showing a broken/blank box.

## [0.15.2] — 2026-06-04

### Changed
- Fixtures: removed "Fixtures" heading from the desktop sidebar header; Mine/All toggle and score reveal button now occupy the full header area.

## [0.15.1] — 2026-06-04

### Fixed
- Tables: group/stage label now appears above each standings table on all screen sizes (was desktop-hidden).

## [0.15.0] — 2026-06-04

### Added
- Tables: "All Tables" tab lets you browse standings for any Sofascore competition worldwide, not just leagues your followed teams are in. The full competition index (~271 countries/regions) is fetched lazily on first visit and cached for 30 days. Search by league name or country name. Selecting a competition with no standings shows a fallback button to view its fixtures instead. Both desktop (sidebar) and mobile (full-screen picker overlay) are supported.

## [0.14.24] — 2026-06-04

### Fixed
- Tables: competition logo icons in the left-column filter sidebar are now the same size as the Fixtures filter sidebar icons (24×24px, Trophy size 18).

## [0.14.23] — 2026-06-03

### Fixed
- Tables: competition logo icons in the left-column filter sidebar no longer have a white/light background. Now styled consistently with the Fixtures filter sidebar.

## [0.14.22] — 2026-06-03

### Fixed
- Fixtures: history filters longer than ~6 months (1 year, Cal. year) now actually fetch enough data. Sofascore returns 30 events per page; previously only page 0 was fetched (~Nov 2025 to present). Now pages 0, 1, and 2 are fetched in parallel on cache miss, covering ~18 months of history. Existing team schedule caches (page 0 only) are automatically cleared on deploy.

## [0.14.21] — 2026-06-02

### Fixed
- Fixtures: national team (country) crest tooltips no longer show a redundant country line beneath the team name.

### Changed
- Settings: removed API Usage card.
- Settings: fixture history options now include 7 days, 14 days, 30 days, and 60 days ahead of the existing month/year options.

## [0.14.20] — 2026-06-02

### Fixed
- Fixtures: national teams (countries) no longer show a domestic league in the crest tooltip. The `national` flag from Sofascore's event data is now passed through the enrichment pipeline and used to skip the league lookup entirely.

## [0.14.19] — 2026-06-02

### Changed
- Fixtures: `primaryUniqueTournament` cache TTL changed from 7 days to 30 days. This covers the ~2-month off-season window (where promotion/relegation takes effect) with 2 refreshes rather than 8. Failed lookups are no longer cached so transient errors self-heal on the next request.

## [0.14.18] — 2026-06-02

### Changed
- Fixtures: crest tooltips now show each team's domestic league for all teams (not just followed ones). For teams in the DB, their linked `competition_type=league` entry is used (country-matched). For Sofascore teams not in the DB, the `primaryUniqueTournament` is fetched from the Sofascore team API and cached for 7 days. The league is shown only when it differs from the current fixture's competition — e.g. PSG in a CL game shows "Ligue 1", but in a Ligue 1 game it's hidden.

## [0.14.17] — 2026-06-02

### Changed
- Fixtures: crest tooltips now show each team's domestic league instead of the fixture's competition. The league is looked up from the team's linked competitions in the DB (country-matched where possible) and shown only when it differs from the current fixture's competition — so a PSG tooltip in a CL game shows "Ligue 1", but in a Ligue 1 game it's hidden as redundant. National teams show no league.

## [0.14.16] — 2026-06-01

### Fixed
- Fixtures: country now actually appears in crest tooltips — `country` was missing from `TeamRef` schema and from Sofascore fixture team dicts. Both fixed. ESPN fixtures will show no country (not available in ESPN event responses).

## [0.14.15] — 2026-06-01

### Added
- Fixtures: team crest tooltips now show country. League/competition is also shown unless the active filter is already a comp filter (where it would be redundant).

## [0.14.14] — 2026-06-01

### Fixed
- Fixtures: team crest tooltips no longer clipped — removed `overflow-hidden` from the card and moved border-radius to the first/last grid cells instead.

## [0.14.13] — 2026-06-01

### Changed
- Settings: fixture history options are now 3 months, 6 months, 1 year, and Calendar year. Calendar year dynamically calculates days since Jan 1 of the current year.

## [0.14.12] — 2026-06-01

### Changed
- Fixtures: Today divider line weight reduced from 4px back to 2px.

## [0.14.11] — 2026-06-01

### Changed
- Fixtures: "TODAY" label font size increased from 11px to `text-sm` (14px) to match the date text.

## [0.14.10] — 2026-06-01

### Fixed
- Fixtures: Today divider line now full opacity `rgb(74,222,128)` to exactly match the Today text colour.

## [0.14.9] — 2026-06-01

### Fixed
- Fixtures: Today divider line colour changed from green-500 (dimmed) to green-400 at 50% opacity, matching the Today text colour.

## [0.14.8] — 2026-06-01

### Changed
- Fixtures: Today divider lines increased to 4px (`h-1`).

## [0.14.7] — 2026-06-01

### Changed
- Fixtures: Today divider lines (both standalone and date group header) thickened from 1px to 2px (`h-0.5`). Non-today date headers remain 1px.

## [0.14.6] — 2026-06-01

### Fixed
- Fixtures: score now truly centred on the card — both outer grid columns (competition and chevron) made equal width (2.5rem mobile, 9rem desktop) so the home/score/away section is symmetric.

## [0.14.5] — 2026-06-01

### Changed
- Fixtures: replaced absolute-positioned score with CSS Grid layout. Score is its own grid cell between home and away — no overlap, no float, score centred between the two teams. Grid defined in index.css to avoid Tailwind arbitrary-value compilation issues.

## [0.14.4] — 2026-06-01

### Fixed
- Fixtures: use standard Tailwind scale values for home/away padding (pr-28/pl-2.5) — arbitrary px values were silently dropped by Tailwind's JIT scanner even with safelist.

## [0.14.3] — 2026-06-01

### Fixed
- Fixtures: correct asymmetric padding for home/away sections around the absolutely-centred score. The col2 midpoint sits 54px right of card centre on desktop (col1=144px vs chevron=36px), so home needs pr-[118px] and away only pl-[10px] to keep both teams the same visual distance from the score.

## [0.14.2] — 2026-06-01

### Fixed
- Tables: team names were invisible due to accidental `maxWidth: 0` inline style on the name span.
- competitions router: removed dead `football_data` import that crashed startup after API key removal.

## [0.14.1] — 2026-06-01

### Fixed
- Settings: added missing `getDaysBack` export (Fixtures crashed on import); replaced football-data/API-Football usage stats with Sofascore/ESPN; added "Fixture History" card to configure days-back (30/60/90/180).
- Tables: use `imgUrl()` for all images; remove refresh button and source badge; mobile competition selector is now a sticky bar below the top nav with season year and calendar icon; group/stage label hidden on desktop; calendar icon added to desktop competition heading.
- Teams: use `imgUrl()` for crests; include `sofascore_id` and `espn_id` in follow payload; match on those IDs in `isFollowed`; remove provider badge from team cards.
- MatchDetail: use `imgUrl()` for competition emblem and team crests.

## [0.14.0] — 2026-06-01

### Changed
- Sofascore is now the primary data source; ESPN is the fallback. football-data.org is fully retired.
- `football_data_api_key` removed from config and `.env.example`; `FD_COMPETITIONS` dict removed from config.
- `curl-cffi>=0.7.0` added to requirements for Sofascore Chrome-TLS impersonation.
- All backend routers, models, schemas, and seed data updated for Sofascore/ESPN-only operation.

## [0.13.4] — 2026-06-01

### Fixed
- Fixtures: score/time is now truly horizontally centred on the card. Previously centred within the asymmetric `flex-1` middle column; now positioned absolutely at `left: 50%` of the full card width.

### Added
- `docker-compose.yml`: uses `incredibad/getafix:latest`, mounts existing `footrack_data` volume, loads secrets via `env_file`.
- `.github/workflows/docker-publish.yml`: auto-builds and pushes to Docker Hub on push to `dev` (tagged `dev`) or `main` (tagged `latest`).
- `.gitignore`: excludes `.env`, `frontend/node_modules/`, `frontend/dist/`, `__pycache__/`, `.claude/settings.local.json`, `HANDOVER.md`.
- `.env.example`: documents all required environment variables.

## [0.13.3] — 2026-06-01

### Fixed
- Favicon: embedded PNG data inline so it renders in all browsers (external href reference was silently ignored in favicon context); logo now appears white via CSS brightness/invert filter on `#0d0d14` background.

## [0.13.2] — 2026-06-01

### Fixed
- AppLogo: wordmark offset increased to 10px; letter-spacing increased to 0.12em.

## [0.13.1] — 2026-06-01

### Fixed
- AppLogo: "GETAFIX" wordmark shifted down 5px to visually centre against the flask shape.

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
