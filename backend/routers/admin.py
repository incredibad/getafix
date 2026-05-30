from datetime import date, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from auth import get_current_user

router = APIRouter()


@router.get("/usage", response_model=schemas.UsageResponse)
def get_api_usage(
    _: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = date.today().isoformat()
    week_ago = (date.today() - timedelta(days=7)).isoformat()

    today_rows = db.query(models.ApiUsage).filter(models.ApiUsage.date == today).all()
    recent_rows = (
        db.query(models.ApiUsage)
        .filter(models.ApiUsage.date >= week_ago)
        .order_by(models.ApiUsage.date.desc())
        .all()
    )
    return schemas.UsageResponse(
        today=[schemas.UsageEntry(date=r.date, source=r.source, request_count=r.request_count) for r in today_rows],
        recent=[schemas.UsageEntry(date=r.date, source=r.source, request_count=r.request_count) for r in recent_rows],
    )


@router.delete("/cache")
def clear_cache(
    _: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Clear all non-permanent cache entries."""
    deleted = db.query(models.ApiCache).filter(models.ApiCache.is_permanent == False).delete()
    db.commit()
    return {"deleted": deleted}
