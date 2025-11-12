import datetime
from sqlalchemy.orm import Session
import models
import numpy as np
from sqlalchemy import desc

NEGATIVE_EMOTIONS = {"sad", "angry", "fearful", "disgust"}

def compute_daily_score(entry):
    """Compute mental-state score 0–100 for a single MoodEntry"""
    if not entry.probabilities:
        return None

    probs = entry.probabilities
    negative_prob = sum(probs.get(e, 0) for e in NEGATIVE_EMOTIONS)

    # Use confidence if available
    conf = (entry.confidence or 50) / 100 

    # dummy sentiment signal (if text exists)
    #sentiment = 0.0
    # If your text model already outputs sentiment probabilities, insert here

    daily_score = (
        0.7 * negative_prob +
        0.3 * (1 - conf) 
    )

    return round(daily_score * 100, 2)


def aggregate_last_14_days(db: Session, user_id: int):
    now = datetime.datetime.utcnow()
    start = now - datetime.timedelta(days=14)

    entries = (
        db.query(models.MoodEntry)
        .filter(models.MoodEntry.user_id == user_id)
        .filter(models.MoodEntry.created_at >= start)
        .all()
    )

    # Only analyzed items (emotion present)
    analyzed = [e for e in entries if e.emotion]
    if not analyzed:
        return None

    scores = []
    negative_day_flags = 0

    for e in analyzed:
        # --- compute score (your existing function) ---
        score = compute_daily_score(e)
        if score is None:
            continue
        scores.append(score)

        # --- robust negative-day flag ---
        # 1) if top-level predicted label is negative  OR
        # 2) aggregated negative probability >= 0.5
        probs = e.probabilities or {}
        negative_prob = sum(float(probs.get(lbl, 0) or 0) for lbl in NEGATIVE_EMOTIONS)
        is_negative = (e.emotion in NEGATIVE_EMOTIONS) or (negative_prob >= 0.5)
        if is_negative:
            negative_day_flags += 1

    if not scores:
        return None

    # NOTE: lower score == better (per your UI text), so:
    best = float(np.min(scores))   # lower = better
    worst = float(np.max(scores))  # higher = worse

    avg_score = float(np.mean(scores))
    std_dev   = float(np.std(scores))

    # % days with strong negative presence (from flags)
    neg_ratio = negative_day_flags / len(scores)

    # Trend: last - first (negative means improving)
    slope = float(scores[-1] - scores[0])

    return {
        "num_entries": len(scores),
        "avg_score": round(avg_score, 2),
        "std_dev": round(std_dev, 2),
        "best": round(best, 2),    # lower = better
        "worst": round(worst, 2),  # higher = worse
        "neg_ratio": round(neg_ratio, 2),
        "trend_slope": round(slope, 2),
    }