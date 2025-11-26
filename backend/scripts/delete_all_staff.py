#!/usr/bin/env python3
"""
Script to delete all staff users (faculty, HOD, admin) from the database.
This will preserve students but remove all staff members.

Usage:
    python backend/scripts/delete_all_staff.py
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, Column, String, Integer, DateTime, ForeignKey, Enum
from sqlalchemy.orm import sessionmaker, declarative_base, relationship
from sqlalchemy.sql import func
import enum
from dotenv import load_dotenv

load_dotenv()

# Define models directly to avoid config issues
Base = declarative_base()

class RoleEnum(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    HOD = "hod"
    FACULTY = "faculty"
    STUDENT = "student"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    is_active = Column(String, default="true", nullable=False)
    is_verified = Column(String, default="false", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class UserRole(Base):
    __tablename__ = "user_roles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(Enum(RoleEnum), nullable=False)
    college_id = Column(Integer, nullable=True)

class Profile(Base):
    __tablename__ = "profiles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    email = Column(String, nullable=True)
    full_name = Column(String, nullable=True)
    department = Column(String, nullable=True)
    section = Column(String, nullable=True)
    roll_number = Column(String, nullable=True)
    college_id = Column(Integer, nullable=True)

class Department(Base):
    __tablename__ = "departments"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(20), nullable=True)
    college_id = Column(Integer, nullable=False)
    hod_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

# Try to find database file - check backend directory first
script_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(script_dir)
db_path_backend = os.path.join(backend_dir, "elevate_edu.db")
db_path_root = os.path.join(os.path.dirname(backend_dir), "elevate_edu.db")

# Use backend database if it exists, otherwise root
if os.path.exists(db_path_backend):
    db_path = db_path_backend
elif os.path.exists(db_path_root):
    db_path = db_path_root
else:
    db_path = db_path_backend  # Default to backend path

# Check both database locations
backend_db = os.path.abspath(os.path.join(backend_dir, "elevate_edu.db"))
root_db = os.path.abspath(os.path.join(os.path.dirname(backend_dir), "elevate_edu.db"))

# Prefer backend database, but check root if backend doesn't exist
if os.path.exists(backend_db):
    db_path = backend_db
elif os.path.exists(root_db):
    db_path = root_db
else:
    db_path = backend_db  # Default to backend

db_path = os.path.abspath(db_path)
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{db_path}")
print(f"Using database: {db_path}")
if not os.path.exists(db_path):
    print(f"⚠️  Warning: Database file not found at {db_path}")
    print("   Please ensure the database file exists or set DATABASE_URL environment variable")
    sys.exit(1)

def delete_all_staff():
    """Delete all staff users (faculty, HOD, admin) but keep students"""
    import sqlite3
    
    # Use direct SQLite connection
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Get all staff roles (faculty, HOD, admin, super_admin)
        # Check if user_roles table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user_roles'")
        if not cursor.fetchone():
            print("❌ Error: user_roles table not found in database")
            print(f"   Database path: {db_path}")
            return
        
        # Get all user IDs with staff roles using raw SQL
        # Check actual role values in database (they might be stored differently)
        cursor.execute("SELECT DISTINCT role FROM user_roles LIMIT 20")
        actual_roles = [row[0] for row in cursor.fetchall()]
        print(f"Found roles in database: {actual_roles}")
        
        # Try both lowercase and the actual values
        cursor.execute("""
            SELECT DISTINCT user_id 
            FROM user_roles 
            WHERE LOWER(role) IN ('faculty', 'hod', 'admin', 'super_admin')
               OR role IN ('faculty', 'hod', 'admin', 'super_admin', 'FACULTY', 'HOD', 'ADMIN', 'SUPER_ADMIN')
        """)
        staff_user_ids = [row[0] for row in cursor.fetchall()]
        
        print(f"Found {len(staff_user_ids)} staff users to delete")
        
        if not staff_user_ids:
            print("No staff users found. Nothing to delete.")
            return
        
        # Show what will be deleted
        print("\nStaff users to be deleted:")
        if staff_user_ids:
            placeholders = ','.join('?' * len(staff_user_ids))
            cursor.execute(f"""
                SELECT u.id, u.email, p.full_name, GROUP_CONCAT(ur.role)
                FROM users u
                LEFT JOIN profiles p ON p.user_id = u.id
                LEFT JOIN user_roles ur ON ur.user_id = u.id
                WHERE u.id IN ({placeholders})
                GROUP BY u.id, u.email, p.full_name
            """, staff_user_ids)
            for row in cursor.fetchall():
                user_id, email, name, roles = row
                print(f"  - {name or 'N/A'} ({email}) - Roles: {roles or 'N/A'}")
        else:
            print("  No staff users found.")
            return
        
        # Confirm deletion
        response = input("\nAre you sure you want to delete all staff users? (yes/no): ")
        if response.lower() != 'yes':
            print("Deletion cancelled.")
            return
        
        # Clear HOD assignments from departments
        print("\nClearing HOD assignments from departments...")
        if staff_user_ids:
            placeholders = ','.join('?' * len(staff_user_ids))
            cursor.execute(f"""
                SELECT id, name FROM departments WHERE hod_id IN ({placeholders})
            """, staff_user_ids)
            departments = cursor.fetchall()
            for dept_id, dept_name in departments:
                print(f"  - Clearing HOD from department: {dept_name}")
                cursor.execute("UPDATE departments SET hod_id = NULL WHERE id = ?", (dept_id,))
        
        # Delete user roles
        print("\nDeleting user roles...")
        if staff_user_ids:
            placeholders = ','.join('?' * len(staff_user_ids))
            cursor.execute(f"""
                DELETE FROM user_roles 
                WHERE user_id IN ({placeholders}) 
                AND (LOWER(role) IN ('faculty', 'hod', 'admin', 'super_admin')
                     OR role IN ('FACULTY', 'HOD', 'ADMIN', 'SUPER_ADMIN'))
            """, staff_user_ids)
            deleted_roles = cursor.rowcount
            print(f"  - Deleted {deleted_roles} role assignments")
        
        # Delete profiles
        print("\nDeleting profiles...")
        if staff_user_ids:
            placeholders = ','.join('?' * len(staff_user_ids))
            cursor.execute(f"DELETE FROM profiles WHERE user_id IN ({placeholders})", staff_user_ids)
            deleted_profiles = cursor.rowcount
            print(f"  - Deleted {deleted_profiles} profiles")
        
        # Delete users
        print("\nDeleting users...")
        if staff_user_ids:
            placeholders = ','.join('?' * len(staff_user_ids))
            cursor.execute(f"DELETE FROM users WHERE id IN ({placeholders})", staff_user_ids)
            deleted_users = cursor.rowcount
            print(f"  - Deleted {deleted_users} users")
        
        conn.commit()
        
        print(f"\n✅ Successfully deleted {deleted_users} staff users!")
        print("   - All faculty, HOD, admin, and super_admin users have been removed")
        print("   - Student users have been preserved")
        print("   - Department HOD assignments have been cleared")
        
    except Exception as e:
        conn.rollback()
        print(f"\n❌ Error deleting staff users: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    print("=" * 60)
    print("Delete All Staff Users Script")
    print("=" * 60)
    print("\nThis script will delete:")
    print("  - All faculty users")
    print("  - All HOD users")
    print("  - All admin users")
    print("  - All super_admin users")
    print("\nThis script will preserve:")
    print("  - All student users")
    print("=" * 60)
    
    delete_all_staff()

