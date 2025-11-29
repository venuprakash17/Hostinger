"""Application configuration"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings"""
    
    # API Settings
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Elevate Edu API"
    VERSION: str = "1.0.0"
    
    # Database
    # Default to SQLite (free, file-based, no setup required)
    # For production/Docker, use PostgreSQL: postgresql://user:pass@host:port/db
    DATABASE_URL: str = "sqlite:///./elevate_edu.db"  # SQLite for development
    
    # Security
    SECRET_KEY: str = ""  # For JWT signing
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    
    # CORS - Add production domains here
    BACKEND_CORS_ORIGINS: str = "http://localhost:8080,http://localhost:8081,http://localhost:5173,http://127.0.0.1:8080,http://127.0.0.1:8081,http://127.0.0.1:5173,http://72.60.101.14,http://72.60.101.14:80,http://72.60.101.14:8080"
    
    # Debug mode
    DEBUG: bool = True  # Set to False in production
    
    # Email (optional, for notifications)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()

