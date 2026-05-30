import json
import logging
from datetime import datetime, date
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

import models

logger = logging.getLogger(__name__)

API_FOOTBALL_DAILY_LIMIT = 100
API_FOOTBALL_WARN_THRESHOLD = 90


def get_cached(db: Session, cache_key: str, ttl_hours: float | None) -> dict | None:
    entry = db.query(models.ApiCache).filter_by(cache_key=cache_key).first()
    if not entry:
        return None
    if entry.is_permanent:
        return json.loads(entry.data_json)
    if ttl_hours is None:
        return json.loads(entry.data_json)
    age_hours = (datetime.utcnow() - entry.cached_at).total_seconds() / 3600
    if age_hours < ttl_hours:
        return json.loads(entry.data_json)
    return None


def set_cached(db: Session, cache_key: str, data: dict, is_permanent: bool = False):
    entry = db.query(models.ApiCache).filter_by(cache_key=cache_key).first()
    if entry:
        entry.data_json = json.dumps(data)
        entry.cached_at = datetime.utcnow()
        entry.is_permanent = is_permanent
    else:
        entry = models.ApiCache(
            cache_key=cache_key,
            data_json=json.dumps(data),
            cached_at=datetime.utcnow(),
            is_permanent=is_permanent,
        )
        db.add(entry)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()


def cached_at_str(db: Session, cache_key: str) -> str:
    entry = db.query(models.ApiCache).filter_by(cache_key=cache_key).first()
    if entry:
        return entry.cached_at.isoformat() + "Z"
    return datetime.utcnow().isoformat() + "Z"


def track_usage(db: Session, source: str):
    today = date.today().isoformat()
    usage = db.query(models.ApiUsage).filter_by(date=today, source=source).first()
    if usage:
        usage.request_count += 1
    else:
        usage = models.ApiUsage(date=today, source=source, request_count=1)
        db.add(usage)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        usage = db.query(models.ApiUsage).filter_by(date=today, source=source).first()
        if usage:
            usage.request_count += 1
            db.commit()

    if source == "api_football":
        count = usage.request_count if usage else 0
        if count >= API_FOOTBALL_WARN_THRESHOLD:
            logger.warning(f"API-Football daily usage: {count}/{API_FOOTBALL_DAILY_LIMIT}")


def get_today_usage(db: Session, source: str) -> int:
    today = date.today().isoformat()
    usage = db.query(models.ApiUsage).filter_by(date=today, source=source).first()
    return usage.request_count if usage else 0
