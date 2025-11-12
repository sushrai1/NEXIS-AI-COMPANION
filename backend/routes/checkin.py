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
                "status": c.status.value if c.status else None,
                "analysis_error": c.analysis_error,
            }
            for c in checkins
        ]
    }

@router.post("/upload-video")
async def upload_video_only(
    video_file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Uploads a video and stores it as a MoodEntry WITHOUT analysis.
    Useful for batch upload or delayed analysis.
    """
    print("--- VIDEO UPLOAD STARTED ---")

    # Validate extension
    file_extension = video_file.filename.split(".")[-1].lower()
    allowed_ext = ["mp4", "mov", "avi", "mkv", "webm"]
    if file_extension not in allowed_ext:
        raise HTTPException(status_code=400, detail="Unsupported file format")

    # Create file path
    file_name = f"{uuid.uuid4()}.{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, file_name)

    # Save file
    try:
        with open(file_path, "wb") as f:
            f.write(await video_file.read())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    print(f"✅ Video saved to {file_path} for user {current_user.email}")

    # Store entry WITHOUT emotion analysis
    mood_entry = models.MoodEntry(
    user_id=current_user.id,
    emotion=None,
    confidence=None,
    probabilities=None,
    video_path=file_path,
    text_input=None,
    status=models.EntryStatus.uploaded,
    analysis_error=None,
    )

    db.add(mood_entry)
    db.commit()
    db.refresh(mood_entry)

    status=models.EntryStatus.uploaded

    return {
        "message": "✅ Video uploaded successfully!",
        "data": {
            "id": mood_entry.id,
            "timestamp": mood_entry.created_at.isoformat(),
            "video_path": mood_entry.video_path,
            "user_email": current_user.email
        }
    }

@router.post("/process-pending")
async def process_pending_checkins(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)  # optional protection
):
    """
    Batch processes all MoodEntry rows with status='uploaded'
    """
    pending = (
        db.query(models.MoodEntry)
        .filter(models.MoodEntry.status == models.EntryStatus.uploaded)
        .all()
    )

    if not pending:
        return {"message": "No pending entries"}

    processed = []
    failed = []

    for entry in pending:
        try:
            result = predict_emotion(entry.video_path, entry.text_input or "")
            entry.emotion = result["predicted_emotion"]
            entry.confidence = result["confidence"]
            entry.probabilities = result["probabilities"]
            entry.status = models.EntryStatus.analyzed
            entry.analysis_error = None
            processed.append(entry.id)

        except Exception as e:
            entry.status = models.EntryStatus.failed
            entry.analysis_error = str(e)
            failed.append(entry.id)

    db.commit()

    return {
        "message": "✅ Batch processing complete",
        "processed_count": len(processed),
        "failed_count": len(failed),
        "processed": processed,
        "failed": failed,
    }

@router.post("/analyze/{entry_id}")
async def analyze_single_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    entry = (
        db.query(models.MoodEntry)
        .filter(models.MoodEntry.id == entry_id)
        .filter(models.MoodEntry.user_id == current_user.id)
        .first()
    )

    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    if entry.status == models.EntryStatus.analyzed:
        return {"message": "Already analyzed", "id": entry.id}

    try:
        result = predict_emotion(entry.video_path, entry.text_input or "")
        entry.emotion = result["predicted_emotion"]
        entry.confidence = result["confidence"]
        entry.probabilities = result["probabilities"]
        entry.status = models.EntryStatus.analyzed
        entry.analysis_error = None

    except Exception as e:
        print("Analysis error:", e)
        traceback.print_exc()
        entry.status = models.EntryStatus.failed
        entry.analysis_error = str(e)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Analysis failed: {e}")


    db.commit()
    db.refresh(entry)

    return {
        "message": "✅ Entry analyzed",
        "id": entry.id,
        "emotion": entry.emotion,
    }
