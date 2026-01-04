#!/usr/bin/env python3
"""Create test users for E2E testing with passwords matching Cypress tests"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.models.user import User, UserRole, RoleEnum
from app.models.profile import Profile
from app.models.college import College
from app.core.security import get_password_hash

def create_e2e_test_users():
    """Create test users for E2E testing with specific passwords"""
    db = SessionLocal()
    
    try:
        # First, ensure we have at least one college
        college = db.query(College).first()
        if not college:
            college = College(
                name="Elevate Edu",
                code="EE001",
                location="Test Location",
                is_active="true"
            )
            db.add(college)
            db.commit()
            db.refresh(college)
            print(f"✅ Created college: {college.name} (ID: {college.id})")
        else:
            print(f"ℹ️  Using existing college: {college.name} (ID: {college.id})")
        
        college_id = college.id
        
        # Test users data matching Cypress test expectations
        test_users = [
            # Super Admin - password: SuperAdmin@123
            {
                "email": "superadmin@elevate.edu",
                "full_name": "Super Admin",
                "role": RoleEnum.SUPER_ADMIN,
                "college_id": None,
                "password": "SuperAdmin@123"
            },
            # College Admin - password: Admin@123
            {
                "email": "admin@elevate.edu",
                "full_name": "College Admin",
                "role": RoleEnum.ADMIN,
                "college_id": college_id,
                "password": "Admin@123"
            },
            # HOD - password: Faculty@123
            {
                "email": "hod.cs@elevate.edu",
                "full_name": "Dr. HOD Computer Science",
                "role": RoleEnum.HOD,
                "college_id": college_id,
                "department": "Computer Science",
                "password": "Faculty@123"
            },
            # Faculty - password: Faculty@123
            {
                "email": "faculty.cs@elevate.edu",
                "full_name": "Dr. Faculty CS",
                "role": RoleEnum.FACULTY,
                "college_id": college_id,
                "department": "Computer Science",
                "password": "Faculty@123"
            },
            # Student 1 - password: Student@123
            {
                "email": "student1@elevate.edu",
                "full_name": "Student One",
                "role": RoleEnum.STUDENT,
                "college_id": college_id,
                "department": "Computer Science",
                "section": "A",
                "roll_number": "STU001",
                "present_year": "1",
                "password": "Student@123"
            },
            # Student 2 - password: Student@123
            {
                "email": "student2@elevate.edu",
                "full_name": "Student Two",
                "role": RoleEnum.STUDENT,
                "college_id": college_id,
                "department": "Computer Science",
                "section": "B",
                "roll_number": "STU002",
                "present_year": "2",
                "password": "Student@123"
            },
        ]
        
        created_count = 0
        updated_count = 0
        skipped_count = 0
        
        for user_data in test_users:
            email = user_data["email"]
            password = user_data["password"]
            
            # Check if user already exists
            existing = db.query(User).filter(User.email == email).first()
            if existing:
                # Update password if user exists
                existing.password_hash = get_password_hash(password)
                db.commit()
                print(f"🔄 Updated password for: {email} ({user_data['role'].value}) - Password: {password}")
                updated_count += 1
                
                # Ensure role exists
                role = db.query(UserRole).filter(
                    UserRole.user_id == existing.id,
                    UserRole.role == user_data["role"]
                ).first()
                if not role:
                    role = UserRole(
                        user_id=existing.id,
                        role=user_data["role"],
                        college_id=user_data.get("college_id")
                    )
                    db.add(role)
                    db.commit()
                
                # Ensure profile exists
                profile = db.query(Profile).filter(Profile.user_id == existing.id).first()
                if profile:
                    # Update profile if needed
                    profile.full_name = user_data["full_name"]
                    profile.college_id = user_data.get("college_id")
                    profile.department = user_data.get("department")
                    profile.section = user_data.get("section")
                    profile.roll_number = user_data.get("roll_number")
                    profile.present_year = user_data.get("present_year")
                else:
                    profile = Profile(
                        user_id=existing.id,
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
                continue
            
            # Create new user
            user = User(
                email=email,
                password_hash=get_password_hash(password),
                is_active="true",
                is_verified="true"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            
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
        print(f"   🔄 Updated: {updated_count} users")
        print(f"   ⏭️  Skipped: {skipped_count} users")
        print(f"\n📋 E2E Test Credentials (Email / Password):")
        print(f"   Super Admin: superadmin@elevate.edu / SuperAdmin@123")
        print(f"   College Admin: admin@elevate.edu / Admin@123")
        print(f"   HOD: hod.cs@elevate.edu / Faculty@123")
        print(f"   Faculty: faculty.cs@elevate.edu / Faculty@123")
        print(f"   Student: student1@elevate.edu / Student@123")
        print(f"   Student: student2@elevate.edu / Student@123")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_e2e_test_users()

