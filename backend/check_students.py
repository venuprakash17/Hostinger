"""
Script to check student data for attendance filtering
Run this to diagnose why students are not showing up
"""
import sys
import os
sys.path.append(os.path.dirname(__file__))

from app.core.database import SessionLocal
from app.models.user import User, UserRole, RoleEnum
from app.models.profile import Profile
from app.models.academic import Subject, Section, SubjectAssignment
from app.core.year_utils import parse_year

def check_students():
    db = SessionLocal()
    try:
        # Get all students
        student_user_ids = db.query(UserRole.user_id).filter(
            UserRole.role == RoleEnum.STUDENT
        ).subquery()
        
        profiles = db.query(Profile).filter(
            Profile.user_id.in_(student_user_ids)
        ).all()
        
        print(f"\n=== Total Students: {len(profiles)} ===\n")
        
        # Group by college
        colleges = {}
        for profile in profiles:
            college_id = profile.college_id or "None"
            if college_id not in colleges:
                colleges[college_id] = []
            colleges[college_id].append(profile)
        
        for college_id, college_profiles in colleges.items():
            print(f"\n--- College ID: {college_id} ({len(college_profiles)} students) ---")
            
            # Group by section
            sections = {}
            for profile in college_profiles:
                section = profile.section or "None"
                if section not in sections:
                    sections[section] = []
                sections[section].append(profile)
            
            print(f"\nSections found: {list(sections.keys())}")
            
            # Group by year
            years = {}
            for profile in college_profiles:
                year = profile.present_year or "None"
                year_numeric = parse_year(year) if year != "None" else "None"
                if year_numeric not in years:
                    years[year_numeric] = []
                years[year_numeric].append(profile)
            
            print(f"Years found: {list(years.keys())}")
            
            # Show students by section and year combination
            print(f"\nStudents by Section and Year:")
            for section_name, section_profiles in sections.items():
                print(f"\n  Section: {section_name}")
                section_years = {}
                for profile in section_profiles:
                    year = profile.present_year or "None"
                    year_numeric = parse_year(year) if year != "None" else "None"
                    if year_numeric not in section_years:
                        section_years[year_numeric] = []
                    section_years[year_numeric].append(profile)
                for year_numeric, year_profiles in sorted(section_years.items()):
                    print(f"    Year {year_numeric}: {len(year_profiles)} students")
                    # Show first 3 students in this section/year
                    for i, profile in enumerate(year_profiles[:3]):
                        user = db.query(User).filter(User.id == profile.user_id).first()
                        print(f"      - {profile.full_name} | Year: {profile.present_year} | Email: {user.email if user else 'N/A'}")
            
            # Show sample students
            print(f"\nSample students (first 5):")
            for i, profile in enumerate(college_profiles[:5]):
                user = db.query(User).filter(User.id == profile.user_id).first()
                print(f"  {i+1}. {profile.full_name} | Section: {profile.section} | Year: {profile.present_year} | Email: {user.email if user else 'N/A'}")
        
        # Check subjects and their years
        print(f"\n=== Subjects ===\n")
        subjects = db.query(Subject).all()
        for subject in subjects:
            print(f"Subject: {subject.name} | Year: {subject.year} | College ID: {subject.college_id}")
        
        # Check sections
        print(f"\n=== Sections ===\n")
        sections = db.query(Section).all()
        for section in sections:
            print(f"Section: {section.name} | College ID: {section.college_id} | Department ID: {section.department_id}")
        
        # Check subject assignments
        print(f"\n=== Subject Assignments ===\n")
        assignments = db.query(SubjectAssignment).filter(
            SubjectAssignment.is_active == True
        ).all()
        for assignment in assignments:
            subject = db.query(Subject).filter(Subject.id == assignment.subject_id).first()
            section = db.query(Section).filter(Section.id == assignment.section_id).first() if assignment.section_id else None
            print(f"Faculty ID: {assignment.faculty_id} | Subject: {subject.name if subject else 'N/A'} ({subject.year if subject else 'N/A'}) | Section: {section.name if section else assignment.section}")
        
    finally:
        db.close()

if __name__ == "__main__":
    check_students()

