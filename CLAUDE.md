# Claude Code Instructions

## Versioning

**Always bump the version in `frontend/package.json` before every commit.** (The backend is Python and has no `package.json` — the single source of version truth is the frontend package.)

- Bug fixes and visual/UI changes → patch bump (1.x.**Y**)
- New features or behaviour changes → minor bump (1.**Y**.0)

This is non-negotiable — no commit should go out without a version increment in `frontend/package.json`.

## Changelog

**Always update `CHANGELOG.md` before every commit.** Add an entry under the correct version heading (create one if it doesn't exist, using the format `## [x.y.z] — YYYY-MM-DD`) that describes the change concisely. Use `### Added`, `### Changed`, or `### Fixed` sub-sections to match the existing style.

This is non-negotiable — no commit should go out without a changelog entry.

## Pushing

**Do not push proactively.** Only push to the remote repository when the user explicitly asks you to.

## Troubleshooting

**When the user reports a bug or error, ask targeted questions before analysing code.** Don't spend time reading through files and speculating about root causes when a single question would narrow it down in seconds.

## Branching workflow

- **`dev`** is the active development branch. All commits go here.
- **`main`** is stable and release-tagged. Only merge `dev` → `main` when the user confirms changes are tested and ready to ship.
- When the user asks to "push changes", push to `dev`.
- When the user asks to cut a release, merge `dev` into `main`, push `main`, then tag the release.

## Architecture notes

- Port: **7285**
- Data volume: `footrack_data` mounted at `/data`
- Database: SQLite at `/data/footrack.db`
- Log: rotating file at `/data/app.log` (2 MB, 2 backups)
- Backend: Python 3.12 / FastAPI / SQLAlchemy / uvicorn
- Frontend: React 18 / Vite / Tailwind CSS / Lucide icons
- Container: single container, uvicorn serves both API and built static files

## API sources

- **football-data.org** (primary): covers PL, PD, BL1, SA, FL1, CL, DED, PPL, ELC, BSA, WC, EC
- **API-Football** (secondary): everything else; hard daily limit of 100 req/day — cache aggressively

## Timezone

All times display in **AEST (UTC+10, Brisbane, no DST)**.
