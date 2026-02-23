from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
import uuid
from db import get_db
import models
from utils.security import get_current_user
from schemas import PHQ9Submit 

router = APIRouter(
    prefix="/survey",
    tags=["Survey"]
)

@router.post("/phq9")
def submit_phq9_survey(
    survey_data: PHQ9Submit,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Receives and saves a user's PHQ-9 survey results.
    """
    
    # --- Save to database ---
    db_result = models.SurveyResult(
        owner_id=current_user.id, 
        score=survey_data.score, 
        interpretation=survey_data.interpretation,
        answers=survey_data.answers 
    )
    db.add(db_result)
    db.commit()
    
    return {
        "message": "Survey submitted successfully",
        "score": survey_data.score
    }