from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, UploadFile, HTTPException, status as http_status
from sqlalchemy.orm import Session
from db import get_db, SessionLocal
import models, uuid, os
from utils.security import get_current_user
from utils.predict_emotion import predict_emotion
import traceback

router = APIRouter(prefix="/check-in", tags=["Check-In"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _run_analysis_in_background(entry_id: int, file_path: str, text_input: str):
    """
    Runs emotion analysis in a background thread with its own DB session.
    Called via FastAPI BackgroundTasks so it never blocks the event loop.
    """
    NEGATIVE_EMOTIONS = {"sad", "angry", "fearful", "disgust"}

    db: Session = SessionLocal()
    try:
        entry = db.query(models.MoodEntry).filter(models.MoodEntry.id == entry_id).first()
        if not entry:
            return

        result = predict_emotion(file_path, text_input)
        emotion = result["predicted_emotion"]

        entry.emotion = emotion
        entry.confidence = result["confidence"]
        entry.probabilities = result["probabilities"]
        entry.status = models.EntryStatus.analyzed
        entry.analysis_error = None
        db.commit()

        # Auto-create an Alert row for negative emotions so AlertsPage
        # can persist and acknowledge them properly.
        if emotion and emotion.lower() in NEGATIVE_EMOTIONS:
            urgency = (
                models.AlertUrgency.high
                if emotion.lower() in {"fearful", "angry"}
                else models.AlertUrgency.medium
            )
            alert = models.Alert(
                owner_id=entry.user_id,
                mood_entry_id=entry.id,
                alert_type="Negative Emotion Detected",
                description=(
                    f"Detected \"{emotion.capitalize()}\" with "
                    f"{result['confidence']:.1f}% confidence during your check-in."
                ),
                status=models.AlertStatus.new,
                urgency=urgency,
            )
            db.add(alert)
            db.commit()

    except Exception as e:
        traceback.print_exc()
        try:
            entry = db.query(models.MoodEntry).filter(models.MoodEntry.id == entry_id).first()
            if entry:
                entry.status = models.EntryStatus.failed
                entry.analysis_error = str(e)
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


@router.post("/multimodal", status_code=202)
async def create_multimodal_checkin(
    background_tasks: BackgroundTasks,
    text_input: str = Form(...),
    video_file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Saves the video and returns 202 immediately.
    Emotion analysis runs as a background task so the event loop
    is never blocked and other pages continue to load normally.
    """
    file_extension = video_file.filename.split(".")[-1]
    file_name = f"{uuid.uuid4()}.{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, file_name)

    try:
        with open(file_path, "wb") as f:
            f.write(await video_file.read())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    # Create the entry immediately with status=uploaded so the user
    # can see it in Mood Tracking right away (as Pending → Analyzing → Analyzed)
    checkin = models.MoodEntry(
        user_id=current_user.id,
        video_path=file_path,
        text_input=text_input,
        status=models.EntryStatus.uploaded,
    )
    db.add(checkin)
    db.commit()
    db.refresh(checkin)

    # Schedule analysis to run after the response is sent
    background_tasks.add_task(_run_analysis_in_background, checkin.id, file_path, text_input)

    return {
        "message": "Check-in received. Analysis is running in the background.",
        "id": checkin.id,
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
