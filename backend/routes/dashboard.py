from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional, List
from datetime import datetime, timedelta

from db import get_db
import models
from schemas import QuickThoughtResponse
from utils.security import get_current_user
from pydantic import BaseModel

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)

class DashboardSummaryResponse(BaseModel):
    insight_message: str
    current_mood_text: Optional[str] = None
    mood_trend_text: Optional[str] = None
    new_alerts_count: int = 0


def get_insight_from_score(score: Optional[float]) -> str:
    """Selects an insight message based on sentiment score."""
    if score is None:
        return "Keep checking in to get personalized insights."
    elif score > 0.5:
        return "It sounds like things are looking up! Keep embracing that positive energy."
    elif score > 0.05:
        return "Seems like a relatively calm moment. Remember to take time for yourself."
    elif score >= -0.05:
        return "Thanks for sharing. Every check-in helps build understanding."
    elif score >= -0.5:
        return "It sounds like things might be a bit challenging. Remember to be kind to yourself."
    else:
        return "It sounds like you're going through a difficult time. Remember that feelings pass, and support is available."


def get_emotion_trend(emotions: List[str]) -> str:
    """Analyzes recent emotions and determines mood trend."""
    if len(emotions) < 2:
        return "Stable"

    positive = {"happy", "surprise", "neutral"}
    negative = {"sad", "angry", "fearful", "disgust"}

    first, last = emotions[-2], emotions[-1]
    if first in negative and last in positive:
        return "Improving"
    elif first in positive and last in negative:
        return "Declining"
    elif first == last:
        return "Stable"
    else:
        return "Fluctuating"


@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Fetches summary data for the user's dashboard:
    - Insight from latest Quick Thought
    - Latest detected emotion from Check-Ins
    - Trend based on recent check-ins
    - New alerts (negative emotions in the last 7 days)
    """

    # 1️⃣ Fetch latest Quick Thought (for insight)
    latest_thought = (
        db.query(models.QuickThought)
        .filter(models.QuickThought.owner_id == current_user.id)
        .order_by(desc(models.QuickThought.created_at))
        .first()
    )
    insight = get_insight_from_score(latest_thought.sentiment_score if latest_thought else None)

    # 2️⃣ Fetch recent Check-Ins (for mood tracking)
    checkins = (
        db.query(models.MoodEntry)
        .filter(models.MoodEntry.user_id == current_user.id)
        .order_by(desc(models.MoodEntry.created_at))
        .limit(5)
        .all()
    )

    if checkins:
        current_mood = checkins[0].emotion.capitalize()
        recent_emotions = [c.emotion for c in reversed(checkins)]
        trend_text = get_emotion_trend(recent_emotions)
    else:
        current_mood = None
        trend_text = "No data yet"

    # 3️⃣ Count alerts = number of negative emotions in last 7 days
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    negative_emotions = {"sad", "angry", "fearful", "disgust"}
    alerts_count = (
        db.query(models.MoodEntry)
        .filter(models.MoodEntry.user_id == current_user.id)
        .filter(models.MoodEntry.emotion.in_(negative_emotions))
        .filter(models.MoodEntry.created_at >= seven_days_ago)
        .count()
    )

    # 4️⃣ Return full summary
    return DashboardSummaryResponse(
        insight_message=insight,
        current_mood_text=current_mood,
        mood_trend_text=trend_text,
        new_alerts_count=alerts_count
    )
