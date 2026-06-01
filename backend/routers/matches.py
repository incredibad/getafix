import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
import models
from auth import get_optional_user
from api import sofascore
from api import espn

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/{match_id}")
async def get_match_detail(
    match_id: int,
    source: str = Query(..., pattern="^(sofascore|espn|football_data)$"),
    league_slug: str | None = Query(None),
    _: models.User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    detail = None

    if source == "sofascore":
        detail = await sofascore.get_match_detail(match_id, db)
    elif source == "espn":
        detail = await espn.get_match_detail(int(match_id), league_slug, db)
    elif source == "football_data":
        # Legacy: try Sofascore by event ID, fall back to ESPN
        detail = await sofascore.get_match_detail(match_id, db)
        if not detail:
            detail = await espn.get_match_detail(int(match_id), league_slug, db)

    if not detail:
        raise HTTPException(status_code=404, detail="Match not found.")
    return detail
