#!/usr/bin/env python3
"""
Script to delete ALL users from the database (including students).
This will completely clean the user database.

Usage:
    python backend/scripts/delete_all_users.py
"""

import sys
import os
import sqlite3

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

def delete_all_users():
    """Delete ALL users from the database"""
    print(f"Using database: {db_path}")
    
    if not os.path.exists(db_path):
        print(f"❌ Error: Database file not found at {db_path}")
        sys.exit(1)
    
    # Use direct SQLite connection
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if tables exist
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        if not cursor.fetchone():
            print("❌ Error: users table not found in database")
            return
        
        # Get count of all users
        cursor.execute("SELECT COUNT(*) FROM users")
        total_users = cursor.fetchone()[0]
        
        print("=" * 60)
        print("Delete ALL Users Script")
        print("=" * 60)
        print(f"\nFound {total_users} users in the database")
        
        if total_users == 0:
            print("No users found. Nothing to delete.")
            return
        
        # Show sample of users to be deleted
        print("\nSample users to be deleted (first 10):")
        cursor.execute("""
            SELECT u.id, u.email, p.full_name, GROUP_CONCAT(ur.role)
            FROM users u
            LEFT JOIN profiles p ON p.user_id = u.id
            LEFT JOIN user_roles ur ON ur.user_id = u.id
            GROUP BY u.id, u.email, p.full_name
            LIMIT 10
        """)
        for row in cursor.fetchall():
            user_id, email, name, roles = row
            print(f"  - {name or 'N/A'} ({email}) - Roles: {roles or 'N/A'}")
        
        if total_users > 10:
            print(f"  ... and {total_users - 10} more users")
        
        # Confirm deletion
        print("\n" + "=" * 60)
        print("⚠️  WARNING: This will delete ALL users including:")
        print("   - All students")
        print("   - All faculty")
        print("   - All HODs")
        print("   - All admins")
        print("   - All super admins")
        print("=" * 60)
        response = input("\nAre you absolutely sure you want to delete ALL users? (type 'DELETE ALL' to confirm): ")
        if response != 'DELETE ALL':
            print("Deletion cancelled.")
            return
        
        print("\nStarting deletion process...")
        
        # Step 1: Clear HOD assignments from departments
        print("\n[1/5] Clearing HOD assignments from departments...")
        cursor.execute("UPDATE departments SET hod_id = NULL WHERE hod_id IS NOT NULL")
        cleared_hods = cursor.rowcount
        print(f"  ✅ Cleared {cleared_hods} HOD assignments")
        
        # Step 2: Delete all user roles
        print("\n[2/5] Deleting all user roles...")
        cursor.execute("DELETE FROM user_roles")
        deleted_roles = cursor.rowcount
        print(f"  ✅ Deleted {deleted_roles} role assignments")
        
        # Step 3: Delete all profiles
        print("\n[3/5] Deleting all profiles...")
        cursor.execute("DELETE FROM profiles")
        deleted_profiles = cursor.rowcount
        print(f"  ✅ Deleted {deleted_profiles} profiles")
        
        # Step 4: Delete all users
        print("\n[4/5] Deleting all users...")
        cursor.execute("DELETE FROM users")
        deleted_users = cursor.rowcount
        print(f"  ✅ Deleted {deleted_users} users")
        
        # Step 5: Verify deletion
        print("\n[5/5] Verifying deletion...")
        cursor.execute("SELECT COUNT(*) FROM users")
        remaining_users = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM profiles")
        remaining_profiles = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM user_roles")
        remaining_roles = cursor.fetchone()[0]
        
        if remaining_users == 0 and remaining_profiles == 0 and remaining_roles == 0:
            print("  ✅ Verification successful - all users deleted")
        else:
            print(f"  ⚠️  Warning: Some data remains - Users: {remaining_users}, Profiles: {remaining_profiles}, Roles: {remaining_roles}")
        
        conn.commit()
        
        print("\n" + "=" * 60)
        print("✅ Successfully deleted ALL users!")
        print("=" * 60)
        print(f"   - Deleted {deleted_users} users")
        print(f"   - Deleted {deleted_profiles} profiles")
        print(f"   - Deleted {deleted_roles} role assignments")
        print(f"   - Cleared {cleared_hods} HOD assignments")
        print("\n📝 Next steps:")
        print("   1. Run: python backend/scripts/create_super_admin.py")
        print("   2. Log in as super admin")
        print("   3. Create colleges, departments, and users from scratch")
        print("=" * 60)
        
    except Exception as e:
        conn.rollback()
        print(f"\n❌ Error deleting users: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    delete_all_users()

