"""User saved code model for per-language code storage"""
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class UserSavedCode(Base):
    """Store user's code drafts per problem and language (like LeetCode)"""
    __tablename__ = "user_saved_code"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    problem_id = Column(Integer, ForeignKey("coding_problems.id", ondelete="CASCADE"), nullable=False, index=True)
    language = Column(String(20), nullable=False)  # python, c, cpp, java, javascript
    code = Column(Text, nullable=False, default="")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User")
    problem = relationship("CodingProblem")
    
    # Unique constraint: one code per user-problem-language combination
    __table_args__ = (
        {'sqlite_autoincrement': True},
    )

