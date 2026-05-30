import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
import models
from auth import get_current_user
from api import football_data as fd
from api import api_football as apf

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/{match_id}")
async def get_match_detail(
    match_id: int,
    source: str = Query(..., regex="^(football_data|api_football)$"),
    _: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if source == "football_data":
        detail = await fd.get_match_detail(match_id, db)
    else:
        detail = await apf.get_match_detail(match_id, db)

    if not detail:
        raise HTTPException(status_code=404, detail="Match not found.")
    return detail
