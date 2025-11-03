from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException
from sqlalchemy.orm import Session
from db import get_db  
import models 
import uuid
import os
from utils.security import get_current_user 

router = APIRouter(
    prefix="/check-in",
    tags=["Check-In"]    
)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/multimodal")
async def create_multimodal_checkin(
    text_input: str = Form(...),
    video_file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user) 
):
    print("--- CHECK-IN FUNCTION STARTED ---")
    """
    Handles the multimodal check-in:
    1. Saves the video file.
    2. Receives the text input.
    3. (Future) Triggers AI analysis.
    """
    
    # We use UUID to prevent files from overwriting each other
    file_extension = video_file.filename.split(".")[-1]
    file_name = f"{uuid.uuid4()}.{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, file_name)

    try:
        with open(file_path, "wb") as f:
            f.write(await video_file.read())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    # 2. Log the received data (for debugging)
    print(f"User check-in received.")
    print(f"Text: {text_input}")
    print(f"Video saved to: {file_path}")

    # 3. --- AI ANALYSIS GOES HERE ---
    #    This is where you will:
    #    a. Load the saved video file (file_path)
    #    b. Run your facial expression model on the video
    #    c. Extract the audio from the video and run your vocal tone model
    #    d. Run text sentiment analysis on 'text_input'
    #    e. Combine the results into a single assessment
    #    f. Save the assessment to the database, linked to the user
    
    # 4. Success message
    return {
        "message": "Check-in received successfully!",
        "video_path": file_path,
        "text": text_input,
        "analysis_status": "PENDING"
    }