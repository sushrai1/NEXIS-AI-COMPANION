# backend/routes/alerts.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db import get_db
import models
from utils.security import get_current_user

router = APIRouter(prefix="/alerts", tags=["Alerts"])

NEGATIVE_EMOTIONS = {"sad", "angry", "fearful", "disgust"}


def _urgency_for_emotion(emotion: str) -> models.AlertUrgency:
    return (
        models.AlertUrgency.high
        if emotion in {"fearful", "angry"}
        else models.AlertUrgency.medium
    )


def _backfill_alerts(db: Session, user_id: int) -> None:
    """
    For every negative-emotion MoodEntry that doesn't yet have an Alert row,
    create one. This covers both old entries (pre-alerts-table) and entries
    whose background task finished but alert creation somehow failed.
    Called on every GET /alerts so the list is always up to date.
    """
    # All mood_entry_ids already linked to an Alert for this user
    existing_ids = {
        row[0]
        for row in db.query(models.Alert.mood_entry_id)
        .filter(
            models.Alert.owner_id == user_id,
            models.Alert.mood_entry_id.isnot(None),
        )
        .all()
    }

    negative_entries = (
        db.query(models.MoodEntry)
        .filter(
            models.MoodEntry.user_id == user_id,
            models.MoodEntry.emotion.isnot(None),
            models.MoodEntry.status == models.EntryStatus.analyzed,
        )
        .all()
    )

    new_alerts = []
    for entry in negative_entries:
        if entry.emotion.lower() not in NEGATIVE_EMOTIONS:
            continue
        if entry.id in existing_ids:
            continue  # already has an Alert row

        new_alerts.append(
            models.Alert(
                owner_id=user_id,
                mood_entry_id=entry.id,
                alert_type="Negative Emotion Detected",
                description=(
                    f"Detected \"{entry.emotion.capitalize()}\" with "
                    f"{entry.confidence:.1f}% confidence during your check-in."
                ),
                status=models.AlertStatus.new,
                urgency=_urgency_for_emotion(entry.emotion.lower()),
                created_at=entry.created_at,  # inherit original timestamp
            )
        )

    if new_alerts:
        db.add_all(new_alerts)
        db.commit()


@router.get("")
def list_alerts(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Return all alerts for the current user, newest first."""
    # Auto-backfill any negative mood entries that don't have Alert rows yet
    _backfill_alerts(db, current_user.id)

    alerts = (
        db.query(models.Alert)
        .filter(models.Alert.owner_id == current_user.id)
        .order_by(models.Alert.created_at.desc())
        .all()
    )
    return [
        {
            "id": a.id,
            "type": a.alert_type,
            "description": a.description,
            "status": a.status.value,
            "urgency": a.urgency.value,
            "timestamp": a.created_at.isoformat(),
        }
        for a in alerts
    ]


@router.patch("/{alert_id}/acknowledge")
def acknowledge_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    alert = (
        db.query(models.Alert)
        .filter(models.Alert.id == alert_id, models.Alert.owner_id == current_user.id)
        .first()
    )
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found.")
    alert.status = models.AlertStatus.acknowledged
    db.commit()
    return {"id": alert.id, "status": alert.status.value}


@router.post("/acknowledge-all")
def acknowledge_all(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    updated = (
        db.query(models.Alert)
        .filter(
            models.Alert.owner_id == current_user.id,
            models.Alert.status == models.AlertStatus.new,
        )
        .all()
    )
    for a in updated:
        a.status = models.AlertStatus.acknowledged
    db.commit()
    return {"acknowledged": len(updated)}
