"""Script to add performance indexes for scalability"""
from sqlalchemy import text, Index
from app.core.database import engine

def add_performance_indexes():
    """Add indexes for better query performance with 10k+ users"""
    print("Adding performance indexes...")
    
    indexes = [
        # UserActivity indexes for analytics
        "CREATE INDEX IF NOT EXISTS idx_user_activities_user_created ON user_activities(user_id, created_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_user_activities_category_created ON user_activities(activity_category, created_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_user_activities_entity ON user_activities(entity_type, entity_id, created_at DESC)",
        
        # CodingSubmission indexes
        "CREATE INDEX IF NOT EXISTS idx_coding_submissions_user_status ON coding_submissions(user_id, status, created_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_coding_submissions_problem_status ON coding_submissions(problem_id, status, created_at DESC)",
        
        # Profile indexes for filtering
        "CREATE INDEX IF NOT EXISTS idx_profiles_college_dept_year ON profiles(college_id, department, present_year)",
        "CREATE INDEX IF NOT EXISTS idx_profiles_section ON profiles(section_id, college_id)",
        "CREATE INDEX IF NOT EXISTS idx_profiles_institution ON profiles(institution_id)",
        
        # UserRole indexes
        "CREATE INDEX IF NOT EXISTS idx_user_roles_user_role ON user_roles(user_id, role)",
        "CREATE INDEX IF NOT EXISTS idx_user_roles_college ON user_roles(college_id, role)",
        "CREATE INDEX IF NOT EXISTS idx_user_roles_institution ON user_roles(institution_id, role)",
        
        # QuizAttempt indexes
        "CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_quiz ON quiz_attempts(user_id, quiz_id)",
        
        # JobApplication indexes (check if created_at exists first)
        "CREATE INDEX IF NOT EXISTS idx_job_applications_user_status ON job_applications(user_id, status)",
        "CREATE INDEX IF NOT EXISTS idx_job_applications_job_status ON job_applications(job_id, status)",
        
        # CodingProblem indexes
        "CREATE INDEX IF NOT EXISTS idx_coding_problems_scope_active ON coding_problems(scope_type, is_active, year)",
        "CREATE INDEX IF NOT EXISTS idx_coding_problems_college_dept ON coding_problems(college_id, department, is_active)",
        
        # Section indexes
        "CREATE INDEX IF NOT EXISTS idx_sections_college_dept_year ON sections(college_id, department_id, year)",
        
        # UserSession indexes
        "CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active ON user_sessions(user_id, is_active, started_at DESC)",
        
        # StudentProgress indexes
        "CREATE INDEX IF NOT EXISTS idx_student_progress_last_activity ON student_progress(user_id, last_activity_at DESC)",
    ]
    
    with engine.connect() as conn:
        for index_sql in indexes:
            try:
                conn.execute(text(index_sql))
                conn.commit()
                print(f"✅ Created index: {index_sql[:50]}...")
            except Exception as e:
                print(f"⚠️  Index may already exist or error: {e}")
    
    print("✅ Performance indexes added successfully!")

if __name__ == "__main__":
    add_performance_indexes()

