#models.py
from sqlalchemy import Column, Integer, String, Enum, DateTime, func, ForeignKey, JSON, Float, Text
from sqlalchemy.orm import relationship
from db import Base 
import enum

class UserRole(str, enum.Enum):
    user = "user"
    guardian = "guardian"
    doctor = "doctor"

class AlertStatus(str, enum.Enum):
    new = "New"
    acknowledged = "Acknowledged"

class AlertUrgency(str, enum.Enum):
    low = "Low"
    medium = "Medium"
    high = "High"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.user)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    mood_entries = relationship("MoodEntry", back_populates="owner", cascade="all, delete-orphan")
    surveys = relationship("SurveyResult", back_populates="owner", cascade="all, delete-orphan")
    quick_thoughts = relationship("QuickThought", back_populates="owner", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="owner", cascade="all, delete-orphan")

class SurveyResult(Base):
    __tablename__ = "surveys_results"

    id = Column(Integer, primary_key=True, index=True)
    score = Column(Integer, nullable=False)
    interpretation = Column(String, nullable=True)
    answers = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    owner = relationship("User", back_populates="surveys")

class MoodEntry(Base):
    __tablename__ = "mood_entries"

    id = Column(Integer, primary_key=True, index=True)
    mood_label = Column(String, nullable=False, index=True)
    mood_score = Column(Float, nullable=True)
    video_path = Column(String, nullable=True) 
    # Optional detailed scores
    # facial_expression_details = Column(JSON, nullable=True)
    # vocal_tone_details = Column(JSON, nullable=True)
    # text_sentiment_score = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    owner = relationship("User", back_populates="mood_entries")

class QuickThought(Base):
    __tablename__ = "quick_thoughts"

    id = Column(Integer, primary_key=True, index=True)
    text_content = Column(Text, nullable=False) 
    sentiment_score = Column(Float, nullable=True) 
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    owner = relationship("User", back_populates="quick_thoughts")

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    alert_type = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=False)
    status = Column(Enum(AlertStatus), nullable=False, default=AlertStatus.new, index=True)
    urgency = Column(Enum(AlertUrgency), nullable=False, default=AlertUrgency.medium)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    owner = relationship("User", back_populates="alerts")
