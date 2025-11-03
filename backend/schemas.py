from pydantic import BaseModel, EmailStr, constr, Field
from enum import Enum
from typing import Optional, List  
from datetime import datetime      

# Enum for roles
class UserRole(str, Enum):
    user = "user"
    guardian = "guardian"
    doctor = "doctor"

# Base user (common fields)
class UserBase(BaseModel):
    name: str
    email: EmailStr

# Schema for registration
class UserCreate(UserBase):
    password: constr(max_length=72)
    role: UserRole = UserRole.user

# Schema for login
class UserLogin(BaseModel):
    email: EmailStr
    password: str

# Response schema
class UserResponse(UserBase):
    id: int
    role: UserRole

    class Config:
        from_attributes = True

# Schema for submitting a survey
class PHQ9Submit(BaseModel):
    answers: List[int]
    score: int
    interpretation: str

# Schema for returning a survey result from the API
class SurveyResultResponse(PHQ9Submit):
    id: int
    created_at: datetime
    owner_id: int

    class Config:
        from_attributes = True # for orm_mode

class QuickThoughtCreate(BaseModel):
    text_content: str = Field(..., min_length=1, max_length=1000)

# Schema for returning a quick thought from the API
class QuickThoughtResponse(BaseModel):
    id: int
    text_content: str
    sentiment_score: Optional[float] = None 
    created_at: datetime
    owner_id: int

    class Config:
        from_attributes = True # for orm_mode (Pydantic v2)

class MoodEntryBase(BaseModel):
    mood_label: str
    mood_score: Optional[float] = None
    created_at: datetime

'''
class MoodEntryResponse(MoodEntryBase):
    id: int
    owner_id: int

    class Config:
        from_attributes = True # for orm_mode'''