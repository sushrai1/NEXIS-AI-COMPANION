# backend/routes/connections.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from utils.security import get_current_user
import models

router = APIRouter(prefix="/connections", tags=["Connections"])

class InviteRequest(BaseModel):
    email: EmailStr

@router.post("/invite")
async def invite_connection(
    invite_data: InviteRequest,
    current_user: models.User = Depends(get_current_user)
):
    """
    Stub endpoint for inviting a guardian or doctor.
    Persistence logic to be added in next phase.
    """
    # For now, just return success to satisfy frontend calls
    return {
        "message": f"Invitation sent to {invite_data.email}! (Feature coming soon)",
        "recipient": invite_data.email
    }
