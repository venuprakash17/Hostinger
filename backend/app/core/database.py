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
    # MySQL configuration (for Hostinger) - Optimized for 10k+ users
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,  # Verify connections before using
        pool_size=20,  # Increased for high concurrency
        max_overflow=40,  # Increased for peak loads
        pool_recycle=3600,  # Recycle connections after 1 hour
        echo=False,  # Disable SQL logging in production
        connect_args={
            "connect_timeout": 10,
            "read_timeout": 30,
            "write_timeout": 30,
        } if "pymysql" in settings.DATABASE_URL.lower() else {}
    )
elif is_postgresql:
    # PostgreSQL configuration (for production) - Optimized for 10k+ users
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,  # Verify connections before using
        pool_size=20,  # Increased for high concurrency
        max_overflow=40,  # Increased for peak loads
        pool_recycle=3600,  # Recycle connections after 1 hour
        echo=False,  # Disable SQL logging in production
        connect_args={
            "connect_timeout": 10,
            "application_name": "elevate_edu_api",
        }
    )
else:
    # Default to PostgreSQL if unclear - Optimized for 10k+ users
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        pool_size=20,
        max_overflow=40,
        pool_recycle=3600,
        echo=False,
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

