#!/usr/bin/env python3
"""
Script to create a super admin user in PostgreSQL.
Run this inside the Docker container or with DATABASE_URL set.

Usage:
    # Inside Docker container:
    docker exec -it elevate_edu_api python scripts/create_super_admin_postgres.py
    
    # Or with custom email/password:
    docker exec -it elevate_edu_api python scripts/create_super_admin_postgres.py --email admin@elevate.edu --password Admin123
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

def create_super_admin(email: str = "superadmin@elevate.edu", password: str = "SuperAdmin123", full_name: str = "Super Administrator"):
    """Create a super admin user"""
    db = SessionLocal()
    
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == email.lower()).first()
        
        if existing_user:
            print(f"⚠️  User with email {email} already exists (ID: {existing_user.id})")
            # Auto-update if running non-interactively (e.g., from deploy script)
            import sys
            if not sys.stdin.isatty():
                print("Non-interactive mode: Auto-updating to super admin...")
                response = 'yes'
            else:
                response = input("Do you want to update this user to super admin? (yes/no): ")
            if response.lower() != 'yes':
                print("Cancelled.")
                return
            
            # Update existing user
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
        
        print("\n" + "=" * 60)
        print("✅ Super Admin Created Successfully!")
        print("=" * 60)
        print(f"   Email: {email}")
        print(f"   Password: {password}")
        print(f"   Full Name: {full_name}")
        print("\n📝 You can now:")
        print("   1. Log in at http://72.60.101.14/login")
        print("   2. Select 'Staff' role")
        print("   3. Use the credentials above")
        print("   4. Create colleges and departments")
        print("   5. Create users (HODs, faculty, students)")
        print("=" * 60)
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ Error creating super admin: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Create a super admin user')
    parser.add_argument('--email', default='superadmin@elevate.edu', help='Email for super admin')
    parser.add_argument('--password', default='SuperAdmin123', help='Password for super admin')
    parser.add_argument('--name', default='Super Administrator', help='Full name for super admin')
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("Create Super Admin Script (PostgreSQL)")
    print("=" * 60)
    print(f"\nCreating super admin with:")
    print(f"  Email: {args.email}")
    print(f"  Name: {args.name}")
    print("=" * 60)
    
    create_super_admin(args.email, args.password, args.name)

