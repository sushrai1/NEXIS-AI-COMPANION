from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc 
from typing import Optional

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
    else: # score < -0.5
        return "It sounds like you're going through a difficult time. Remember that feelings pass, and support is available."


@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Fetches summary data for the user's dashboard, including a
    simple insight based on the latest quick thought.
    """

    # 1. Fetch the latest Quick Thought
    latest_thought = db.query(models.QuickThought)\
        .filter(models.QuickThought.owner_id == current_user.id)\
        .order_by(desc(models.QuickThought.created_at))\
        .first()

    # 2. Determine the insight message
    insight = get_insight_from_score(latest_thought.sentiment_score if latest_thought else None)

    # --- TODO: Fetch other summary data ---
    # Fetch latest mood_entry, calculate trend, count new alerts, etc.
    # Replace these placeholders with actual data fetching logic
    latest_mood_text = "Calm" # Placeholder
    trend_text = "Stable"    # Placeholder
    alerts_count = 1         # Placeholder

    # 3. Return the summary data
    return DashboardSummaryResponse(
        insight_message=insight,
        current_mood_text=latest_mood_text,
        mood_trend_text=trend_text,
        new_alerts_count=alerts_count
    )