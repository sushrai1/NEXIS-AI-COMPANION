from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_
from typing import Optional, List
from datetime import datetime, timedelta
from utils.aggregation import aggregate_last_14_days
from db import get_db
import models
from schemas import QuickThoughtResponse
from utils.security import get_current_user
from pydantic import BaseModel
from utils.llm import generate_structured_insights

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

    first = checkins[0]

    if first.emotion:
        current_mood = first.emotion.capitalize()
    elif first.status == models.EntryStatus.uploaded:
        current_mood = "Pending Analysis"
    elif first.status == models.EntryStatus.failed:
        current_mood = "Analysis Failed"
    else:
        current_mood = None

    recent_emotions = [c.emotion for c in reversed(checkins) if c.emotion]
    if recent_emotions:
        trend_text = get_emotion_trend(recent_emotions)
    else:
        trend_text = "No analyzed check-ins"

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

@router.get("/weekly-report")
def get_weekly_report(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
    refresh: bool = False,  # ?refresh=true to force regeneration
):
    # 14-day window ending now
    period_end = datetime.utcnow()
    period_start = period_end - timedelta(days=14)

    summary_14 = aggregate_last_14_days(db, current_user.id)
    if not summary_14:
        return {"message": "Not enough analyzed data", "summary_14": {}}

    # PHQ-9 (last 14 days)
    latest_phq = (
        db.query(models.SurveyResult)
        .filter(models.SurveyResult.owner_id == current_user.id)
        .filter(models.SurveyResult.created_at >= period_start)
        .order_by(models.SurveyResult.created_at.desc())
        .first()
    )
    phq_norm = None
    if latest_phq and latest_phq.score is not None:
        phq_norm = round((latest_phq.score / 27.0) * 100.0, 2)

    # Base risk
    base_risk = 0.6 * summary_14["avg_score"] + 0.4 * (summary_14["neg_ratio"] * 100.0)
    if phq_norm is not None:
        risk = 0.5 * summary_14["avg_score"] + 0.3 * (summary_14["neg_ratio"] * 100.0) + 0.2 * phq_norm
    else:
        risk = base_risk
    risk = round(risk, 2)

    base_report = {
        "user": current_user.email,
        "risk_score": risk,
        "summary_14": summary_14,
        "phq_9": {
            "score": latest_phq.score if latest_phq else None,
            "normalized": phq_norm,
            "timestamp": latest_phq.created_at.isoformat() if latest_phq else None,
        },
        "period_start": period_start.isoformat(),
        "period_end": period_end.isoformat(),
    }

    # cache lookup unless refresh=true
    if not refresh:
        cached = (
            db.query(models.WeeklyReport)
            .filter(models.WeeklyReport.user_id == current_user.id)
            .filter(and_(
                models.WeeklyReport.period_start >= period_start - timedelta(hours=1),
                models.WeeklyReport.period_end   <= period_end   + timedelta(hours=1),
            ))
            .order_by(models.WeeklyReport.created_at.desc())
            .first()
        )
        if cached:
            payload = cached.payload or {}
            payload.setdefault("risk_score", risk)        # ensure risk present
            payload.setdefault("summary_14", summary_14)
            payload.setdefault("phq_9", base_report["phq_9"])
            return payload

    # generate fresh structured insights
    structured = generate_structured_insights(base_report)

    # persist
    wr = models.WeeklyReport(
        user_id=current_user.id,
        period_start=period_start,
        period_end=period_end,
        payload={**structured, **{"risk_score": risk, "summary_14": summary_14, "phq_9": base_report["phq_9"]}},
    )
    db.add(wr)
    db.commit()

    return wr.payload