#!/bin/bash
# Quick fix to create super admin script in Docker container
# Run this on your VPS

echo "📝 Creating super admin script in Docker container..."

docker exec -it elevate_edu_api bash -c 'mkdir -p /app/scripts && cat > /app/scripts/create_super_admin_postgres.py << '\''EOF'\''
#!/usr/bin/env python3
import sys, os, argparse
from datetime import datetime
script_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(script_dir)
sys.path.insert(0, backend_dir)
from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.profile import Profile

def create_super_admin(email="superadmin@elevate.edu", password="SuperAdmin123", full_name="Super Administrator"):
    db = SessionLocal()
    try:
        existing_user = db.query(User).filter(User.email == email.lower()).first()
        if existing_user:
            print(f"⚠️  User {email} exists. Updating...")
            existing_user.password_hash = get_password_hash(password)
            existing_user.is_active = "true"
            existing_user.is_verified = "true"
            profile = db.query(Profile).filter(Profile.user_id == existing_user.id).first()
            if profile:
                profile.full_name = full_name
            else:
                profile = Profile(user_id=existing_user.id, email=email.lower(), full_name=full_name)
                db.add(profile)
            db.query(UserRole).filter(UserRole.user_id == existing_user.id).delete()
            role = UserRole(user_id=existing_user.id, role="SUPER_ADMIN", college_id=None)
            db.add(role)
            db.commit()
            print(f"✅ Updated {email} to super admin")
        else:
            user = User(email=email.lower(), password_hash=get_password_hash(password), is_active="true", is_verified="true")
            db.add(user)
            db.commit()
            db.refresh(user)
            profile = Profile(user_id=user.id, email=email.lower(), full_name=full_name)
            db.add(profile)
            role = UserRole(user_id=user.id, role="SUPER_ADMIN", college_id=None)
            db.add(role)
            db.commit()
            print(f"✅ Created super admin: {email}")
        print("\n" + "="*60)
        print("✅ Super Admin Created!")
        print("="*60)
        print(f"Email: {email}")
        print(f"Password: {password}")
        print("\nLogin at: http://72.60.101.14/login")
        print("Select '\''Staff'\'' role")
        print("="*60)
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('\''--email'\'', default='\''superadmin@elevate.edu'\'')
    parser.add_argument('\''--password'\'', default='\''SuperAdmin123'\'')
    parser.add_argument('\''--name'\'', default='\''Super Administrator'\'')
    args = parser.parse_args()
    create_super_admin(args.email, args.password, args.name)
EOF'

echo "✅ Script created!"
echo ""
echo "🚀 Now creating super admin user..."
echo ""

docker exec -it elevate_edu_api python scripts/create_super_admin_postgres.py --email admin@elevate.edu --password SvnaJobs@123

echo ""
echo "✅ Done! You can now login at http://72.60.101.14/login"
echo "   Email: admin@elevate.edu"
echo "   Password: SvnaJobs@123"
echo "   Role: Staff"

