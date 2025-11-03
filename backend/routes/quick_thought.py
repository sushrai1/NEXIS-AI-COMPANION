from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from db import get_db
import models
from schemas import QuickThoughtCreate, QuickThoughtResponse 
from utils.security import get_current_user
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

analyzer = SentimentIntensityAnalyzer() 

router = APIRouter(
    prefix="/quick-thought", 
    tags=["Quick Thought"]
)

@router.post("/", response_model=QuickThoughtResponse) 
def submit_quick_thought(
    thought_data: QuickThoughtCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Receives and saves a user's quick text thought.
    Optionally performs basic sentiment analysis.
    """
    
    sentiment = None 
    
   
    try:
         vs = analyzer.polarity_scores(thought_data.text_content)
         sentiment = vs['compound'] 
         print(f"Sentiment for '{thought_data.text_content[:30]}...': {sentiment}")
    except Exception as e:
         print(f"Sentiment analysis failed: {e}") 
         sentiment = None
    
    # --- Save to database ---
    db_thought = models.QuickThought(
        owner_id=current_user.id,
        text_content=thought_data.text_content,
        sentiment_score=sentiment 
    )
    db.add(db_thought)
    db.commit()
    db.refresh(db_thought) 
    
    print(f"Saved quick thought for user: {current_user.email}")
    
    return db_thought