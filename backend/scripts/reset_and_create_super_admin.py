#!/usr/bin/env python3
"""
Reset all users and create a fresh super admin
WARNING: This will delete ALL users from the database!
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal, engine
from app.models.user import User, UserRole
from app.models.profile import Profile
from app.core.security import get_password_hash

def reset_and_create_super_admin():
    """Delete all users and create a fresh super admin"""
    db = SessionLocal()
    
    try:
        print("=" * 70)
        print("RESETTING DATABASE AND CREATING FRESH SUPER ADMIN")
        print("=" * 70)
        
        # Count existing users
        user_count = db.query(User).count()
        print(f"\n📊 Found {user_count} existing users")
        
        if user_count > 0:
            print("\n🗑️  Deleting all existing users...")
            
            # Delete all user roles first (foreign key constraint)
            deleted_roles = db.query(UserRole).delete()
            print(f"   ✅ Deleted {deleted_roles} user roles")
            
            # Delete all profiles
            deleted_profiles = db.query(Profile).delete()
            print(f"   ✅ Deleted {deleted_profiles} profiles")
            
            # Delete all users
            deleted_users = db.query(User).delete()
            print(f"   ✅ Deleted {deleted_users} users")
            
            db.commit()
            print("\n✅ All users deleted successfully!")
        else:
            print("\n✅ No users to delete")
        
        # Create fresh super admin
        print("\n" + "=" * 70)
        print("CREATING FRESH SUPER ADMIN")
        print("=" * 70)
        
        email = "admin@elevate.edu"
        password = "Admin123!"
        full_name = "Super Administrator"
        
        # Create user
        new_user = User(
            email=email.lower(),
            password_hash=get_password_hash(password),
            is_active="true",
            is_verified="true"
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        print(f"\n✅ Created user: {email} (ID: {new_user.id})")
        
        # Create profile
        profile = Profile(
            user_id=new_user.id,
            email=email.lower(),
            full_name=full_name
        )
        db.add(profile)
        db.commit()
        
        print(f"✅ Created profile: {full_name}")
        
        # Create super admin role
        role = UserRole(
            user_id=new_user.id,
            role="super_admin",
            college_id=None
        )
        db.add(role)
        db.commit()
        
        print(f"✅ Created super_admin role")
        
        # Verify creation
        db.refresh(new_user)
        user_roles = db.query(UserRole).filter(UserRole.user_id == new_user.id).all()
        role_names = [r.role.value for r in user_roles]
        
        print("\n" + "=" * 70)
        print("✅ SUPER ADMIN CREATED SUCCESSFULLY!")
        print("=" * 70)
        print(f"\n📧 Email: {email}")
        print(f"🔑 Password: {password}")
        print(f"👤 Full Name: {full_name}")
        print(f"🆔 User ID: {new_user.id}")
        print(f"👥 Roles: {role_names}")
        print(f"✅ Active: {new_user.is_active}")
        print(f"✅ Verified: {new_user.is_verified}")
        print("\n" + "=" * 70)
        print("🚀 Login Instructions:")
        print("=" * 70)
        print(f"1. Visit: http://localhost:8080/login")
        print(f"2. Select 'Staff' tab")
        print(f"3. Email: {email}")
        print(f"4. Password: {password}")
        print(f"5. Click 'Sign In as Staff'")
        print("=" * 70)
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    reset_and_create_super_admin()

