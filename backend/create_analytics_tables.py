"""Script to create analytics tables"""
from app.core.database import engine, Base
from app.models.user_analytics import UserActivity, UserSession, StudentProgress, FeatureAnalytics

def create_analytics_tables():
    """Create all analytics tables"""
    print("Creating analytics tables...")
    Base.metadata.create_all(bind=engine, tables=[
        UserActivity.__table__,
        UserSession.__table__,
        StudentProgress.__table__,
        FeatureAnalytics.__table__
    ])
    print("✅ Analytics tables created successfully!")

if __name__ == "__main__":
    create_analytics_tables()

