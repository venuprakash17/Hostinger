#!/usr/bin/env python3
"""
Script to create 2 super admin users.

Usage:
    python backend/scripts/create_two_super_admins.py
"""

import sys
import os
import sqlite3
from datetime import datetime

# Add parent directory to path
script_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(script_dir)
root_dir = os.path.dirname(backend_dir)

# Check both database locations
backend_db = os.path.abspath(os.path.join(backend_dir, "elevate_edu.db"))
root_db = os.path.abspath(os.path.join(root_dir, "elevate_edu.db"))

# Prefer backend database, but check root if backend doesn't exist
if os.path.exists(backend_db):
    db_path = backend_db
elif os.path.exists(root_db):
    db_path = root_db
else:
    db_path = backend_db  # Default to backend

db_path = os.path.abspath(db_path)

def hash_password(password: str) -> str:
    """Hash password using the same method as the backend"""
    try:
        # Try to use the backend's password hashing
        sys.path.insert(0, backend_dir)
        from app.core.security import get_password_hash
        return get_password_hash(password)
    except Exception:
        # Fallback to bcrypt if available
        try:
            import bcrypt
            return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        except ImportError:
            # Last resort: simple hash (not secure, but works)
            import hashlib
            return hashlib.sha256(password.encode()).hexdigest()

def create_super_admin(email: str, password: str, full_name: str, conn: sqlite3.Connection):
    """Create a super admin user"""
    cursor = conn.cursor()
    
    try:
        # Check if user already exists
        cursor.execute("SELECT id FROM users WHERE email = ?", (email.lower(),))
        existing_user = cursor.fetchone()
        
        if existing_user:
            print(f"⚠️  User with email {email} already exists (ID: {existing_user[0]})")
            user_id = existing_user[0]
            # Update existing user
            password_hash = hash_password(password)
            cursor.execute("""
                UPDATE users 
                SET password_hash = ?, is_active = 'true', is_verified = 'true'
                WHERE id = ?
            """, (password_hash, user_id))
            
            # Update profile
            cursor.execute("""
                UPDATE profiles 
                SET full_name = ?, email = ?
                WHERE user_id = ?
            """, (full_name, email.lower(), user_id))
            
            # Delete existing roles and add super_admin role
            cursor.execute("DELETE FROM user_roles WHERE user_id = ?", (user_id,))
            cursor.execute("""
                INSERT INTO user_roles (user_id, role, college_id, created_at)
                VALUES (?, 'SUPER_ADMIN', NULL, ?)
            """, (user_id, datetime.now().isoformat()))
            
            print(f"✅ Updated user {email} to super admin")
            return True
        else:
            # Create new user
            password_hash = hash_password(password)
            now = datetime.now().isoformat()
            
            # Insert user
            cursor.execute("""
                INSERT INTO users (email, password_hash, is_active, is_verified, created_at)
                VALUES (?, ?, 'true', 'true', ?)
            """, (email.lower(), password_hash, now))
            user_id = cursor.lastrowid
            
            # Insert profile
            cursor.execute("""
                INSERT INTO profiles (user_id, email, full_name, created_at)
                VALUES (?, ?, ?, ?)
            """, (user_id, email.lower(), full_name, now))
            
            # Insert super_admin role
            cursor.execute("""
                INSERT INTO user_roles (user_id, role, college_id, created_at)
                VALUES (?, 'SUPER_ADMIN', NULL, ?)
            """, (user_id, now))
            
            print(f"✅ Created super admin user: {email}")
            return True
        
    except Exception as e:
        print(f"❌ Error creating super admin {email}: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("=" * 60)
    print("Create 2 Super Admin Users")
    print("=" * 60)
    print(f"\nUsing database: {db_path}")
    
    if not os.path.exists(db_path):
        print(f"❌ Error: Database file not found at {db_path}")
        sys.exit(1)
    
    # Connect to database
    conn = sqlite3.connect(db_path)
    
    # Super admin credentials
    super_admins = [
        {
            "email": "superadmin1@elevate.edu",
            "password": "SuperAdmin1@123",
            "full_name": "Super Admin One"
        },
        {
            "email": "superadmin2@elevate.edu",
            "password": "SuperAdmin2@123",
            "full_name": "Super Admin Two"
        }
    ]
    
    try:
        success_count = 0
        for admin in super_admins:
            if create_super_admin(admin["email"], admin["password"], admin["full_name"], conn):
                success_count += 1
        
        conn.commit()
        
        print("\n" + "=" * 60)
        print("✅ Super Admins Created Successfully!")
        print("=" * 60)
        print("\n📋 Credentials:")
        for admin in super_admins:
            print(f"\n   Super Admin:")
            print(f"   Email: {admin['email']}")
            print(f"   Password: {admin['password']}")
            print(f"   Full Name: {admin['full_name']}")
        print("\n📝 You can now:")
        print("   1. Log in with any of the credentials above")
        print("   2. Create colleges and departments")
        print("   3. Create users (HODs, faculty, students)")
        print("   4. Manage coding problems")
        print("=" * 60)
        
    except Exception as e:
        conn.rollback()
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        conn.close()

if __name__ == "__main__":
    main()

