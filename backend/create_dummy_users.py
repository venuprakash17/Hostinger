"""Script to create dummy users for testing all roles"""
import sys
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, Base, engine
from app.models.user import User, UserRole, RoleEnum
from app.models.profile import Profile
from app.models.college import College
from app.core.security import get_password_hash

def create_dummy_users():
    """Create dummy users with all roles"""
    
    # Create database tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    db: Session = SessionLocal()
    
    try:
        # Create a default college
        college = db.query(College).filter(College.code == "TEST001").first()
        if not college:
            college = College(
                name="Test University",
                code="TEST001",
                city="Test City",
                state="Test State"
            )
            db.add(college)
            db.commit()
            db.refresh(college)
            print(f"✅ Created college: {college.name}")
        
        # Create SBIT college if needed
        sbit_college = db.query(College).filter(College.code == "SBIT").first()
        if not sbit_college:
            sbit_college = College(
                name="Swarna Bharathi Institute of Science and Technology",
                code="SBIT",
                city="Hyderabad",
                state="Telangana"
            )
            db.add(sbit_college)
            db.commit()
            db.refresh(sbit_college)
            print(f"✅ Created college: {sbit_college.name}")
        
        # Dummy users data
        users_data = [
            # Super Admin
            {
                "email": "superadmin@elevate.edu",
                "password": "SuperAdmin@123",
                "full_name": "Super Admin",
                "role": RoleEnum.SUPER_ADMIN,
                "college_id": None,
            },
            # Admin - Generic
            {
                "email": "admin@elevate.edu",
                "password": "Admin@123",
                "full_name": "College Admin",
                "role": RoleEnum.ADMIN,
                "college_id": college.id,
            },
            # Admin - SBIT
            {
                "email": "admin@sbit.edu",
                "password": "CollegeAdmin@123",
                "full_name": "College Administrator",
                "role": RoleEnum.ADMIN,
                "college_id": sbit_college.id,
            },
            # Admin - JNTUH
            {
                "email": "admin@jntuh.edu",
                "password": "CollegeAdmin@123",
                "full_name": "JNTU Admin",
                "role": RoleEnum.ADMIN,
                "college_id": sbit_college.id,  # Using same college for now
            },
            # Faculty
            {
                "email": "faculty1@elevate.edu",
                "password": "Faculty@123",
                "full_name": "Dr. John Smith",
                "role": RoleEnum.FACULTY,
                "college_id": college.id,
            },
            {
                "email": "faculty2@elevate.edu",
                "password": "Faculty@123",
                "full_name": "Prof. Sarah Johnson",
                "role": RoleEnum.FACULTY,
                "college_id": college.id,
            },
            # Faculty - SBIT
            {
                "email": "faculty.cs@sbit.edu",
                "password": "Faculty@123",
                "full_name": "CS Faculty Member",
                "role": RoleEnum.FACULTY,
                "college_id": sbit_college.id,
            },
            # Students
            {
                "email": "student1@elevate.edu",
                "password": "Student@123",
                "full_name": "Alice Williams",
                "role": RoleEnum.STUDENT,
                "college_id": college.id,
                "roll_number": "STU001",
                "department": "Computer Science",
                "section": "A",
            },
            # Student - SBIT
            {
                "email": "student1@sbit.edu",
                "password": "Student@123",
                "full_name": "John Doe",
                "role": RoleEnum.STUDENT,
                "college_id": sbit_college.id,
                "roll_number": "CS2021001",
                "department": "Computer Science",
                "section": "CS-A",
            },
            {
                "email": "student2@elevate.edu",
                "password": "Student@123",
                "full_name": "Bob Anderson",
                "role": RoleEnum.STUDENT,
                "college_id": college.id,
                "roll_number": "STU002",
                "department": "Computer Science",
                "section": "B",
            },
            {
                "email": "student3@elevate.edu",
                "password": "Student@123",
                "full_name": "Charlie Brown",
                "role": RoleEnum.STUDENT,
                "college_id": college.id,
                "roll_number": "STU003",
                "department": "Electronics",
                "section": "A",
            },
            {
                "email": "student4@elevate.edu",
                "password": "Student@123",
                "full_name": "Diana Prince",
                "role": RoleEnum.STUDENT,
                "college_id": college.id,
                "roll_number": "STU004",
                "department": "Mechanical",
                "section": "A",
            },
        ]
        
        created_count = 0
        skipped_count = 0
        
        for user_data in users_data:
            email = user_data["email"]
            
            # Check if user already exists
            existing_user = db.query(User).filter(User.email == email).first()
            if existing_user:
                print(f"⏭️  User already exists: {email}")
                skipped_count += 1
                continue
            
            # Create user
            user = User(
                email=email,
                password_hash=get_password_hash(user_data["password"]),
                is_active="true",
                is_verified="true"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            
            # Create user role
            role = UserRole(
                user_id=user.id,
                role=user_data["role"],
                college_id=user_data.get("college_id")
            )
            db.add(role)
            
            # Create profile
            profile = Profile(
                user_id=user.id,
                email=user.email,
                full_name=user_data["full_name"],
                college_id=user_data.get("college_id"),
                department=user_data.get("department"),
                section=user_data.get("section"),
                roll_number=user_data.get("roll_number")
            )
            db.add(profile)
            
            db.commit()
            
            print(f"✅ Created: {email} ({user_data['role'].value}) - {user_data['full_name']}")
            created_count += 1
        
        print(f"\n🎉 Summary:")
        print(f"   ✅ Created: {created_count} users")
        print(f"   ⏭️  Skipped: {skipped_count} users (already exist)")
        print(f"\n📋 Test Credentials:")
        print(f"   Super Admin: superadmin@elevate.edu / SuperAdmin@123")
        print(f"   Admin: admin@elevate.edu / Admin@123")
        print(f"   Faculty: faculty1@elevate.edu / Faculty@123")
        print(f"   Student: student1@elevate.edu / Student@123")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    print("🚀 Creating dummy users for testing...\n")
    create_dummy_users()
    print("\n✅ Done! You can now test the application.")

