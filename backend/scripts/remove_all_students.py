"""
Script to remove all students from the database
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.user import User, UserRole, RoleEnum
from app.models.profile import Profile
from sqlalchemy.orm import Session

def remove_all_students(db: Session):
    """Remove all users with 'student' role, along with their profiles and roles"""
    
    # Find all student users
    student_users = db.query(User).join(UserRole).filter(UserRole.role == RoleEnum.STUDENT).distinct().all()
    
    if not student_users:
        print("📊 No students found to remove.")
        return {"message": "No students found to remove."}

    print(f"📊 Found {len(student_users)} students to remove")
    print("\n🗑️  Students to be removed:")
    for user in student_users[:10]:  # Show first 10
        roles = db.query(UserRole).filter(UserRole.user_id == user.id).all()
        role_names = [r.role.value for r in roles]
        profile = db.query(Profile).filter(Profile.user_id == user.id).first()
        print(f"   - ID: {user.id}, Email: {user.email}, Roles: {role_names}, Name: {profile.full_name if profile else 'N/A'}")
    
    if len(student_users) > 10:
        print(f"   ... and {len(student_users) - 10} more students")

    # Get all student user IDs
    student_ids = [user.id for user in student_users]

    # Delete user roles for students
    deleted_roles_count = db.query(UserRole).filter(UserRole.user_id.in_(student_ids)).delete(synchronize_session=False)
    db.commit()
    print(f"\n🗑️  Deleting user roles...")
    print(f"   ✅ Deleted {deleted_roles_count} user roles")

    # Delete profiles for students
    deleted_profiles_count = db.query(Profile).filter(Profile.user_id.in_(student_ids)).delete(synchronize_session=False)
    db.commit()
    print(f"\n🗑️  Deleting profiles...")
    print(f"   ✅ Deleted {deleted_profiles_count} profiles")

    # Delete student users
    deleted_users_count = db.query(User).filter(User.id.in_(student_ids)).delete(synchronize_session=False)
    db.commit()
    print(f"\n🗑️  Deleting users...")
    print(f"   ✅ Deleted {deleted_users_count} users")

    print("\n======================================================================")
    print("✅ ALL STUDENTS REMOVED SUCCESSFULLY!")
    print("======================================================================")

    return {
        "message": "All students removed successfully!",
        "users_deleted": deleted_users_count,
        "profiles_deleted": deleted_profiles_count,
        "roles_deleted": deleted_roles_count
    }

if __name__ == "__main__":
    db = SessionLocal()
    try:
        print("======================================================================")
        print("REMOVING ALL STUDENTS FROM DATABASE")
        print("======================================================================")
        
        # Confirm before deleting
        total_students = db.query(User).join(UserRole).filter(UserRole.role == RoleEnum.STUDENT).distinct().count()
        print(f"\n⚠️  WARNING: This will delete {total_students} students!")
        print("   This action cannot be undone!")
        print("\n   Proceeding with deletion...\n")
        
        result = remove_all_students(db)
        
        print("\nSummary:")
        print(f"   - Users deleted: {result['users_deleted']}")
        print(f"   - Profiles deleted: {result['profiles_deleted']}")
        print(f"   - Roles deleted: {result['roles_deleted']}")
        print("\n======================================================================")
    except Exception as e:
        db.rollback()
        print(f"❌ An error occurred: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

