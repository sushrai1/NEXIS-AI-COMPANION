from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from db import get_db
from models import User, UserRole
from schemas import UserCreate, UserLogin, UserResponse
from utils.security import hash_password, verify_password, get_current_user
from utils.jwt import create_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])


# Register new user
@router.post("/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    db_user = User(
        name=user.name,
        email=user.email,
        password_hash=hash_password(user.password),
        role=user.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


# Login user
@router.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    token = create_access_token({"sub": db_user.email, "role": db_user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": db_user.id,
            "name": db_user.name,
            "email": db_user.email,
            "role": db_user.role
        }
    }


# Return the current logged-in user's profile (auth rehydration on page reload)
@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role
    }


# ── Settings Page Endpoints ──────────────────────────────────────────

class UpdateNameRequest(BaseModel):
    name: str

@router.patch("/update-name")
def update_name(
    body: UpdateNameRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="Name cannot be empty.")
    current_user.name = body.name.strip()
    db.commit()
    return {"message": "Name updated successfully.", "name": current_user.name}


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

@router.post("/change-password")
def change_password(
    body: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters.")
    current_user.password_hash = hash_password(body.new_password)
    db.commit()
    return {"message": "Password updated successfully."}


@router.delete("/delete-account")
def delete_account(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.delete(current_user)
    db.commit()
    return {"message": "Account deleted."}
