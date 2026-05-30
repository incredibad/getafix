from contextlib import asynccontextmanager
import logging
import logging.handlers
from datetime import datetime
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse

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
    _cols = {row[1] for row in _conn.execute(text("PRAGMA table_info(teams)"))}
    if "espn_id" not in _cols:
        _conn.execute(text("ALTER TABLE teams ADD COLUMN espn_id INTEGER"))
        _conn.commit()

seed_competitions()


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="Footrack API",
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
        return HTMLResponse("<h1>Footrack frontend not built.</h1>", status_code=503)
else:
    @app.get("/", include_in_schema=False)
    async def root():
        return HTMLResponse("<h1>Footrack</h1><p>Frontend not built yet.</p>")
