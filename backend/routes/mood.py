'''
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc # To order results by date
from typing import List, Optional
from datetime import datetime, timedelta

from db import get_db
import models
from schemas import MoodEntryResponse 
from utils.security import get_current_user

router = APIRouter(
    prefix="/mood",
    tags=["Mood Tracking"]
)

@router.get("/history", response_model=List[MoodEntryResponse])
def get_mood_history(
    range_days: int = Query(7, description="Number of past days to fetch (e.g., 7, 30)"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Fetches the user's mood entry history for a specified number of past days.
    Defaults to the last 7 days.
    """
    
    # Calculate the start date based on the range
    start_date = datetime.utcnow() - timedelta(days=range_days)
    
    # Query the database
    mood_entries = db.query(models.MoodEntry)\
        .filter(models.MoodEntry.owner_id == current_user.id)\
        .filter(models.MoodEntry.created_at >= start_date)\
        .order_by(desc(models.MoodEntry.created_at))\
        .all()
        
    if not mood_entries:
        return [] 
        
    return mood_entries'''