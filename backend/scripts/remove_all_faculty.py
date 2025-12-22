#!/usr/bin/env python3
"""
Remove all faculty, HOD, and admin users from the system
WARNING: This will delete ALL staff users!
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.user import User, UserRole
from app.models.profile import Profile
from app.models.academic import Department

def remove_all_faculty():
    """Remove all faculty, HOD, and admin users"""
    db = SessionLocal()
    
    try:
        print("=" * 70)
        print("REMOVING ALL FACULTY/HOD/ADMIN USERS")
        print("=" * 70)
        
        # Get all staff roles
        faculty_roles = ['faculty', 'hod', 'admin']
        staff_user_ids = set()
        
        for role_name in faculty_roles:
            roles = db.query(UserRole).filter(UserRole.role == role_name).all()
            for role in roles:
                staff_user_ids.add(role.user_id)
        
        print(f"\n📊 Found {len(staff_user_ids)} staff users to remove")
        
        if len(staff_user_ids) == 0:
            print("\n✅ No staff users to remove!")
            return
        
        # List users to be removed
        print("\n🗑️  Users to be removed:")
        for user_id in sorted(staff_user_ids):
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                profile = db.query(Profile).filter(Profile.user_id == user_id).first()
                roles = db.query(UserRole).filter(UserRole.user_id == user_id).all()
                role_names = [r.role.value for r in roles]
                print(f"   - ID: {user_id}, Email: {user.email}, Roles: {role_names}, Name: {profile.full_name if profile else 'N/A'}")
        
        # Clear HOD assignments from departments
        print("\n🔧 Clearing HOD assignments from departments...")
        departments_with_hod = db.query(Department).filter(Department.hod_id.isnot(None)).all()
        for dept in departments_with_hod:
            if dept.hod_id in staff_user_ids:
                print(f"   - Clearing HOD from department: {dept.name} (ID: {dept.id})")
                dept.hod_id = None
        
        # Delete user roles
        print("\n🗑️  Deleting user roles...")
        deleted_roles = 0
        for role_name in faculty_roles:
            roles = db.query(UserRole).filter(UserRole.role == role_name).all()
            for role in roles:
                if role.user_id in staff_user_ids:
                    db.delete(role)
                    deleted_roles += 1
        print(f"   ✅ Deleted {deleted_roles} user roles")
        
        # Delete profiles
        print("\n🗑️  Deleting profiles...")
        deleted_profiles = 0
        for user_id in staff_user_ids:
            profile = db.query(Profile).filter(Profile.user_id == user_id).first()
            if profile:
                db.delete(profile)
                deleted_profiles += 1
        print(f"   ✅ Deleted {deleted_profiles} profiles")
        
        # Delete users
        print("\n🗑️  Deleting users...")
        deleted_users = 0
        for user_id in staff_user_ids:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                db.delete(user)
                deleted_users += 1
        print(f"   ✅ Deleted {deleted_users} users")
        
        # Commit all changes
        db.commit()
        
        print("\n" + "=" * 70)
        print("✅ ALL STAFF USERS REMOVED SUCCESSFULLY!")
        print("=" * 70)
        print(f"\nSummary:")
        print(f"   - Users deleted: {deleted_users}")
        print(f"   - Profiles deleted: {deleted_profiles}")
        print(f"   - Roles deleted: {deleted_roles}")
        print(f"   - HOD assignments cleared: {len(departments_with_hod)}")
        print("\n" + "=" * 70)
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    remove_all_faculty()

