#!/usr/bin/env python3
"""Create test users for all roles with ID-based passwords"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.models.user import User, UserRole, RoleEnum
from app.models.profile import Profile
from app.models.college import College
from app.core.security import get_password_hash

def create_test_users():
    """Create test users for all roles"""
    db = SessionLocal()
    
    try:
        # First, ensure we have at least one college
        college = db.query(College).first()
        if not college:
            college = College(
                name="Test College",
                code="TC001",
                location="Test Location",
                is_active="true"
            )
            db.add(college)
            db.commit()
            db.refresh(college)
            print(f"✅ Created college: {college.name} (ID: {college.id})")
        
        college_id = college.id
        
        # Test users data
        test_users = [
            # Super Admin
            {
                "email": "superadmin@elevate.edu",
                "full_name": "Super Admin",
                "role": RoleEnum.SUPER_ADMIN,
                "college_id": None,
                "user_id": "SA001"
            },
            # College Admin
            {
                "email": "admin@elevate.edu",
                "full_name": "College Admin",
                "role": RoleEnum.ADMIN,
                "college_id": college_id,
                "user_id": "ADMIN001"
            },
            # HOD
            {
                "email": "hod.cs@elevate.edu",
                "full_name": "Dr. HOD Computer Science",
                "role": RoleEnum.HOD,
                "college_id": college_id,
                "department": "Computer Science",
                "user_id": "HOD001"
            },
            # Faculty
            {
                "email": "faculty.cs@elevate.edu",
                "full_name": "Dr. Faculty CS",
                "role": RoleEnum.FACULTY,
                "college_id": college_id,
                "department": "Computer Science",
                "user_id": "FAC001"
            },
            {
                "email": "faculty.ds@elevate.edu",
                "full_name": "Dr. Faculty Data Science",
                "role": RoleEnum.FACULTY,
                "college_id": college_id,
                "department": "Data Science",
                "user_id": "FAC002"
            },
            # Students
            {
                "email": "student1@elevate.edu",
                "full_name": "Student One",
                "role": RoleEnum.STUDENT,
                "college_id": college_id,
                "department": "Computer Science",
                "section": "A",
                "roll_number": "STU001",
                "present_year": "1st",
                "user_id": "STU001"
            },
            {
                "email": "student2@elevate.edu",
                "full_name": "Student Two",
                "role": RoleEnum.STUDENT,
                "college_id": college_id,
                "department": "Computer Science",
                "section": "B",
                "roll_number": "STU002",
                "present_year": "2nd",
                "user_id": "STU002"
            },
            {
                "email": "student3@elevate.edu",
                "full_name": "Student Three",
                "role": RoleEnum.STUDENT,
                "college_id": college_id,
                "department": "Data Science",
                "section": "A",
                "roll_number": "STU003",
                "present_year": "1st",
                "user_id": "STU003"
            },
        ]
        
        created_count = 0
        skipped_count = 0
        
        for user_data in test_users:
            email = user_data["email"]
            user_id = user_data.get("user_id", "")
            
            # Check if user already exists
            existing = db.query(User).filter(User.email == email).first()
            if existing:
                print(f"⏭️  User already exists: {email}")
                skipped_count += 1
                continue
            
            # Generate password from user_id in caps, or use user.id after creation
            password = user_id.upper() if user_id else "TEMP"
            
            # Create user
            user = User(
                email=email,
                password_hash=get_password_hash(password),
                is_active="true",
                is_verified="true"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            
            # If no user_id provided, update password with user.id in caps
            if not user_id:
                user.password_hash = get_password_hash(str(user.id).upper())
                db.commit()
            
            # Create role
            role = UserRole(
                user_id=user.id,
                role=user_data["role"],
                college_id=user_data.get("college_id")
            )
            db.add(role)
            
            # Create profile
            profile = Profile(
                user_id=user.id,
                email=email,
                full_name=user_data["full_name"],
                college_id=user_data.get("college_id"),
                department=user_data.get("department"),
                section=user_data.get("section"),
                roll_number=user_data.get("roll_number"),
                present_year=user_data.get("present_year")
            )
            db.add(profile)
            
            db.commit()
            
            print(f"✅ Created: {email} ({user_data['role'].value}) - Password: {password}")
            created_count += 1
        
        print(f"\n🎉 Summary:")
        print(f"   ✅ Created: {created_count} users")
        print(f"   ⏭️  Skipped: {skipped_count} users (already exist)")
        print(f"\n📋 Test Credentials (Email / Password):")
        print(f"   Super Admin: superadmin@elevate.edu / SA001")
        print(f"   College Admin: admin@elevate.edu / ADMIN001")
        print(f"   HOD: hod.cs@elevate.edu / HOD001")
        print(f"   Faculty: faculty.cs@elevate.edu / FAC001")
        print(f"   Faculty: faculty.ds@elevate.edu / FAC002")
        print(f"   Student: student1@elevate.edu / STU001")
        print(f"   Student: student2@elevate.edu / STU002")
        print(f"   Student: student3@elevate.edu / STU003")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_test_users()

