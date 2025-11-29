"""Database connection and session management"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import get_settings
import os

settings = get_settings()

# Determine database type
is_sqlite = settings.DATABASE_URL.startswith("sqlite")
is_mysql = "mysql" in settings.DATABASE_URL.lower() or "pymysql" in settings.DATABASE_URL.lower()
is_postgresql = "postgresql" in settings.DATABASE_URL.lower() or "postgres" in settings.DATABASE_URL.lower()

# Create database engine
if is_sqlite:
    # SQLite configuration (for development)
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args={"check_same_thread": False},  # Required for SQLite
    )
elif is_mysql:
    # MySQL configuration (for Hostinger)
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,  # Verify connections before using
        pool_size=5,
        max_overflow=10,
        pool_recycle=3600,  # Recycle connections after 1 hour
    )
elif is_postgresql:
    # PostgreSQL configuration (for production)
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,  # Verify connections before using
        pool_size=5,
        max_overflow=10,
        pool_recycle=3600,  # Recycle connections after 1 hour
    )
else:
    # Default to PostgreSQL if unclear
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
    )

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


def get_db():
    """Dependency for getting database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

