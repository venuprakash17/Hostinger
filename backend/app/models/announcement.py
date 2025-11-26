"""Announcement/Popup model"""
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.sql import func
from app.core.database import Base


class Announcement(Base):
    """Announcement/Popup model for showing one-time popups to users"""
    __tablename__ = "announcements"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default="info")  # info, success, warning, error
    college_id = Column(Integer, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=True, index=True)
    department = Column(String(255), nullable=True, index=True)
    section = Column(String(50), nullable=True, index=True)
    present_year = Column(String(50), nullable=True, index=True)  # e.g., "1st", "2nd", "3rd", "4th"
    role = Column(String(50), nullable=True, index=True)  # student, faculty, admin, hod
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class UserAnnouncement(Base):
    """Junction table to track which users have seen which announcements"""
    __tablename__ = "user_announcements"
    
    id = Column(Integer, primary_key=True, index=True)
    announcement_id = Column(Integer, ForeignKey("announcements.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    seen_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Composite unique constraint to ensure one record per user-announcement
    __table_args__ = (
        {"sqlite_autoincrement": True},
    )

