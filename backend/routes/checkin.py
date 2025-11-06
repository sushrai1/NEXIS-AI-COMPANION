from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException
from sqlalchemy.orm import Session
from db import get_db  
import models, uuid, os
from utils.security import get_current_user 
from utils.predict_emotion import predict_emotion  
import traceback

router = APIRouter(prefix="/check-in", tags=["Check-In"])

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

    file_extension = video_file.filename.split(".")[-1]
    file_name = f"{uuid.uuid4()}.{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, file_name)

    try:
        with open(file_path, "wb") as f:
            f.write(await video_file.read())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    print(f"Video saved to {file_path} for user {current_user.email}")

    try:
        analysis_result = predict_emotion(file_path, text_input)
    except Exception as e:
        print("❌ Emotion analysis crashed:")
        traceback.print_exc()                  # ✅ PRINT REAL ERROR
        raise HTTPException(status_code=500, detail=f"Emotion analysis failed: {str(e)}")

    checkin = models.MoodEntry(
        user_id=current_user.id,
        emotion=analysis_result["predicted_emotion"],
        confidence=analysis_result["confidence"],
        probabilities=analysis_result["probabilities"],
        video_path=file_path,
        text_input=text_input,
    )
    db.add(checkin)
    db.commit()
    db.refresh(checkin)

    return {
        "message": "✅ Check-in analyzed and stored successfully!",
        "data": {
            "id": checkin.id,
            "timestamp": checkin.created_at.isoformat(),
            "emotion": checkin.emotion,
            "confidence": checkin.confidence,
            "probabilities": checkin.probabilities,
            "video_path": checkin.video_path,
            "text_input": checkin.text_input,
            "user_email": current_user.email
        }
    }


@router.get("/history")
async def get_checkin_history(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Fetches all past multimodal check-ins for the current user.
    Sorted by latest first (descending by timestamp).
    """
    checkins = (
        db.query(models.MoodEntry)
        .filter(models.MoodEntry.user_id == current_user.id)
        .order_by(models.MoodEntry.created_at.desc())
        .all()
    )

    return {
        "user": current_user.email,
        "total_checkins": len(checkins),
        "checkins": [
            {
                "id": c.id,
                "timestamp": c.created_at.isoformat(),
                "emotion": c.emotion,
                "confidence": c.confidence,
                "probabilities": c.probabilities,
                "video_path": c.video_path,
                "text_input": c.text_input,
            }
            for c in checkins
        ]
    }
