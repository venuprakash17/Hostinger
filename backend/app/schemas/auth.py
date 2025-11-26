"""Authentication schemas"""
from pydantic import BaseModel, EmailStr
from typing import Optional


class Token(BaseModel):
    """Token response schema"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Token data schema"""
    user_id: Optional[int] = None
    email: Optional[str] = None


class UserLogin(BaseModel):
    """User login schema - supports email or roll_number/college_id"""
    email: Optional[str] = None  # Can be email or roll_number
    password: str


class UserSignup(BaseModel):
    """User signup schema"""
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class UserResponse(BaseModel):
    """User response schema"""
    id: int
    email: str
    is_active: bool
    is_verified: bool
    
    class Config:
        from_attributes = True


class RefreshTokenRequest(BaseModel):
    """Refresh token request schema"""
    refresh_token: str

