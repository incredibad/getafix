from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from auth import get_current_user, get_optional_user

router = APIRouter()

_DEFAULTS = dict(
    days_back="90",
    spoilers_mode=True,
    reveal_persist="forever",
    auto_reveal_age="never",
    hide_tables="off",
)

_FIELDS = tuple(_DEFAULTS.keys())


def _get_or_create(db: Session, user_id: int) -> models.UserSettings:
    row = db.query(models.UserSettings).filter_by(user_id=user_id).first()
    if not row:
        row = models.UserSettings(user_id=user_id, **_DEFAULTS)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def _to_response(row: models.UserSettings) -> schemas.UserSettingsResponse:
    return schemas.UserSettingsResponse(**{field: getattr(row, field) for field in _FIELDS})


@router.get("", response_model=schemas.UserSettingsResponse)
def get_settings(
    _: models.User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    # Single-admin app: these are the app's settings, not per-viewer — visible to
    # anonymous browsers too (same as followed teams/fixtures already are).
    user = db.query(models.User).first()
    if not user:
        return schemas.UserSettingsResponse(**_DEFAULTS)
    return _to_response(_get_or_create(db, user.id))


@router.put("", response_model=schemas.UserSettingsResponse)
def update_settings(
    data: schemas.UserSettingsUpdate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = _get_or_create(db, user.id)
    for field in _FIELDS:
        value = getattr(data, field)
        if value is not None:
            setattr(row, field, value)
    db.commit()
    db.refresh(row)
    return _to_response(row)
