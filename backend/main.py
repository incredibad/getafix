from contextlib import asynccontextmanager
import asyncio
import hashlib
import logging
import logging.handlers
from datetime import datetime
from pathlib import Path
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse, Response

_LOG_FILE = Path("/data/app.log")
_LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
_file_handler = logging.handlers.RotatingFileHandler(
    _LOG_FILE, maxBytes=2 * 1024 * 1024, backupCount=2, encoding="utf-8"
)
_file_handler.setFormatter(logging.Formatter("%(asctime)s [%(name)s] %(levelname)s: %(message)s"))
logging.getLogger().addHandler(_file_handler)
logging.getLogger().setLevel(logging.INFO)

from sqlalchemy import text
from database import Base, engine
import models
from routers import auth, teams, fixtures, standings, matches, competitions, admin
from seed import seed_competitions

Base.metadata.create_all(bind=engine)

# Column migrations for existing databases
with engine.connect() as _conn:
    _team_cols = {row[1] for row in _conn.execute(text("PRAGMA table_info(teams)"))}
    if "espn_id" not in _team_cols:
        _conn.execute(text("ALTER TABLE teams ADD COLUMN espn_id INTEGER"))
        _conn.commit()
    if "sofascore_id" not in _team_cols:
        _conn.execute(text("ALTER TABLE teams ADD COLUMN sofascore_id INTEGER"))
        _conn.commit()
    if "espn_id_confirmed" not in _team_cols:
        _conn.execute(text("ALTER TABLE teams ADD COLUMN espn_id_confirmed BOOLEAN NOT NULL DEFAULT 0"))
        _conn.commit()
    if "sofascore_id_confirmed" not in _team_cols:
        _conn.execute(text("ALTER TABLE teams ADD COLUMN sofascore_id_confirmed BOOLEAN NOT NULL DEFAULT 0"))
        _conn.commit()
        # Existing sofascore_ids were set via user search — treat as already confirmed
        _conn.execute(text("UPDATE teams SET sofascore_id_confirmed = 1 WHERE sofascore_id IS NOT NULL"))
        _conn.commit()
    _comp_cols = {row[1] for row in _conn.execute(text("PRAGMA table_info(competitions)"))}
    if "espn_slug" not in _comp_cols:
        _conn.execute(text("ALTER TABLE competitions ADD COLUMN espn_slug VARCHAR"))
        _conn.commit()
    if "sofascore_tournament_id" not in _comp_cols:
        _conn.execute(text("ALTER TABLE competitions ADD COLUMN sofascore_tournament_id INTEGER"))
        _conn.commit()

seed_competitions()


logger = logging.getLogger(__name__)

_COMP_CACHE_KEY = "sofascore:all_competitions:v2"
_COMP_REFRESH_DAYS = 25   # refresh before the 30-day TTL expires
_COMP_CHECK_HOURS = 6     # how often the loop wakes up to check


async def _competitions_refresh_loop():
    from database import SessionLocal
    from api import sofascore
    import models

    while True:
        try:
            db = SessionLocal()
            try:
                entry = db.query(models.ApiCache).filter(
                    models.ApiCache.cache_key == _COMP_CACHE_KEY
                ).first()
                needs_refresh = (
                    entry is None or
                    (datetime.utcnow() - entry.cached_at).total_seconds() > _COMP_REFRESH_DAYS * 86400
                )
                if needs_refresh:
                    if entry:
                        db.delete(entry)
                        db.commit()
                    await sofascore.get_all_competitions(db)
                    logger.info("Competition catalogue refreshed in background")
            finally:
                db.close()
        except Exception as exc:
            logger.error(f"Background competition refresh failed: {exc}")

        await asyncio.sleep(_COMP_CHECK_HOURS * 3600)


@asynccontextmanager
async def lifespan(app: FastAPI):
    asyncio.create_task(_competitions_refresh_loop())
    yield


app = FastAPI(
    title="GetAFix API",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,         prefix="/api/auth",         tags=["auth"])
app.include_router(teams.router,        prefix="/api/teams",        tags=["teams"])
app.include_router(fixtures.router,     prefix="/api/fixtures",     tags=["fixtures"])
app.include_router(standings.router,    prefix="/api/standings",    tags=["standings"])
app.include_router(matches.router,      prefix="/api/matches",      tags=["matches"])
app.include_router(competitions.router, prefix="/api/competitions", tags=["competitions"])
app.include_router(admin.router,        prefix="/api/admin",        tags=["admin"])


_IMG_CACHE_DIR = Path("/data/img_cache")
_IMG_EXT = {
    "image/svg+xml": ".svg",
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/x-icon": ".ico",
}
_EXT_CT = {v.lstrip("."): k for k, v in _IMG_EXT.items()}


@app.get("/api/img", include_in_schema=False)
async def proxy_img(url: str = Query(...)):
    _IMG_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    key = hashlib.sha256(url.encode()).hexdigest()
    for cached in _IMG_CACHE_DIR.glob(f"{key}.*"):
        ct = _EXT_CT.get(cached.suffix.lstrip("."), "application/octet-stream")
        return Response(
            content=cached.read_bytes(),
            media_type=ct,
            headers={"Cache-Control": "public, max-age=31536000, immutable"},
        )
    try:
        from http_client import get_bytes, HTTPError
        content, ct_header = await get_bytes(url)
    except HTTPError as exc:
        raise HTTPException(status_code=exc.status_code, detail="Upstream error") from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Failed to fetch image") from exc
    ct = ct_header.split(";")[0].strip()
    ext = _IMG_EXT.get(ct, ".bin")
    (_IMG_CACHE_DIR / f"{key}{ext}").write_bytes(content)
    return Response(
        content=content,
        media_type=ct,
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )


@app.get("/api/logs")
async def get_logs():
    if not _LOG_FILE.exists():
        return {"lines": []}
    lines = _LOG_FILE.read_text(encoding="utf-8", errors="replace").splitlines()
    return {"lines": lines[-500:]}


# ── Static Frontend ───────────────────────────────────────────────────────────
static_dir = Path("/app/static")
dev_static = Path(__file__).parent / "static"
serving_dir = static_dir if static_dir.exists() else (dev_static if dev_static.exists() else None)

if serving_dir:
    assets_dir = serving_dir / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        candidate = serving_dir / full_path
        if candidate.exists() and candidate.is_file():
            return FileResponse(str(candidate))
        index = serving_dir / "index.html"
        if index.exists():
            return FileResponse(str(index))
        return HTMLResponse("<h1>GetAFix frontend not built.</h1>", status_code=503)
else:
    @app.get("/", include_in_schema=False)
    async def root():
        return HTMLResponse("<h1>GetAFix</h1><p>Frontend not built yet.</p>")
