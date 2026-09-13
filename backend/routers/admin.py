from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from auth import get_current_user
import scan_scheduler

router = APIRouter()


def _validate_time_of_day(value: str | None) -> None:
    if value is None:
        return
    try:
        hh, mm = value.split(":")
        if not (0 <= int(hh) <= 23 and 0 <= int(mm) <= 59):
            raise ValueError
    except Exception:
        raise HTTPException(status_code=400, detail="time_of_day must be in HH:MM format (24-hour, AEST).")


def _schedule_response(sched: models.ScanSchedule) -> schemas.ScanScheduleResponse:
    return schemas.ScanScheduleResponse(
        enabled=sched.enabled,
        time_of_day=sched.time_of_day,
        last_run_at=sched.last_run_at,
        last_run_status=sched.last_run_status,
        last_run_duration_s=sched.last_run_duration_s,
        last_run_error=sched.last_run_error,
    )


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


@router.get("/scan-schedule", response_model=schemas.ScanScheduleResponse)
def get_scan_schedule(
    _: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _schedule_response(scan_scheduler.get_or_create_schedule(db))


@router.put("/scan-schedule", response_model=schemas.ScanScheduleResponse)
def update_scan_schedule(
    data: schemas.ScanScheduleUpdate,
    _: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if data.enabled and not data.time_of_day:
        raise HTTPException(status_code=400, detail="time_of_day is required when enabling the schedule.")
    _validate_time_of_day(data.time_of_day)

    sched = scan_scheduler.get_or_create_schedule(db)
    sched.enabled = data.enabled
    sched.time_of_day = data.time_of_day
    db.commit()
    db.refresh(sched)
    return _schedule_response(sched)


@router.post("/scan-schedule/run-now", response_model=schemas.ScanScheduleResponse)
async def run_scan_now(
    _: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sched = await scan_scheduler.execute_and_record_scan(db)
    return _schedule_response(sched)
