#!/usr/bin/env python3
"""
Script to create multiple dummy super admin users.
Works with both PostgreSQL (production) and SQLite (local).

Usage:
    # Local (SQLite):
    python backend/scripts/create_dummy_super_admins.py
    
    # Production (PostgreSQL - inside Docker):
    docker exec -it elevate_edu_api python scripts/create_dummy_super_admins.py
    
    # Or with custom count:
    python backend/scripts/create_dummy_super_admins.py --count 5
"""

import sys
import os
import argparse
from datetime import datetime

# Add backend directory to path
script_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(script_dir)
sys.path.insert(0, backend_dir)

from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.profile import Profile

# Predefined dummy super admin credentials
# These can be used on both local and production
DUMMY_SUPER_ADMINS = [
    {
        "email": "admin1@elevate.edu",
        "password": "Admin123!",
        "full_name": "Super Admin One"
    },
    {
        "email": "admin2@elevate.edu",
        "password": "Admin123!",
        "full_name": "Super Admin Two"
    },
    {
        "email": "admin3@elevate.edu",
        "password": "Admin123!",
        "full_name": "Super Admin Three"
    },
    {
        "email": "superadmin@elevate.edu",
        "password": "SuperAdmin123!",
        "full_name": "Super Administrator"
    },
    {
        "email": "admin@elevate.edu",
        "password": "SvnaJobs@123",
        "full_name": "Main Administrator"
    }
]

def create_super_admin(email: str, password: str, full_name: str, db: SessionLocal, skip_existing: bool = True):
    """Create a super admin user"""
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == email.lower()).first()
        
        if existing_user:
            if skip_existing:
                print(f"⏭️  User {email} already exists, skipping...")
                return False
            
            # Update existing user
            print(f"🔄 Updating existing user {email}...")
            existing_user.password_hash = get_password_hash(password)
            existing_user.is_active = "true"
            existing_user.is_verified = "true"
            
            # Update profile
            profile = db.query(Profile).filter(Profile.user_id == existing_user.id).first()
            if profile:
                profile.full_name = full_name
                profile.email = email.lower()
            else:
                profile = Profile(
                    user_id=existing_user.id,
                    email=email.lower(),
                    full_name=full_name
                )
                db.add(profile)
            
            # Delete existing roles and add super_admin role
            db.query(UserRole).filter(UserRole.user_id == existing_user.id).delete()
            role = UserRole(
                user_id=existing_user.id,
                role="SUPER_ADMIN",
                college_id=None
            )
            db.add(role)
            
            db.commit()
            print(f"✅ Updated user {email} to super admin")
            return True
        else:
            # Create new user
            user = User(
                email=email.lower(),
                password_hash=get_password_hash(password),
                is_active="true",
                is_verified="true"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            
            # Create profile
            profile = Profile(
                user_id=user.id,
                email=email.lower(),
                full_name=full_name
            )
            db.add(profile)
            
            # Create super_admin role
            role = UserRole(
                user_id=user.id,
                role="SUPER_ADMIN",
                college_id=None
            )
            db.add(role)
            
            db.commit()
            print(f"✅ Created super admin user: {email}")
            return True
            
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating/updating {email}: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    parser = argparse.ArgumentParser(description='Create multiple dummy super admin users')
    parser.add_argument('--count', type=int, default=len(DUMMY_SUPER_ADMINS), 
                       help=f'Number of super admins to create (default: {len(DUMMY_SUPER_ADMINS)})')
    parser.add_argument('--update-existing', action='store_true',
                       help='Update existing users instead of skipping them')
    parser.add_argument('--password', type=str, default=None,
                       help='Use same password for all admins (overrides default passwords)')
    
    args = parser.parse_args()
    
    print("=" * 70)
    print("Create Dummy Super Admin Users")
    print("=" * 70)
    
    # Determine which admins to create
    admins_to_create = DUMMY_SUPER_ADMINS[:args.count]
    
    if args.password:
        # Override all passwords with the same one
        for admin in admins_to_create:
            admin['password'] = args.password
    
    print(f"\n📋 Will create/update {len(admins_to_create)} super admin(s):")
    for i, admin in enumerate(admins_to_create, 1):
        print(f"   {i}. {admin['email']} - {admin['full_name']}")
    print("=" * 70)
    
    db = SessionLocal()
    success_count = 0
    
    try:
        for admin in admins_to_create:
            if create_super_admin(
                admin['email'], 
                admin['password'], 
                admin['full_name'],
                db,
                skip_existing=not args.update_existing
            ):
                success_count += 1
        
        print("\n" + "=" * 70)
        print("✅ Super Admins Creation Complete!")
        print("=" * 70)
        print(f"\n📊 Summary:")
        print(f"   Total: {len(admins_to_create)}")
        print(f"   Created/Updated: {success_count}")
        print(f"   Skipped: {len(admins_to_create) - success_count}")
        
        print("\n📋 Credentials (Use these on both local and production):")
        print("-" * 70)
        for admin in admins_to_create:
            print(f"\n   Email: {admin['email']}")
            print(f"   Password: {admin['password']}")
            print(f"   Full Name: {admin['full_name']}")
            print(f"   Role: Staff (Super Admin)")
        
        print("\n" + "=" * 70)
        print("🌐 Login URLs:")
        print("   Local: http://localhost:8080/login")
        print("   Production: http://72.60.101.14/login")
        print("   Production (Domain): http://srv1159261.hstgr.cloud/login")
        print("\n📝 Steps to login:")
        print("   1. Visit the login page")
        print("   2. Select 'Staff' role")
        print("   3. Use any of the credentials above")
        print("   4. You'll have full super admin access")
        print("=" * 70)
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    main()

