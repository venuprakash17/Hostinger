"""Bulk upload API endpoints"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import csv
import io
import json
import hashlib
import time
from datetime import datetime
from openpyxl import load_workbook
from app.core.database import get_db
from app.models.user import User, UserRole, RoleEnum
from app.models.profile import Profile
from app.models.quiz import Quiz, CodingProblem
from app.api.auth import get_current_user
from app.core.security import get_password_hash
from app.models.audit_log import AuditLog
from app.models.college import College

router = APIRouter(prefix="/bulk-upload", tags=["bulk-upload"])


def get_current_super_admin(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> User:
    """Verify user is super admin"""
    from app.models.user import UserRole, RoleEnum
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    
    if RoleEnum.SUPER_ADMIN not in role_names:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins can perform bulk uploads"
        )
    
    return current_user


def get_current_admin_or_super(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Verify user is admin or super admin, return (user, is_super_admin)"""
    from app.models.user import UserRole, RoleEnum
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    
    is_super_admin = RoleEnum.SUPER_ADMIN in role_names
    is_admin = RoleEnum.ADMIN in role_names
    
    if not (is_super_admin or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins or super admins can perform this action"
        )
    
    return current_user, is_super_admin


def get_admin_college_id(
    current_user: User,
    db: Session
) -> Optional[int]:
    """Get college_id for admin user"""
    from app.models.user import UserRole, RoleEnum
    admin_role = db.query(UserRole).filter(
        UserRole.user_id == current_user.id,
        UserRole.role == RoleEnum.ADMIN
    ).first()
    
    return admin_role.college_id if admin_role else None


@router.post("/students")
async def bulk_upload_students(
    file: UploadFile = File(...),
    college_id: int = Query(..., description="College ID - required, will be applied to all uploaded students"),
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """Bulk upload students from CSV or Excel file.
    
    Supported formats: .csv, .xlsx, .xls
    
    Format (headers required):
    email,password,full_name,branch_id,section,roll_number,present_year
    
    Note: college_id is provided via query parameter and will be automatically applied to all students.
    
    Fields:
    - email: Student email (required)
    - password: Password (optional, defaults to roll_number or user.id)
    - full_name: Student full name
    - branch_id: Branch ID (required - e.g., "CSE001", "ECE001")
      Note: Department will be automatically resolved from branch_id
    - section: Section name (e.g., "A", "B", "C") - required
      Note: Sections will be created by college admin later and will automatically link by name
    - roll_number: Student roll number
    - present_year: Academic year (1, 2, 3, 4, or 5) - used for faculty utilization
    - college_id: College ID (optional if provided in query param)
    
    Example:
    email,password,full_name,branch_id,section,roll_number,present_year,college_id
    student1@example.com,Password123,John Doe,CSE001,A,20CS001,1,1
    student2@example.com,Password123,Jane Smith,CSE001,B,20CS002,1,1
    student3@example.com,Password123,Jane Doe,ECE001,A,20EC001,2,1
    
    Note: Section names (A, B, C, etc.) will automatically link when college admin creates sections
    with matching names in the department.
    """
    file_ext = file.filename.lower().split('.')[-1]
    if file_ext not in ['csv', 'xlsx', 'xls']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV and Excel files (.csv, .xlsx, .xls) are supported"
        )
    
    # Read file content
    contents = await file.read()
    
    # Parse based on file type
    if file_ext == 'csv':
        csv_content = contents.decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(csv_content))
    else:
        # Excel file
        excel_file = io.BytesIO(contents)
        workbook = load_workbook(excel_file, read_only=True, data_only=True)
        sheet = workbook.active
        
        # Get headers from first row
        headers = [cell.value for cell in sheet[1]]
        if not headers:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Excel file must have headers in the first row"
            )
        
        # Convert Excel rows to CSV-like dict format
        csv_rows = []
        for row in sheet.iter_rows(min_row=2, values_only=True):
            row_dict = {}
            for idx, header in enumerate(headers):
                if header:
                    # Safely access row[idx] - handle cases where row has fewer columns than headers
                    if idx < len(row):
                        row_dict[str(header).strip()] = str(row[idx]).strip() if row[idx] is not None else ""
                    else:
                        row_dict[str(header).strip()] = ""
            csv_rows.append(row_dict)
        
        csv_reader = csv_rows if csv_rows else []
    
    results = {
        "success": [],
        "failed": [],
        "total": 0
    }
    
    # Handle both CSV reader (iterator) and Excel rows (list)
    rows_to_process = list(csv_reader) if isinstance(csv_reader, list) else csv_reader
    
    for row_num, row in enumerate(rows_to_process, start=2):  # Start at 2 (row 1 is header)
        try:
            email = row.get('email', '').strip().lower()
            password = row.get('password', '').strip()
            full_name = row.get('full_name', '').strip()
            branch_id_str = row.get('branch_id', '').strip()
            section = row.get('section', '').strip()
            roll_number = row.get('roll_number', '').strip()
            present_year = row.get('present_year', '').strip()
            
            # College ID is required from query parameter and applied to all students
            final_college_id = college_id
            
            if not email:
                results["failed"].append({
                    "row": row_num,
                    "email": email or "N/A",
                    "error": "Email is required"
                })
                continue
            
            # Check if user already exists
            existing = db.query(User).filter(User.email == email).first()
            if existing:
                results["failed"].append({
                    "row": row_num,
                    "email": email,
                    "error": "User already exists"
                })
                continue
            
            # Resolve department_id from branch_id only
            from app.models.academic import Department
            department_id = None
            department_name = None
            
            if not branch_id_str:
                results["failed"].append({
                    "row": row_num,
                    "email": email,
                    "error": "Branch ID is required (e.g., 'CSE001', 'ECE001')"
                })
                continue
            
            # Find department by branch_id
            dept = db.query(Department).filter(
                Department.branch_id == branch_id_str,
                Department.college_id == final_college_id,
                Department.is_active == True
            ).first()
            if dept:
                department_id = dept.id
                department_name = dept.name
            else:
                results["failed"].append({
                    "row": row_num,
                    "email": email,
                    "error": f"Branch ID '{branch_id_str}' not found for this college"
                })
                continue
            
            # Resolve section_id from section name (if section exists)
            # If section doesn't exist yet, that's okay - it will be created by college admin later
            # and will auto-link by name
            from app.models.academic import Section
            section_id = None
            section_name = section if section else None
            
            if section and department_id:
                # Try to find section by name within the department
                # If found, link it. If not found, that's okay - it will be created later
                sect = db.query(Section).filter(
                    Section.name == section,
                    Section.department_id == department_id,
                    Section.college_id == final_college_id,
                    Section.is_active == True
                ).first()
                if sect:
                    section_id = sect.id
                    section_name = sect.name
                # If section not found, that's fine - college admin will create it later
                # and it will auto-link by name when they create sections with matching names
            
            # Generate password: use provided password, or roll_number in caps, or user_id in caps, or user.id in caps
            if password:
                final_password = password
            elif roll_number:
                final_password = roll_number.upper()
            else:
                # Will use user.id after creation
                final_password = "TEMP_PASSWORD_PLACEHOLDER"
            
            # Normalize present_year: convert "1st", "2nd", "3rd" to "1", "2", "3" for storage
            from app.core.year_utils import parse_year
            numeric_year = parse_year(present_year) if present_year else None
            
            # Create user
            user = User(
                email=email,
                password_hash=get_password_hash(final_password),
                is_active="true",
                is_verified="true"
            )
            db.add(user)
            db.flush()  # Get user.id
            
            # If password was placeholder, update it with user.id in caps
            if final_password == "TEMP_PASSWORD_PLACEHOLDER":
                user.password_hash = get_password_hash(str(user.id).upper())
            
            # Create profile with department_id and section_id
            profile = Profile(
                user_id=user.id,
                email=email,
                full_name=full_name if full_name else None,
                college_id=final_college_id,  # Required from query parameter
                department=department_name,  # Department name from branch_id
                department_id=department_id,  # Link to Department
                section=section_name or section,  # Keep name for backward compatibility
                section_id=section_id,  # Link to Section
                roll_number=roll_number if roll_number else None,
                present_year=numeric_year  # Store year for faculty utilization
            )
            db.add(profile)
            
            # Create student role
            role = UserRole(
                user_id=user.id,
                role=RoleEnum.STUDENT,
                college_id=final_college_id
            )
            db.add(role)
            
            results["success"].append({
                "row": row_num,
                "email": email,
                "name": full_name
            })
            results["total"] += 1
            
        except Exception as e:
            results["failed"].append({
                "row": row_num,
                "email": row.get('email', 'N/A'),
                "error": str(e)
            })
    
    # Commit all successful inserts
    if results["success"]:
        db.commit()
    
    return {
        "message": f"Bulk upload completed: {len(results['success'])} successful, {len(results['failed'])} failed",
        "success_count": len(results["success"]),
        "failed_count": len(results["failed"]),
        "success": results["success"],
        "failed": results["failed"]
    }


def get_current_content_creator(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Verify user can create content (super admin, admin, HOD, or faculty)"""
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    
    is_super_admin = RoleEnum.SUPER_ADMIN in role_names
    is_admin = RoleEnum.ADMIN in role_names
    is_hod = RoleEnum.HOD in role_names
    is_faculty = RoleEnum.FACULTY in role_names
    
    if not (is_super_admin or is_admin or is_hod or is_faculty):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins, faculty, HOD, or super admins can upload content"
        )
    
    college_id = None
    if user_roles:
        college_id = user_roles[0].college_id
    if not college_id and profile:
        college_id = profile.college_id
    
    return current_user, {
        "is_super_admin": is_super_admin,
        "is_admin": is_admin,
        "is_hod": is_hod,
        "is_faculty": is_faculty,
        "college_id": college_id,
        "profile": profile
    }


@router.post("/quizzes")
async def bulk_upload_quizzes(
    file: UploadFile = File(...),
    current_user_tuple = Depends(get_current_content_creator),
    db: Session = Depends(get_db)
):
    """Bulk upload quizzes from Excel, CSV, or JSON file.
    
    Supported formats: .xlsx, .xls, .csv, .json
    
    Excel/CSV Format (headers required):
    title,description,subject,duration_minutes,total_marks,scope_type,section_id,year,expiry_date,is_active
    
    JSON Format:
    [
      {
        "title": "Quiz Title",
        "description": "Description",
        "subject": "Subject",
        "duration_minutes": 30,
        "total_marks": 100,
        "scope_type": "section",
        "section_id": 1,
        "year": "1st",
        "expiry_date": "2024-12-31T23:59:59",
        "questions": [...],
        "is_active": true
      }
    ]
    """
    current_user, user_info = current_user_tuple
    file_ext = file.filename.lower().split('.')[-1]
    
    if file_ext not in ['json', 'csv', 'xlsx', 'xls']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JSON, CSV, and Excel files (.json, .csv, .xlsx, .xls) are supported"
        )
    
    contents = await file.read()
    data = []
    
    # Parse based on file type
    if file_ext == 'json':
        data = json.loads(contents.decode('utf-8'))
        if not isinstance(data, list):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="JSON must be an array of quiz objects"
            )
    else:
        # Excel or CSV
        if file_ext in ['xlsx', 'xls']:
            wb = load_workbook(io.BytesIO(contents))
            ws = wb.active
            headers = [cell.value for cell in ws[1]]
            for row in ws.iter_rows(min_row=2, values_only=True):
                if not any(row):  # Skip empty rows
                    continue
                quiz_dict = dict(zip(headers, row))
                data.append(quiz_dict)
        else:  # CSV
            csv_content = contents.decode('utf-8')
            reader = csv.DictReader(io.StringIO(csv_content))
            data = list(reader)
    
    results = {
        "success": [],
        "failed": [],
        "total": 0
    }
    
    for idx, quiz_data in enumerate(data, start=1):
        try:
            # Convert string values to appropriate types for Excel/CSV
            if isinstance(quiz_data.get('duration_minutes'), str):
                quiz_data['duration_minutes'] = int(quiz_data['duration_minutes']) if quiz_data.get('duration_minutes') else 30
            if isinstance(quiz_data.get('total_marks'), str):
                quiz_data['total_marks'] = int(quiz_data['total_marks']) if quiz_data.get('total_marks') else 100
            if isinstance(quiz_data.get('section_id'), str):
                quiz_data['section_id'] = int(quiz_data['section_id']) if quiz_data.get('section_id') else None
            
            # Validate required fields
            if not quiz_data.get('title'):
                results["failed"].append({
                    "index": idx,
                    "title": quiz_data.get('title', 'N/A'),
                    "error": "Title is required"
                })
                continue
            
            # Determine scope based on role
            scope_type = quiz_data.get('scope_type', 'section')
            if user_info["is_super_admin"]:
                scope_type = "svnapro"
            elif user_info["is_admin"]:
                scope_type = quiz_data.get('scope_type', 'college')
            elif user_info["is_hod"]:
                scope_type = quiz_data.get('scope_type', 'department')
            else:
                scope_type = "section"
            
            # Set scope fields
            college_id = user_info["college_id"]
            department = user_info["profile"].department if user_info["profile"] else None
            section_id = quiz_data.get('section_id') if scope_type == "section" else None
            year = quiz_data.get('year') if scope_type in ["department", "college"] else None
            
            # Parse expiry_date if provided
            expiry_date = None
            if quiz_data.get('expiry_date'):
                try:
                    expiry_date = datetime.fromisoformat(str(quiz_data['expiry_date']).replace('Z', '+00:00'))
                except:
                    pass
            
            quiz = Quiz(
                title=quiz_data['title'],
                description=quiz_data.get('description'),
                subject=quiz_data.get('subject'),
                duration_minutes=quiz_data.get('duration_minutes', 30),
                total_marks=quiz_data.get('total_marks', 100),
                questions=quiz_data.get('questions', []),
                is_active=quiz_data.get('is_active', True) if isinstance(quiz_data.get('is_active'), bool) else (str(quiz_data.get('is_active', 'true')).lower() == 'true'),
                created_by=current_user.id,
                scope_type=scope_type,
                college_id=college_id,
                department=department,
                section_id=section_id,
                year=year,
                expiry_date=expiry_date
            )
            db.add(quiz)
            db.flush()
            
            results["success"].append({
                "index": idx,
                "title": quiz_data['title'],
                "id": quiz.id
            })
            results["total"] += 1
            
        except Exception as e:
            results["failed"].append({
                "index": idx,
                "title": quiz_data.get('title', 'N/A'),
                "error": str(e)
            })
    
    if results["success"]:
        db.commit()
    
    return {
        "message": f"Bulk upload completed: {len(results['success'])} successful, {len(results['failed'])} failed",
        "success_count": len(results["success"]),
        "failed_count": len(results["failed"]),
        "success": results["success"],
        "failed": results["failed"]
    }


@router.post("/coding-problems")
async def bulk_upload_coding_problems(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """Bulk upload coding problems from Excel, CSV, or JSON file (Super Admin only).
    
    Supported formats: .xlsx, .xls, .csv, .json
    
    Excel/CSV Format (headers required):
    title,description,input_format,output_format,difficulty,tags,constraints,sample_input,sample_output,
    year,allowed_languages,restricted_languages,recommended_languages,
    starter_code_python,starter_code_c,starter_code_cpp,starter_code_java,starter_code_javascript,
    time_limit,memory_limit,test_cases,expiry_date,is_active
    
    JSON Format:
    [
      {
        "title": "Problem Title",
        "description": "Problem description",
        "input_format": "Input format description",
        "output_format": "Output format description",
        "difficulty": "Easy|Medium|Hard",
        "tags": ["tag1", "tag2"],
        "constraints": "Constraints text",
        "sample_input": "Input example",
        "sample_output": "Output example",
        "year": 1,
        "allowed_languages": ["python", "c", "cpp"],
        "restricted_languages": [],
        "recommended_languages": ["c"],
        "starter_code_python": "def solution():\\n    pass",
        "time_limit": 5,
        "memory_limit": 256,
        "test_cases": [{"stdin": "1", "expected_output": "1", "is_public": true}],
        "expiry_date": "2024-12-31T23:59:59",
        "is_active": true
      }
    ]
    """
    file_ext = file.filename.lower().split('.')[-1]
    
    if file_ext not in ['json', 'csv', 'xlsx', 'xls']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JSON, CSV, and Excel files (.json, .csv, .xlsx, .xls) are supported"
        )
    
    contents = await file.read()
    data = []
    
    # Parse based on file type
    if file_ext == 'json':
        data = json.loads(contents.decode('utf-8'))
        if not isinstance(data, list):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="JSON must be an array of coding problem objects"
            )
    else:
        # Excel or CSV
        if file_ext in ['xlsx', 'xls']:
            wb = load_workbook(io.BytesIO(contents))
            ws = wb.active
            headers = [cell.value for cell in ws[1]]
            for row in ws.iter_rows(min_row=2, values_only=True):
                if not any(row):  # Skip empty rows
                    continue
                problem_dict = dict(zip(headers, row))
                data.append(problem_dict)
        else:  # CSV
            csv_content = contents.decode('utf-8')
            reader = csv.DictReader(io.StringIO(csv_content))
            data = list(reader)
    
    results = {
        "success": [],
        "failed": [],
        "total": 0
    }
    
    def parse_year(value):
        """Parse year to integer (1-4)"""
        if isinstance(value, int):
            return value if 1 <= value <= 4 else 1
        if isinstance(value, str):
            value = value.lower().strip()
            if value.startswith('1'): return 1
            if value.startswith('2'): return 2
            if value.startswith('3'): return 3
            if value.startswith('4'): return 4
            try:
                num = int(value)
                return num if 1 <= num <= 4 else 1
            except:
                return 1
        return 1
    
    def parse_language_array(value):
        """Parse language array from string (CSV or JSON)"""
        if isinstance(value, list):
            return value
        if isinstance(value, str):
            # Try JSON first
            try:
                parsed = json.loads(value)
                if isinstance(parsed, list):
                    return parsed
            except:
                pass
            # Try CSV
            return [lang.strip() for lang in value.split(',') if lang.strip()]
        return []
    
    def parse_test_cases(value):
        """Parse test cases from string (JSON) or return as-is"""
        if isinstance(value, list):
            return value
        if isinstance(value, str):
            try:
                return json.loads(value)
            except:
                return []
        return []
    
    for idx, problem_data in enumerate(data, start=1):
        try:
            # Validate required fields
            if not problem_data.get('title') or not problem_data.get('description'):
                results["failed"].append({
                    "index": idx,
                    "title": problem_data.get('title', 'N/A'),
                    "error": "Title and description are required"
                })
                continue
            
            # Parse year (required, must be 1-4)
            year = parse_year(problem_data.get('year', 1))
            if year not in [1, 2, 3, 4]:
                results["failed"].append({
                    "index": idx,
                    "title": problem_data.get('title', 'N/A'),
                    "error": f"Year must be 1, 2, 3, or 4. Got: {problem_data.get('year')}"
                })
                continue
            
            # Parse language arrays
            allowed_languages = parse_language_array(problem_data.get('allowed_languages', '["python","c","cpp","java","javascript"]'))
            restricted_languages = parse_language_array(problem_data.get('restricted_languages', '[]'))
            recommended_languages = parse_language_array(problem_data.get('recommended_languages', '[]'))
            
            # Parse tags
            tags = []
            if isinstance(problem_data.get('tags'), str):
                tags = [tag.strip() for tag in problem_data['tags'].split(',') if tag.strip()]
            elif isinstance(problem_data.get('tags'), list):
                tags = problem_data['tags']
            
            # Parse test cases
            test_cases = parse_test_cases(problem_data.get('test_cases', '[]'))
            
            # Parse expiry_date if provided
            expiry_date = None
            if problem_data.get('expiry_date'):
                try:
                    expiry_date = datetime.fromisoformat(str(problem_data['expiry_date']).replace('Z', '+00:00'))
                except:
                    pass
            
            # Parse numeric fields
            time_limit = int(problem_data.get('time_limit', 5))
            memory_limit = int(problem_data.get('memory_limit', 256))
            
            # Check for duplicates: same title AND description (case-insensitive, normalized)
            title = problem_data['title'].strip()
            description = problem_data['description'].strip()
            
            # Normalize for comparison (lowercase, remove extra whitespace)
            title_normalized = ' '.join(title.lower().split())
            description_normalized = ' '.join(description.lower().split())
            
            # Check for duplicates using case-insensitive comparison
            # SQLite doesn't support ILIKE, so we'll fetch and compare in Python
            all_problems = db.query(CodingProblem).all()
            existing_problem = None
            for prob in all_problems:
                prob_title_norm = ' '.join((prob.title or '').lower().split())
                prob_desc_norm = ' '.join((prob.description or '').lower().split())
                if prob_title_norm == title_normalized and prob_desc_norm == description_normalized:
                    existing_problem = prob
                    break
            
            # If not found, try exact match as fallback
            if not existing_problem:
                existing_problem = db.query(CodingProblem).filter(
                    CodingProblem.title == title,
                    CodingProblem.description == description
                ).order_by(CodingProblem.created_at.desc()).first()
            
            # Generate unique problem_code for analytics tracking
            problem_code_base = f"{title}_{description}".lower().replace(" ", "_")[:50]
            problem_code = f"CP_{hashlib.md5(f'{title}_{description}_{time.time()}'.encode()).hexdigest()[:12].upper()}"
            
            if existing_problem:
                # Duplicate found - update existing problem with latest data (keep latest)
                existing_problem.input_format = problem_data.get('input_format') or existing_problem.input_format
                existing_problem.output_format = problem_data.get('output_format') or existing_problem.output_format
                existing_problem.difficulty = problem_data.get('difficulty') or existing_problem.difficulty
                existing_problem.tags = tags if tags else existing_problem.tags
                existing_problem.constraints = problem_data.get('constraints') or existing_problem.constraints
                existing_problem.sample_input = problem_data.get('sample_input') or existing_problem.sample_input
                existing_problem.sample_output = problem_data.get('sample_output') or existing_problem.sample_output
                existing_problem.year = year
                existing_problem.allowed_languages = allowed_languages if allowed_languages else existing_problem.allowed_languages
                existing_problem.restricted_languages = restricted_languages if restricted_languages else existing_problem.restricted_languages
                existing_problem.recommended_languages = recommended_languages if recommended_languages else existing_problem.recommended_languages
                existing_problem.starter_code_python = problem_data.get('starter_code_python') or existing_problem.starter_code_python
                existing_problem.starter_code_c = problem_data.get('starter_code_c') or existing_problem.starter_code_c
                existing_problem.starter_code_cpp = problem_data.get('starter_code_cpp') or existing_problem.starter_code_cpp
                existing_problem.starter_code_java = problem_data.get('starter_code_java') or existing_problem.starter_code_java
                existing_problem.starter_code_javascript = problem_data.get('starter_code_javascript') or existing_problem.starter_code_javascript
                existing_problem.time_limit = time_limit
                existing_problem.memory_limit = memory_limit
                existing_problem.test_cases = test_cases if test_cases else existing_problem.test_cases
                existing_problem.is_active = problem_data.get('is_active', True) if isinstance(problem_data.get('is_active'), bool) else (str(problem_data.get('is_active', 'true')).lower() == 'true')
                existing_problem.expiry_date = expiry_date or existing_problem.expiry_date
                existing_problem.updated_at = datetime.utcnow()
                # Keep existing problem_code for analytics continuity
                if not getattr(existing_problem, 'problem_code', None):
                    existing_problem.problem_code = problem_code
                
                db.flush()
                
                results["success"].append({
                    "index": idx,
                    "title": problem_data['title'],
                    "id": existing_problem.id,
                    "problem_code": getattr(existing_problem, 'problem_code', None),
                    "action": "updated",  # Indicates this was a duplicate that was updated
                    "duplicate_of": existing_problem.id
                })
                results["total"] += 1
            else:
                # New problem - create it
                problem = CodingProblem(
                    title=title,
                    description=description,
                    input_format=problem_data.get('input_format'),
                    output_format=problem_data.get('output_format'),
                    difficulty=problem_data.get('difficulty'),
                    tags=tags,
                    constraints=problem_data.get('constraints'),
                    sample_input=problem_data.get('sample_input'),
                    sample_output=problem_data.get('sample_output'),
                    year=year,
                    allowed_languages=allowed_languages if allowed_languages else ["python", "c", "cpp", "java", "javascript"],
                    restricted_languages=restricted_languages,
                    recommended_languages=recommended_languages,
                    starter_code_python=problem_data.get('starter_code_python'),
                    starter_code_c=problem_data.get('starter_code_c'),
                    starter_code_cpp=problem_data.get('starter_code_cpp'),
                    starter_code_java=problem_data.get('starter_code_java'),
                    starter_code_javascript=problem_data.get('starter_code_javascript'),
                    time_limit=time_limit,
                    memory_limit=memory_limit,
                    test_cases=test_cases,
                    is_active=problem_data.get('is_active', True) if isinstance(problem_data.get('is_active'), bool) else (str(problem_data.get('is_active', 'true')).lower() == 'true'),
                    created_by=current_user.id,
                    expiry_date=expiry_date,
                    problem_code=problem_code,  # Unique code for analytics
                    scope_type="svnapro"  # Default for bulk upload
                )
            db.add(problem)
            db.flush()
            
            results["success"].append({
                "index": idx,
                "title": problem_data['title'],
                    "id": problem.id,
                    "problem_code": getattr(problem, 'problem_code', None),
                    "action": "created"  # New problem created
            })
            results["total"] += 1
            
        except Exception as e:
            results["failed"].append({
                "index": idx,
                "title": problem_data.get('title', 'N/A'),
                "error": str(e)
            })
    
    if results["success"]:
        db.commit()
    
    return {
        "message": f"Bulk upload completed: {len(results['success'])} successful, {len(results['failed'])} failed",
        "success_count": len(results["success"]),
        "failed_count": len(results["failed"]),
        "success": results["success"],
        "failed": results["failed"]
    }


@router.get("/template/students")
async def download_student_template(
    format: str = "csv",  # csv or xlsx
    college_id: Optional[int] = None,  # Optional college_id for context
    current_user: User = Depends(get_current_super_admin)
):
    """Download CSV or Excel template for student bulk upload
    
    Required fields:
    - email: Student email (required)
    - password: Password (optional, defaults to roll_number or user.id)
    - full_name: Student full name
    - branch_id: Branch ID (required - e.g., "CSE001", "ECE001")
    - section: Section name (e.g., "A", "B", "C") - will auto-link when created by college admin
    - roll_number: Student roll number (can be used for login)
    - present_year: Academic year (1, 2, 3, 4, or 5)
    - college_id: College ID (optional if provided in query param - will default to query param value)
    """
    from fastapi.responses import StreamingResponse
    
    if format.lower() == "xlsx":
        # Excel format
        from openpyxl import Workbook
        
        wb = Workbook()
        ws = wb.active
        ws.title = "Students"
        
        # Headers - branch_id is required, section is specified by name only (A, B, C, etc.)
        # Section will auto-link when created by college admin
        headers = ["email", "password", "full_name", "branch_id", "section", "roll_number", "present_year"]
        ws.append(headers)
        
        # Sample data rows - branch_id is required, section by name only
        ws.append(["student1@example.com", "Password123", "John Doe", "CSE001", "A", "20CS001", "1"])
        ws.append(["student2@example.com", "Password123", "Jane Smith", "CSE001", "B", "20CS002", "1"])
        ws.append(["student3@example.com", "Password123", "Jane Doe", "ECE001", "A", "20EC001", "2"])
        
        # Save to BytesIO
        excel_buffer = io.BytesIO()
        wb.save(excel_buffer)
        excel_buffer.seek(0)
        excel_content = excel_buffer.getvalue()
        excel_buffer.close()
        
        return StreamingResponse(
            iter([excel_content]),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": "attachment; filename=student_upload_template.xlsx",
                "Content-Length": str(len(excel_content))
            }
        )
    else:
        # CSV format (default) - branch_id is required, section by name only
        template = "email,password,full_name,branch_id,section,roll_number,present_year\n"
        template += "student1@example.com,Password123,John Doe,CSE001,A,20CS001,1\n"
        template += "student2@example.com,Password123,Jane Smith,CSE001,B,20CS002,1\n"
        template += "student3@example.com,Password123,Jane Doe,ECE001,A,20EC001,2\n"
        
        return StreamingResponse(
            iter([template.encode('utf-8')]),
            media_type="text/csv",
            headers={
                "Content-Disposition": "attachment; filename=student_upload_template.csv",
                "Content-Length": str(len(template.encode('utf-8')))
            }
        )


@router.get("/templates/quiz")
async def download_quiz_template(
    format: str = "xlsx",  # xlsx, csv, or json
    current_user_tuple = Depends(get_current_content_creator)
):
    """Download template for quiz bulk upload in Excel, CSV, or JSON format"""
    from fastapi.responses import Response
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill
    
    if format == "json":
        template = [
            {
                "title": "Sample Quiz",
                "description": "Quiz description",
                "subject": "Computer Science",
                "duration_minutes": 30,
                "total_marks": 100,
                "scope_type": "section",
                "section_id": 1,
                "year": "1st",
                "expiry_date": "2024-12-31T23:59:59",
                "is_active": True
            }
        ]
        return Response(
            content=json.dumps(template, indent=2),
            media_type="application/json",
            headers={
                "Content-Disposition": "attachment; filename=quiz_upload_template.json"
            }
        )
    elif format == "csv":
        csv_content = "title,description,subject,duration_minutes,total_marks,scope_type,section_id,year,expiry_date,is_active\n"
        csv_content += "Sample Quiz,Quiz description,Computer Science,30,100,section,1,1st,2024-12-31T23:59:59,true\n"
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={
                "Content-Disposition": "attachment; filename=quiz_upload_template.csv"
            }
        )
    else:  # xlsx
        wb = Workbook()
        ws = wb.active
        ws.title = "Quiz Template"
        
        # Headers
        headers = ["title", "description", "subject", "duration_minutes", "total_marks", "scope_type", "section_id", "year", "expiry_date", "is_active"]
        header_fill = PatternFill(start_color="366092", end_color="366092", fill_type="solid")
        header_font = Font(bold=True, color="FFFFFF")
        
        for col_idx, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col_idx, value=header)
            cell.fill = header_fill
            cell.font = header_font
        
        # Sample row
        sample_data = ["Sample Quiz", "Quiz description", "Computer Science", 30, 100, "section", 1, "1st", "2024-12-31T23:59:59", True]
        for col_idx, value in enumerate(sample_data, 1):
            ws.cell(row=2, column=col_idx, value=value)
        
        # Auto-adjust column widths
        for column in ws.columns:
            max_length = 0
            column_letter = column[0].column_letter
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 50)
            ws.column_dimensions[column_letter].width = adjusted_width
        
        from io import BytesIO
        output = BytesIO()
        wb.save(output)
        output.seek(0)
        
        return Response(
            content=output.read(),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": "attachment; filename=quiz_upload_template.xlsx"
            }
        )


@router.get("/templates/coding-problem")
async def download_coding_problem_template(
    format: str = "xlsx",  # xlsx, csv, or json
    current_user_tuple = Depends(get_current_content_creator)
):
    """Download template for coding problem bulk upload in Excel, CSV, or JSON format"""
    from fastapi.responses import Response
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill
    
    if format == "json":
        template = [
            {
                "title": "Sample Problem: Sum of Two Numbers",
                "description": "Write a function to add two numbers and return the result.",
                "input_format": "Two integers a and b",
                "output_format": "Return the sum of a and b",
                "constraints": "1 ≤ a, b ≤ 1000",
                "sample_input": "5\n10",
                "sample_output": "15",
                "difficulty": "Easy",
                "tags": "array,math",
                "year": 1,
                "allowed_languages": "python,c,cpp,java,javascript",
                "restricted_languages": "",
                "recommended_languages": "",
                "starter_code_python": "def add(a, b):\n    # Your code here\n    return a + b",
                "starter_code_c": "#include <stdio.h>\n\nint main() {\n    int a, b;\n    scanf(\"%d %d\", &a, &b);\n    printf(\"%d\\n\", a + b);\n    return 0;\n}",
                "starter_code_cpp": "#include <iostream>\nusing namespace std;\n\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}",
                "starter_code_java": "import java.util.Scanner;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int a = sc.nextInt();\n        int b = sc.nextInt();\n        System.out.println(a + b);\n    }\n}",
                "starter_code_javascript": "function add(a, b) {\n    // Your code here\n    return a + b;\n}",
                "time_limit": 5,
                "memory_limit": 256,
                "test_cases": "[{\"stdin\": \"5\\n10\", \"expected_output\": \"15\", \"is_public\": true}, {\"stdin\": \"100\\n200\", \"expected_output\": \"300\", \"is_public\": false}]",
                "expiry_date": "2024-12-31T23:59:59",
                "is_active": True
            }
        ]
        return Response(
            content=json.dumps(template, indent=2),
            media_type="application/json",
            headers={
                "Content-Disposition": "attachment; filename=coding_problem_upload_template.json"
            }
        )
    elif format == "csv":
        csv_content = "title,description,input_format,output_format,constraints,sample_input,sample_output,difficulty,tags,year,allowed_languages,restricted_languages,recommended_languages,starter_code_python,starter_code_c,starter_code_cpp,starter_code_java,starter_code_javascript,time_limit,memory_limit,test_cases,expiry_date,is_active\n"
        csv_content += "Sample Problem: Sum of Two Numbers,\"Write a function to add two numbers\",\"Two integers a and b\",\"Return the sum\",\"1 ≤ a, b ≤ 1000\",\"5\\n10\",15,Easy,\"array,math\",1,\"python,c,cpp,java,javascript\",\"\",\"\",\"def add(a, b):\\n    return a + b\",\"#include <stdio.h>\\nint main() { int a,b; scanf(\\\"%d %d\\\", &a, &b); printf(\\\"%d\\n\\\", a+b); return 0; }\",\"#include <iostream>\\nusing namespace std;\\nint main() { int a,b; cin>>a>>b; cout<<a+b<<endl; return 0; }\",\"import java.util.Scanner;\\npublic class Solution { public static void main(String[] args) { Scanner sc = new Scanner(System.in); int a=sc.nextInt(); int b=sc.nextInt(); System.out.println(a+b); } }\",\"function add(a, b) { return a + b; }\",5,256,\"[{\\\"stdin\\\": \\\"5\\\\n10\\\", \\\"expected_output\\\": \\\"15\\\", \\\"is_public\\\": true}]\",2024-12-31T23:59:59,true\n"
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={
                "Content-Disposition": "attachment; filename=coding_problem_upload_template.csv"
            }
        )
    else:  # xlsx
        wb = Workbook()
        ws = wb.active
        ws.title = "Coding Problem Template"
        
        # Headers - All required fields
        headers = [
            "title", "description", "input_format", "output_format", "constraints",
            "sample_input", "sample_output", "difficulty", "tags", "year",
            "allowed_languages", "restricted_languages", "recommended_languages",
            "starter_code_python", "starter_code_c", "starter_code_cpp", "starter_code_java", "starter_code_javascript",
            "time_limit", "memory_limit", "test_cases", "expiry_date", "is_active"
        ]
        header_fill = PatternFill(start_color="366092", end_color="366092", fill_type="solid")
        header_font = Font(bold=True, color="FFFFFF")
        
        for col_idx, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col_idx, value=header)
            cell.fill = header_fill
            cell.font = header_font
        
        # Sample row with all fields
        sample_data = [
            "Sample Problem: Sum of Two Numbers",
            "Write a function to add two numbers and return the result.",
            "Two integers a and b",
            "Return the sum of a and b",
            "1 ≤ a, b ≤ 1000",
            "5\n10",
            "15",
            "Easy",
            "array,math",
            1,
            "python,c,cpp,java,javascript",
            "",
            "",
            "def add(a, b):\n    # Your code here\n    return a + b",
            "#include <stdio.h>\n\nint main() {\n    int a, b;\n    scanf(\"%d %d\", &a, &b);\n    printf(\"%d\\n\", a + b);\n    return 0;\n}",
            "#include <iostream>\nusing namespace std;\n\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}",
            "import java.util.Scanner;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int a = sc.nextInt();\n        int b = sc.nextInt();\n        System.out.println(a + b);\n    }\n}",
            "function add(a, b) {\n    // Your code here\n    return a + b;\n}",
            5,
            256,
            '[{"stdin": "5\\n10", "expected_output": "15", "is_public": true}, {"stdin": "100\\n200", "expected_output": "300", "is_public": false}]',
            "2024-12-31T23:59:59",
            True
        ]
        for col_idx, value in enumerate(sample_data, 1):
            ws.cell(row=2, column=col_idx, value=value)
        
        # Auto-adjust column widths
        for column in ws.columns:
            max_length = 0
            column_letter = column[0].column_letter
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 50)
            ws.column_dimensions[column_letter].width = adjusted_width
        
        # Add instructions sheet
        ws2 = wb.create_sheet("Instructions")
        instructions = [
            ["CODING PROBLEM TEMPLATE - INSTRUCTIONS"],
            [""],
            ["REQUIRED FIELDS:"],
            ["• title - Problem title (required)"],
            ["• description - Problem description (required)"],
            ["• year - Year (1-4) (required)"],
            ["• allowed_languages - Comma-separated: python,c,cpp,java,javascript (required)"],
            ["• time_limit - Time limit in seconds (required)"],
            ["• memory_limit - Memory limit in MB (required)"],
            [""],
            ["OPTIONAL FIELDS:"],
            ["• input_format - Describe input format"],
            ["• output_format - Describe output format"],
            ["• constraints - Problem constraints"],
            ["• sample_input - Sample input"],
            ["• sample_output - Sample output"],
            ["• difficulty - Easy/Medium/Hard"],
            ["• tags - Comma-separated tags"],
            ["• restricted_languages - Languages that MUST be used (comma-separated)"],
            ["• recommended_languages - Recommended languages (comma-separated)"],
            ["• starter_code_python - Python starter code"],
            ["• starter_code_c - C starter code"],
            ["• starter_code_cpp - C++ starter code"],
            ["• starter_code_java - Java starter code"],
            ["• starter_code_javascript - JavaScript starter code"],
            ["• test_cases - JSON array: [{\"stdin\": \"input\", \"expected_output\": \"output\", \"is_public\": true}]"],
            ["• expiry_date - ISO format: 2024-12-31T23:59:59"],
            ["• is_active - true/false"],
            [""],
            ["TEST CASES FORMAT:"],
            ["JSON array with objects containing:"],
            ["  - stdin: Input string"],
            ["  - expected_output: Expected output string"],
            ["  - is_public: true/false (whether students can see this test)"],
            [""],
            ["EXAMPLE:"],
            ['[{"stdin": "5\\n10", "expected_output": "15", "is_public": true}]'],
            [""],
            ["LANGUAGE ARRAYS:"],
            ["• Use comma-separated values: python,c,cpp,java,javascript"],
            ["• Or JSON array format: [\"python\", \"c\", \"cpp\"]"],
        ]
        for row_idx, instruction in enumerate(instructions, 1):
            ws2.cell(row=row_idx, column=1, value=instruction[0])
            if row_idx == 1:
                ws2.cell(row=row_idx, column=1).font = Font(bold=True, size=14)
        
        ws2.column_dimensions['A'].width = 80
        
        from io import BytesIO
        output = BytesIO()
        wb.save(output)
        output.seek(0)
        
        return Response(
            content=output.read(),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": "attachment; filename=coding_problem_upload_template.xlsx"
            }
        )


@router.post("/hod-faculty")
async def bulk_upload_hod_faculty(
    file: UploadFile = File(...),
    college_id: int = Query(..., description="College ID - required, will be applied to all uploaded staff"),
    current_user_tuple = Depends(get_current_admin_or_super),
    db: Session = Depends(get_db)
):
    """Bulk upload HOD and Faculty from CSV or Excel file.
    
    College admin can upload HOD and Faculty for their college.
    Super admin can upload for any college.
    
    Supported formats: .csv, .xlsx, .xls
    
    Format (headers required):
    email,full_name,role,branch_id,user_id
    
    Note: college_id is provided via query parameter and will be automatically applied to all staff.
    
    Example:
    email,full_name,role,branch_id,user_id
    hod.cs@sbit.edu,Dr. John Doe,hod,CSE001,HOD001
    faculty.cs@sbit.edu,Dr. Jane Smith,faculty,CSE001,FAC001
    
    Note: college_id is provided via query parameter and will be automatically applied to all staff.
    
    Note: password will be auto-generated from user_id (in caps) or user.id (in caps)
    """
    current_user, is_super_admin = current_user_tuple
    
    # Permission check for college admin
    if not is_super_admin:
        admin_college_id = get_admin_college_id(current_user, db)
        if not admin_college_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Admin must be associated with a college"
            )
        # Auto-set college_id to admin's college
        college_id = admin_college_id
    
    file_ext = file.filename.lower().split('.')[-1]
    if file_ext not in ['csv', 'xlsx', 'xls']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV and Excel files (.csv, .xlsx, .xls) are supported"
        )
    
    # Read file content
    contents = await file.read()
    
    # Parse based on file type
    if file_ext == 'csv':
        csv_content = contents.decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(csv_content))
    else:
        # Excel file
        excel_file = io.BytesIO(contents)
        workbook = load_workbook(excel_file, read_only=True, data_only=True)
        sheet = workbook.active
        
        # Get headers from first row
        headers = [cell.value for cell in sheet[1]]
        if not headers:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Excel file must have headers in the first row"
            )
        
        # Convert Excel rows to CSV-like dict format
        csv_rows = []
        for row in sheet.iter_rows(min_row=2, values_only=True):
            row_dict = {}
            for idx, header in enumerate(headers):
                if header:
                    # Safely access row[idx] - handle cases where row has fewer columns than headers
                    if idx < len(row):
                        row_dict[str(header).strip()] = str(row[idx]).strip() if row[idx] is not None else ""
                    else:
                        row_dict[str(header).strip()] = ""
            csv_rows.append(row_dict)
        
        csv_reader = csv_rows if csv_rows else []
    
    results = {
        "success": [],
        "failed": [],
        "total": 0
    }
    
    # Handle both CSV reader (iterator) and Excel rows (list)
    rows_to_process = list(csv_reader) if isinstance(csv_reader, list) else csv_reader
    
    for row_num, row in enumerate(rows_to_process, start=2):  # Start at 2 (row 1 is header)
        try:
            email = row.get('email', '').strip().lower()
            full_name = row.get('full_name', '').strip()
            branch_id_str = row.get('branch_id', '').strip()
            role = row.get('role', '').strip().lower()
            user_id = row.get('user_id', '').strip()
            password = row.get('password', '').strip()
            
            # College ID is required from query parameter and applied to all staff
            final_college_id = college_id
            
            if not email:
                results["failed"].append({
                    "row": row_num,
                    "email": email or "N/A",
                    "error": "Email is required"
                })
                continue
            
            if role not in ['hod', 'faculty']:
                results["failed"].append({
                    "row": row_num,
                    "email": email,
                    "error": f"Role must be 'hod' or 'faculty', got '{role}'"
                })
                continue
            
            # College ID is required from query parameter
            
            # Department is required for faculty and HOD - resolved from branch_id only
            if role in ['faculty', 'hod']:
                if not branch_id_str:
                    results["failed"].append({
                        "row": row_num,
                        "email": email,
                        "error": "Branch ID is required for faculty and HOD roles (e.g., 'CSE001', 'ECE001')"
                    })
                    continue
            
            # Resolve department_id from branch_id only
            from app.models.academic import Department
            department_id = None
            department_name = None
            
            if role in ['faculty', 'hod']:
                # Find department by branch_id
                dept = db.query(Department).filter(
                    Department.branch_id == branch_id_str,
                    Department.college_id == final_college_id,
                    Department.is_active == True
                ).first()
                if dept:
                    department_id = dept.id
                    department_name = dept.name
                else:
                    results["failed"].append({
                        "row": row_num,
                        "email": email,
                        "error": f"Branch ID '{branch_id_str}' not found for this college"
                })
                continue
            
            # Check if user already exists
            existing = db.query(User).filter(User.email == email).first()
            if existing:
                results["failed"].append({
                    "row": row_num,
                    "email": email,
                    "error": "User already exists"
                })
                continue
            
            # Determine password: use provided password, or user_id, or user.id as fallback
            if password:
                # Use provided password from upload file
                final_password = password
            elif user_id:
                # Use user_id as password (uppercase)
                final_password = str(user_id).upper()
            else:
                # Will use user.id after creation
                final_password = "TEMP_PASSWORD_PLACEHOLDER"
            
            # Create user
            user = User(
                email=email,
                password_hash=get_password_hash(final_password),
                is_active="true",
                is_verified="true"
            )
            db.add(user)
            db.flush()  # Get user.id
            
            # If password was placeholder, update it with user.id in caps
            if final_password == "TEMP_PASSWORD_PLACEHOLDER":
                user.password_hash = get_password_hash(str(user.id).upper())
            
            # Create profile with department_id
            profile = Profile(
                user_id=user.id,
                email=email,
                full_name=full_name if full_name else None,
                college_id=final_college_id,
                department=department_name,  # Department name from branch_id
                department_id=department_id,  # Link to Department
            )
            db.add(profile)
            
            # Handle HOD assignment - ensure only one HOD per department
            if role == 'hod' and department_id:
                hod_department = db.query(Department).filter(Department.id == department_id).first()
                if hod_department:
                    # If department already has an HOD, remove the old HOD's role
                    if hod_department.hod_id:
                        old_hod_id = hod_department.hod_id
                        # Remove old HOD role
                        old_hod_role = db.query(UserRole).filter(
                            UserRole.user_id == old_hod_id,
                            UserRole.role == RoleEnum.HOD
                        ).first()
                        if old_hod_role:
                            db.delete(old_hod_role)
                        # Clear department's hod_id
                        hod_department.hod_id = None
                    
                    # Assign new HOD to department
                    hod_department.hod_id = user.id
                    db.add(hod_department)
                    db.flush()  # Flush to ensure department update is saved
            
            # Create role (after HOD assignment to ensure department is set)
            role_enum = RoleEnum.HOD if role == 'hod' else RoleEnum.FACULTY
            user_role = UserRole(
                user_id=user.id,
                role=role_enum,
                college_id=final_college_id
            )
            db.add(user_role)
            
            results["success"].append({
                "row": row_num,
                "email": email,
                "name": full_name,
                "role": role
            })
            results["total"] += 1
            
        except Exception as e:
            results["failed"].append({
                "row": row_num,
                "email": row.get('email', 'N/A'),
                "error": str(e)
            })
    
    # Commit all successful inserts
    if results["success"]:
        db.commit()
    
    return {
        "message": f"Bulk upload completed: {len(results['success'])} successful, {len(results['failed'])} failed",
        "success_count": len(results["success"]),
        "failed_count": len(results["failed"]),
        "success": results["success"],
        "failed": results["failed"]
    }


@router.post("/staff")
async def bulk_upload_staff(
    file: UploadFile = File(...),
    college_id: int = Query(..., description="College ID - required, will be applied to all uploaded staff"),
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """Bulk upload Faculty, HOD, and College Admin from CSV or Excel file (Super Admin only).
    
    Supported formats: .csv, .xlsx, .xls
    
    Format (headers required):
    email,full_name,role,branch_id,user_id,password
    
    Note: college_id is provided via query parameter and will be automatically applied to all staff.
    
    Fields:
    - email: User email address (required)
    - full_name: Full name
    - role: 'faculty', 'hod', or 'admin' (admin requires college_id)
    - branch_id: Branch ID (recommended - e.g., "CSE001", "ECE001") - most user-friendly
    - department_id: Department ID (optional if branch_id provided)
    - department: Department name (optional if branch_id or department_id provided)
    - college_id: College ID (optional if provided in query param)
    - user_id: Staff ID (optional, used for password if password not provided)
    - password: Password (optional, will use user_id or user.id if not provided)
    
    Note:
    - Each department can have only one HOD. If uploading a new HOD for a department that already has one, the old HOD will be replaced.
    - Faculty and HOD must be assigned to a department.
    - College admin does not require a department.
    
    Priority for department resolution: branch_id > department_id > department name
    
    Example:
    email,full_name,role,branch_id,user_id,password
    faculty.cs@example.com,Dr. Jane Smith,faculty,CSE001,FAC001,MyPassword123
    hod.cs@example.com,Dr. John Doe,hod,CSE001,HOD001,
    admin@example.com,Admin User,admin,,ADMIN001,AdminPass123
    
    Note: college_id is provided via query parameter and will be automatically applied to all staff.
    """
    file_ext = file.filename.lower().split('.')[-1]
    if file_ext not in ['csv', 'xlsx', 'xls']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV and Excel files (.csv, .xlsx, .xls) are supported"
        )
    
    # Read file content
    contents = await file.read()
    
    # Parse based on file type
    if file_ext == 'csv':
        csv_content = contents.decode('utf-8')
        csv_reader_raw = csv.DictReader(io.StringIO(csv_content))
        # Normalize CSV headers to lowercase - DictReader preserves original case
        csv_rows_normalized = []
        for row in csv_reader_raw:
            # Normalize all keys to lowercase for consistent lookup
            normalized_row = {}
            for k, v in row.items():
                if k:  # Skip None or empty keys
                    key_normalized = str(k).lower().strip()
                    value_normalized = str(v).strip() if v is not None else ""
                    normalized_row[key_normalized] = value_normalized
            csv_rows_normalized.append(normalized_row)
        csv_reader = csv_rows_normalized
        # Debug: Log CSV headers
        if csv_rows_normalized:
            print(f"[Bulk Upload Staff] CSV Headers found: {list(csv_rows_normalized[0].keys())}")
    else:
        # Excel file
        excel_file = io.BytesIO(contents)
        workbook = load_workbook(excel_file, read_only=True, data_only=True)
        
        # Try to find the "Staff" sheet first, otherwise use active sheet
        sheet = None
        if "Staff" in workbook.sheetnames:
            sheet = workbook["Staff"]
            print(f"[Bulk Upload Staff] Using 'Staff' sheet")
        else:
            sheet = workbook.active
            print(f"[Bulk Upload Staff] Using active sheet: '{sheet.title}'")
            print(f"[Bulk Upload Staff] Available sheets: {workbook.sheetnames}")
        
        # Get headers from first row and normalize them (lowercase, strip whitespace)
        headers_raw = []
        for cell in sheet[1]:
            headers_raw.append(cell.value)
        
        if not headers_raw or all(h is None or str(h).strip() == "" for h in headers_raw):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Excel file must have headers in the first row"
            )
        
        # Normalize headers: convert to string, strip whitespace, convert to lowercase
        headers = []
        for header in headers_raw:
            if header is None:
                headers.append("")
            else:
                # Convert to string, strip whitespace, and normalize to lowercase for consistent lookup
                normalized_header = str(header).strip().lower()
                headers.append(normalized_header)
        
        # Debug: Log headers for troubleshooting
        print(f"[Bulk Upload Staff] Excel Headers found ({len(headers)}): {headers}")
        
        # Convert Excel rows to CSV-like dict format
        csv_rows = []
        row_count = 0
        for row_idx, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
            row_dict = {}
            for idx, header in enumerate(headers):
                if header:  # Only process non-empty headers
                    # Safely access row[idx] - handle cases where row has fewer columns than headers
                    if idx < len(row):
                        cell_value = row[idx]
                        # Convert to string and strip, handle None values
                        if cell_value is None:
                            row_dict[header] = ""
                        else:
                            row_dict[header] = str(cell_value).strip()
                    else:
                        row_dict[header] = ""
            
            # Debug: Log first few rows for troubleshooting
            if row_idx <= 5:
                print(f"[Bulk Upload Staff] Row {row_idx} raw values: {row}")
                print(f"[Bulk Upload Staff] Row {row_idx} parsed dict: {row_dict}")
                print(f"[Bulk Upload Staff] Row {row_idx} has email key: {'email' in row_dict}")
                print(f"[Bulk Upload Staff] Row {row_idx} email value: '{row_dict.get('email', 'NOT FOUND')}'")
            
            # Only add non-empty rows (rows with at least one non-empty value)
            # Check if row has any non-empty values
            has_data = any(str(v).strip() for v in row_dict.values() if v)
            if has_data:
                csv_rows.append(row_dict)
                row_count += 1
        
        print(f"[Bulk Upload Staff] Total rows with data: {row_count}")
        csv_reader = csv_rows if csv_rows else []
    
    results = {
        "success": [],
        "failed": [],
        "total": 0
    }
    
    # Handle both CSV reader (iterator) and Excel rows (list)
    rows_to_process = list(csv_reader) if isinstance(csv_reader, list) else list(csv_reader)
    
    # Debug: Log number of rows
    print(f"[Bulk Upload Staff] Processing {len(rows_to_process)} rows")
    
    if not rows_to_process:
        return {
            "message": "No data rows found in file. Please ensure the file has data rows (not just headers).",
            "success_count": 0,
            "failed_count": 0,
            "success": [],
            "failed": [{"row": 0, "email": "N/A", "error": "No data rows found in file"}]
        }
    
    for row_num, row in enumerate(rows_to_process, start=2):
        try:
            # Ensure row is a dict and normalize keys to lowercase for case-insensitive matching
            if not isinstance(row, dict):
                results["failed"].append({
                    "row": row_num,
                    "email": "N/A",
                    "error": f"Invalid row format: {type(row)}"
                })
                continue
            
            # Normalize all keys to lowercase for consistent lookup
            normalized_row = {}
            for k, v in row.items():
                if k:  # Skip None or empty keys
                    key_normalized = str(k).lower().strip()
                    value_normalized = str(v).strip() if v is not None else ""
                    normalized_row[key_normalized] = value_normalized
            
            # Debug: Log first few rows for troubleshooting
            if row_num <= 5:
                print(f"[Bulk Upload Staff] Row {row_num} - All keys: {list(normalized_row.keys())}")
                print(f"[Bulk Upload Staff] Row {row_num} - All values: {normalized_row}")
                print(f"[Bulk Upload Staff] Row {row_num} - Email key exists: {'email' in normalized_row}")
                print(f"[Bulk Upload Staff] Row {row_num} - Email value: '{normalized_row.get('email', 'NOT FOUND')}'")
            
            # Extract fields with proper handling
            email = normalized_row.get('email', '').strip().lower() if normalized_row.get('email') else ''
            full_name = normalized_row.get('full_name', '').strip() if normalized_row.get('full_name') else ''
            role = normalized_row.get('role', '').strip().lower() if normalized_row.get('role') else ''
            branch_id_str = normalized_row.get('branch_id', '').strip() if normalized_row.get('branch_id') else ''
            user_id = normalized_row.get('user_id', '').strip() if normalized_row.get('user_id') else ''
            password = normalized_row.get('password', '').strip() if normalized_row.get('password') else ''
            
            if not email:
                results["failed"].append({
                    "row": row_num,
                    "email": email or "N/A",
                    "error": "Email is required"
                })
                continue
            
            if role not in ['faculty', 'hod', 'admin']:
                results["failed"].append({
                    "row": row_num,
                    "email": email,
                    "error": f"Role must be 'faculty', 'hod', or 'admin', got '{role}'"
                })
                continue
            
            # College ID is required from query parameter and applied to all staff
            final_college_id = college_id
            
            # Department is required for faculty and HOD - resolved from branch_id only
            department_id = None
            department_name = None
            
            if role in ['faculty', 'hod']:
                if not branch_id_str:
                    results["failed"].append({
                        "row": row_num,
                        "email": email,
                        "error": "Branch ID is required for faculty and HOD roles (e.g., 'CSE001', 'ECE001')"
                    })
                    continue
            
                # Resolve department_id from branch_id only
                from app.models.academic import Department
                dept = db.query(Department).filter(
                    Department.branch_id == branch_id_str,
                    Department.college_id == final_college_id,
                    Department.is_active == True
                ).first()
                if dept:
                    department_id = dept.id
                    department_name = dept.name
                else:
                    results["failed"].append({
                    "row": row_num,
                    "email": email,
                        "error": f"Branch ID '{branch_id_str}' not found for this college"
                })
                continue
            
            # Check if user already exists
            existing = db.query(User).filter(User.email == email).first()
            if existing:
                results["failed"].append({
                    "row": row_num,
                    "email": email,
                    "error": "User already exists"
                })
                continue
            
            # Determine password: use provided password, or user_id, or user.id as fallback
            if password:
                # Use provided password from upload file
                final_password = password
            elif user_id:
                # Use user_id as password (uppercase)
                final_password = str(user_id).upper()
            else:
                # Will use user.id after creation
                final_password = "TEMP_PASSWORD_PLACEHOLDER"
            
            # Create user
            user = User(
                email=email,
                password_hash=get_password_hash(final_password),
                is_active="true",
                is_verified="true"
            )
            db.add(user)
            db.flush()  # Get user.id
            
            # If password was placeholder, update it with user.id in caps
            if final_password == "TEMP_PASSWORD_PLACEHOLDER":
                user.password_hash = get_password_hash(str(user.id).upper())
            
            # Create profile with department_id
            profile = Profile(
                user_id=user.id,
                email=email,
                full_name=full_name if full_name else None,
                college_id=college_id,
                department=department_name,  # Department name from branch_id (None for admin)
                department_id=department_id,  # Link to Department (None for admin)
            )
            db.add(profile)
            
            # Handle HOD assignment - ensure only one HOD per department
            if role == 'hod' and department_id:
                from app.models.academic import Department
                hod_department = db.query(Department).filter(Department.id == department_id).first()
                if hod_department:
                    # If department already has an HOD, remove the old HOD's role
                    if hod_department.hod_id:
                        old_hod_id = hod_department.hod_id
                        # Remove old HOD role
                        old_hod_role = db.query(UserRole).filter(
                            UserRole.user_id == old_hod_id,
                            UserRole.role == RoleEnum.HOD
                        ).first()
                        if old_hod_role:
                            db.delete(old_hod_role)
                        # Clear department's hod_id
                        hod_department.hod_id = None
                    
                    # Assign new HOD to department
                    hod_department.hod_id = user.id
                    db.add(hod_department)
                    db.flush()  # Flush to ensure department update is saved
            
            # Create role (after HOD assignment to ensure department is set)
            role_enum_map = {
                'faculty': RoleEnum.FACULTY,
                'hod': RoleEnum.HOD,
                'admin': RoleEnum.ADMIN
            }
            user_role = UserRole(
                user_id=user.id,
                role=role_enum_map[role],
                college_id=college_id
            )
            db.add(user_role)
            
            results["success"].append({
                "row": row_num,
                "email": email,
                "name": full_name,
                "role": role
            })
            results["total"] += 1
            
        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            email_val = row.get('email', 'N/A') if isinstance(row, dict) else 'N/A'
            print(f"[Bulk Upload Staff] Error on row {row_num} (email: {email_val}): {str(e)}")
            print(f"[Bulk Upload Staff] Traceback: {error_details}")
            results["failed"].append({
                "row": row_num,
                "email": email_val,
                "error": str(e)
            })
    
    # Commit all successful inserts
    if results["success"]:
        try:
            db.commit()
            print(f"[Bulk Upload Staff] Successfully committed {len(results['success'])} users")
        except Exception as e:
            db.rollback()
            import traceback
            error_details = traceback.format_exc()
            print(f"[Bulk Upload Staff] Commit failed: {str(e)}")
            print(f"[Bulk Upload Staff] Traceback: {error_details}")
            return {
                "message": f"Failed to save users: {str(e)}",
                "success_count": 0,
                "failed_count": len(results["failed"]) + len(results["success"]),
                "success": [],
                "failed": results["failed"] + [{"row": 0, "email": "N/A", "error": f"Database commit failed: {str(e)}"}]
            }
    else:
        print(f"[Bulk Upload Staff] No successful rows to commit. Failed: {len(results['failed'])}")
    
    return {
        "message": f"Bulk upload completed: {len(results['success'])} successful, {len(results['failed'])} failed",
        "success_count": len(results["success"]),
        "failed_count": len(results["failed"]),
        "success": results["success"],
        "failed": results["failed"]
    }


@router.get("/template/hod-faculty")
async def download_hod_faculty_template(
    format: str = "csv",  # csv or xlsx
    current_user_tuple = Depends(get_current_admin_or_super)
):
    """Download CSV or Excel template for HOD/Faculty bulk upload"""
    from fastapi.responses import StreamingResponse
    
    if format.lower() == "xlsx":
        # Excel format
        from openpyxl import Workbook
        
        wb = Workbook()
        ws = wb.active
        ws.title = "HOD Faculty"
        
        # Headers - branch_id is required for faculty and HOD
        # Note: college_id is provided via query parameter, not in the file
        headers = ["email", "full_name", "role", "branch_id", "user_id", "password"]
        ws.append(headers)
        
        # Sample data rows - branch_id is required for faculty and HOD
        # Password is optional - if not provided, will use user_id or user.id
        ws.append(["hod.cs@sbit.edu", "Dr. John Doe", "hod", "CSE001", "HOD001", ""])
        ws.append(["faculty.cs@sbit.edu", "Dr. Jane Smith", "faculty", "CSE001", "FAC001", "MyPassword123"])
        ws.append(["faculty2.cs@sbit.edu", "Dr. Jane Doe", "faculty", "ECE001", "FAC002", ""])
        ws.append(["admin@example.com", "Admin User", "admin", "", "ADMIN001", "AdminPass123"])
        
        # Save to BytesIO
        excel_buffer = io.BytesIO()
        wb.save(excel_buffer)
        excel_buffer.seek(0)
        excel_content = excel_buffer.getvalue()
        excel_buffer.close()
        
        return StreamingResponse(
            iter([excel_content]),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": "attachment; filename=hod_faculty_upload_template.xlsx",
                "Content-Length": str(len(excel_content))
            }
        )
    else:
        # CSV format (default) - branch_id is required for faculty and HOD
        # Note: college_id is provided via query parameter, not in the file
        # Password is optional - if not provided, will use user_id or user.id
        template = "email,full_name,role,branch_id,user_id,password\n"
        template += "hod.cs@sbit.edu,Dr. John Doe,hod,CSE001,HOD001,\n"
        template += "faculty.cs@sbit.edu,Dr. Jane Smith,faculty,CSE001,FAC001,MyPassword123\n"
        template += "faculty2.cs@sbit.edu,Dr. Jane Doe,faculty,ECE001,FAC002,\n"
        template += "admin@example.com,Admin User,admin,,ADMIN001,AdminPass123\n"
        
        return StreamingResponse(
            iter([template.encode('utf-8')]),
            media_type="text/csv",
            headers={
                "Content-Disposition": "attachment; filename=hod_faculty_upload_template.csv",
                "Content-Length": str(len(template.encode('utf-8')))
            }
        )


@router.get("/template/staff")
async def download_staff_template(
    format: str = "csv",  # csv or xlsx
    current_user: User = Depends(get_current_super_admin)
):
    """Download CSV or Excel template for Staff (Faculty/HOD/Admin) bulk upload (Super Admin only)
    
    Enhanced Excel format with:
    - Multiple sheets for different roles
    - Data validation dropdowns
    - Instructions sheet
    - Better formatting
    """
    from fastapi.responses import StreamingResponse
    
    if format.lower() == "xlsx":
        # Enhanced Excel format with multiple sheets
        from openpyxl import Workbook
        from openpyxl.styles import Font, PatternFill, Alignment
        from openpyxl.worksheet.datavalidation import DataValidation
        
        wb = Workbook()
        
        # Remove default sheet
        wb.remove(wb.active)
        
        # Instructions Sheet
        ws_instructions = wb.create_sheet("Instructions", 0)
        ws_instructions.merge_cells('A1:D1')
        ws_instructions['A1'] = "Staff Bulk Upload Template - Instructions"
        ws_instructions['A1'].font = Font(bold=True, size=14)
        ws_instructions['A1'].alignment = Alignment(horizontal='center')
        
        instructions = [
            "",
            "This template allows you to bulk upload Faculty, HOD, and College Admin users.",
            "",
            "FIELD DESCRIPTIONS:",
            "• email: User email address (required, unique)",
            "• full_name: Full name of the user (required)",
            "• role: Must be 'faculty', 'hod', or 'admin' (required)",
            "• branch_id: Branch ID (required for faculty and HOD - e.g., 'CSE001', 'ECE001')",
            "  Note: Department will be automatically resolved from branch_id",
            "• college_id: College ID number (required for admin, optional for others)",
            "• user_id: Staff ID (optional, used for password if password not provided)",
            "• password: Password (optional)",
            "  - If provided, will be used as the user's password",
            "  - If not provided, will use user_id (uppercase) as password",
            "  - If neither password nor user_id provided, will use user.id (uppercase)",
            "  - Users can change their password after login via Profile page",
            "",
            "IMPORTANT NOTES:",
            "• Each department can have only ONE HOD. Uploading a new HOD will replace the existing one.",
            "• Faculty and HOD must be assigned to a department (via branch_id).",
            "• College admin does not require a branch_id.",
            "• Workflow: First create departments/branches, then add faculty/HOD, then add students.",
            "",
            "EXAMPLES:",
            "• Faculty: faculty.cs@example.com,Dr. Jane Smith,faculty,CSE001,1,FAC001",
            "• HOD: hod.cs@example.com,Dr. John Doe,hod,CSE001,1,HOD001",
            "• Admin: admin@example.com,Admin User,admin,,1,ADMIN001",
            "",
            "NOTES:",
            "• Password field is optional:",
            "  - If provided, will be used as the user's password",
            "  - If not provided, will use user_id (uppercase) as password",
            "  - If neither password nor user_id provided, will use user.id (uppercase)",
            "  - Users can change their password after login via Profile page",
            "• Use branch_id for all department linking",
            "• Leave fields empty if not applicable",
            "• Use the 'Staff' sheet below to enter your data",
        ]
        
        for idx, instruction in enumerate(instructions, start=2):
            ws_instructions[f'A{idx}'] = instruction
            ws_instructions[f'A{idx}'].alignment = Alignment(wrap_text=True)
        
        # Adjust column widths
        ws_instructions.column_dimensions['A'].width = 80
        
        # Staff Data Sheet
        ws_staff = wb.create_sheet("Staff", 1)
        
        # Headers with formatting - branch_id is required for faculty and HOD
        # Password is optional - if not provided, will use user_id or user.id
        headers = ["email", "full_name", "role", "branch_id", "user_id", "password"]
        header_fill = PatternFill(start_color="366092", end_color="366092", fill_type="solid")
        header_font = Font(bold=True, color="FFFFFF")
        
        for col_idx, header in enumerate(headers, start=1):
            cell = ws_staff.cell(row=1, column=col_idx, value=header)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal='center', vertical='center')
        
        # Add data validation for role column
        role_validation = DataValidation(type="list", formula1='"faculty,hod,admin"', allow_blank=False)
        role_validation.error = "Please select a valid role: faculty, hod, or admin"
        role_validation.errorTitle = "Invalid Role"
        ws_staff.add_data_validation(role_validation)
        role_validation.add(f"C2:C1000")  # Apply to role column
        
        # Sample data rows - branch_id is required for faculty and HOD
        sample_data = [
            ["faculty.cs@example.com", "Dr. Jane Smith", "faculty", "CSE001", "FAC001", "MyPassword123"],
            ["hod.cs@example.com", "Dr. John Doe", "hod", "CSE001", "HOD001", ""],
            ["faculty2.cs@example.com", "Dr. Jane Doe", "faculty", "ECE001", "FAC002", "FacultyPass456"],
            ["admin@example.com", "Admin User", "admin", "", "ADMIN001", "AdminPass123"]
        ]
        
        for row_idx, row_data in enumerate(sample_data, start=2):
            for col_idx, value in enumerate(row_data, start=1):
                cell = ws_staff.cell(row=row_idx, column=col_idx, value=value)
                if col_idx == 3:  # Role column
                    role_validation.add(cell)
        
        # Adjust column widths
        column_widths = [25, 20, 12, 20, 12, 12, 15, 15, 30]
        for col_idx, width in enumerate(column_widths, start=1):
            ws_staff.column_dimensions[chr(64 + col_idx)].width = width
        
        # Freeze header row
        ws_staff.freeze_panes = "A2"
        
        # Save to BytesIO
        excel_buffer = io.BytesIO()
        wb.save(excel_buffer)
        excel_buffer.seek(0)
        excel_content = excel_buffer.getvalue()
        excel_buffer.close()
        
        return StreamingResponse(
            iter([excel_content]),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": "attachment; filename=staff_upload_template_enhanced.xlsx",
                "Content-Length": str(len(excel_content))
            }
        )
    else:
        # CSV format (default) - branch_id is required for faculty and HOD
        # Note: college_id is provided via query parameter, not in the file
        # Password is optional - if not provided, will use user_id or user.id
        template = "email,full_name,role,branch_id,user_id,password\n"
        template += "faculty.cs@example.com,Dr. Jane Smith,faculty,CSE001,FAC001,MyPassword123\n"
        template += "hod.cs@example.com,Dr. John Doe,hod,CSE001,HOD001,\n"
        template += "faculty2.cs@example.com,Dr. Jane Doe,faculty,ECE001,FAC002,FacultyPass456\n"
        template += "admin@example.com,Admin User,admin,,ADMIN001,AdminPass123\n"
        
        return StreamingResponse(
            iter([template.encode('utf-8')]),
            media_type="text/csv",
            headers={
                "Content-Disposition": "attachment; filename=staff_upload_template.csv",
                "Content-Length": str(len(template.encode('utf-8')))
            }
        )


@router.get("/template/coding-problems")
async def download_coding_problem_template(
    current_user: User = Depends(get_current_super_admin)
):
    """Download JSON template for coding problem bulk upload"""
    from fastapi.responses import Response
    
    template = {
        "problems": [
            {
                "title": "Two Sum",
                "description": "Given an array of integers, find two numbers that add up to a target.",
                "difficulty": "Easy",
                "tags": ["Array", "Hash Table"],
                "constraints": "1 <= nums.length <= 10^4",
                "sample_input": "nums = [2,7,11,15], target = 9",
                "sample_output": "[0,1]",
                "test_cases": {
                    "inputs": [{"nums": [2,7,11,15], "target": 9}],
                    "outputs": [[0,1]]
                },
                "is_active": True
            }
        ]
    }
    
    return Response(
        content=json.dumps(template, indent=2),
        media_type="application/json",
        headers={
            "Content-Disposition": "attachment; filename=coding_problem_upload_template.json"
        }
    )


@router.post("/departments")
async def bulk_upload_departments(
    file: UploadFile = File(...),
    college_id: Optional[int] = None,
    current_user_tuple = Depends(get_current_admin_or_super),
    db: Session = Depends(get_db)
):
    """Bulk upload departments/branches from CSV or Excel file.
    
    Supported formats: .csv, .xlsx, .xls
    
    Format (headers required):
    name,code,branch_id,college_id,number_of_years,vertical
    
    Example:
    name,code,branch_id,college_id,number_of_years,vertical
    Computer Science,CSE,CSE001,1,4,B.Tech
    Electronics,ECE,ECE001,1,4,B.Tech
    Mechanical Engineering,ME,ME001,1,4,B.E
    
    Note: branch_id should be unique. If not provided, will be auto-generated from code.
    """
    from app.models.academic import Department
    
    current_user, is_super_admin = current_user_tuple
    
    # Permission check for college admin
    if not is_super_admin:
        admin_college_id = get_admin_college_id(current_user, db)
        if not admin_college_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Admin must be associated with a college"
            )
        # Auto-set college_id to admin's college
        college_id = admin_college_id
    
    file_ext = file.filename.lower().split('.')[-1]
    if file_ext not in ['csv', 'xlsx', 'xls']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV and Excel files (.csv, .xlsx, .xls) are supported"
        )
    
    # Read file content
    contents = await file.read()
    
    # Parse based on file type
    if file_ext == 'csv':
        csv_content = contents.decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(csv_content))
    else:
        # Excel file
        excel_file = io.BytesIO(contents)
        workbook = load_workbook(excel_file, read_only=True, data_only=True)
        sheet = workbook.active
        
        # Get headers from first row
        headers = [cell.value for cell in sheet[1]]
        if not headers:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Excel file must have headers in the first row"
            )
        
        # Convert Excel rows to CSV-like dict format
        csv_rows = []
        for row in sheet.iter_rows(min_row=2, values_only=True):
            row_dict = {}
            for idx, header in enumerate(headers):
                if header:
                    # Safely access row[idx] - handle cases where row has fewer columns than headers
                    if idx < len(row):
                        row_dict[str(header).strip()] = str(row[idx]).strip() if row[idx] is not None else ""
                    else:
                        row_dict[str(header).strip()] = ""
            csv_rows.append(row_dict)
        
        csv_reader = csv_rows if csv_rows else []
    
    results = {
        "success": [],
        "failed": [],
        "total": 0
    }
    
    # Handle both CSV reader (iterator) and Excel rows (list)
    rows_to_process = list(csv_reader) if isinstance(csv_reader, list) else csv_reader
    
    for row_num, row in enumerate(rows_to_process, start=2):  # Start at 2 (row 1 is header)
        try:
            # Normalize keys to lowercase for case-insensitive matching
            normalized_row = {k.lower().strip(): v for k, v in row.items()}
            
            name = normalized_row.get('name', '').strip() if isinstance(normalized_row.get('name'), str) else str(normalized_row.get('name', '')).strip()
            code = normalized_row.get('code', '').strip() if isinstance(normalized_row.get('code'), str) else str(normalized_row.get('code', '')).strip()
            branch_id = normalized_row.get('branch_id', '').strip() if isinstance(normalized_row.get('branch_id'), str) else str(normalized_row.get('branch_id', '')).strip()
            row_college_id = normalized_row.get('college_id', '').strip() if isinstance(normalized_row.get('college_id'), str) else str(normalized_row.get('college_id', '')).strip()
            # Handle number_of_years - can be string or number
            number_of_years_val = normalized_row.get('number_of_years', '') or normalized_row.get('number of years', '') or normalized_row.get('years', '')
            if number_of_years_val is None:
                number_of_years_str = ''
            elif isinstance(number_of_years_val, (int, float)):
                number_of_years_str = str(int(number_of_years_val))
            else:
                number_of_years_str = str(number_of_years_val).strip()
            vertical = normalized_row.get('vertical', '').strip() if isinstance(normalized_row.get('vertical'), str) else str(normalized_row.get('vertical', '')).strip()
            
            # Use college_id from query param if provided, otherwise from CSV
            final_college_id = college_id if college_id else (int(row_college_id) if row_college_id else None)
            
            if not name:
                results["failed"].append({
                    "row": row_num,
                    "name": name or "N/A",
                    "error": "Name is required"
                })
                continue
            
            if not final_college_id:
                results["failed"].append({
                    "row": row_num,
                    "name": name,
                    "error": "College ID is required (provide in query param or CSV)"
                })
                continue
            
            # Auto-generate branch_id from code if not provided
            if not branch_id and code:
                branch_id = code.upper()
            elif not branch_id:
                # Generate from name
                branch_id = name.upper().replace(' ', '_')[:20]
            
            # Check if branch_id already exists (only active departments)
            existing_dept_by_branch = db.query(Department).filter(
                Department.branch_id == branch_id,
                Department.is_active == True
            ).first()
            if existing_dept_by_branch:
                results["failed"].append({
                    "row": row_num,
                    "name": name,
                    "error": f"Branch ID '{branch_id}' already exists"
                })
                continue
            
            # Check if department with same name and college already exists (only active)
            existing_name = db.query(Department).filter(
                Department.name == name,
                Department.college_id == final_college_id,
                Department.is_active == True
            ).first()
            if existing_name:
                results["failed"].append({
                    "row": row_num,
                    "name": name,
                    "error": f"Department '{name}' already exists for this college"
                })
                continue
            
            # Check if there's an inactive department with same name/college - reactivate it instead
            inactive_dept = db.query(Department).filter(
                Department.name == name,
                Department.college_id == final_college_id,
                Department.is_active == False
            ).first()
            
            if inactive_dept:
                # Reactivate and update the inactive department
                inactive_dept.is_active = True
                if code:
                    inactive_dept.code = code
                if branch_id:
                    inactive_dept.branch_id = branch_id
                if number_of_years_str:
                    try:
                        inactive_dept.number_of_years = int(number_of_years_str)
                    except ValueError:
                        pass
                if vertical:
                    inactive_dept.vertical = vertical
                
                db.commit()
                results["success"].append({
                    "row": row_num,
                    "name": name,
                    "code": code,
                    "branch_id": branch_id or inactive_dept.branch_id,
                    "note": "Reactivated existing inactive department"
                })
                results["total"] += 1
                continue
            
            # Check if there's an inactive department with same branch_id - reactivate it
            inactive_dept_by_branch = db.query(Department).filter(
                Department.branch_id == branch_id,
                Department.is_active == False
            ).first()
            
            if inactive_dept_by_branch:
                # Reactivate and update the inactive department
                inactive_dept_by_branch.is_active = True
                inactive_dept_by_branch.name = name
                if code:
                    inactive_dept_by_branch.code = code
                if number_of_years_str:
                    try:
                        inactive_dept_by_branch.number_of_years = int(number_of_years_str)
                    except ValueError:
                        pass
                if vertical:
                    inactive_dept_by_branch.vertical = vertical
                inactive_dept_by_branch.college_id = final_college_id
                
                db.commit()
                results["success"].append({
                    "row": row_num,
                    "name": name,
                    "code": code,
                    "branch_id": branch_id,
                    "note": "Reactivated existing inactive department"
                })
                results["total"] += 1
                continue
            
            # Parse number_of_years
            number_of_years = None
            if number_of_years_str:
                try:
                    number_of_years = int(number_of_years_str)
                except ValueError:
                    pass
            
            # Create department
            department = Department(
                name=name,
                code=code if code else None,
                branch_id=branch_id,
                college_id=final_college_id,
                number_of_years=number_of_years,
                vertical=vertical if vertical else None,
                is_active=True
            )
            db.add(department)
            
            results["success"].append({
                "row": row_num,
                "name": name,
                "code": code,
                "branch_id": branch_id
            })
            results["total"] += 1
            
        except Exception as e:
            results["failed"].append({
                "row": row_num,
                "name": row.get('name', 'N/A'),
                "error": str(e)
            })
    
    # Commit all successful inserts
    if results["success"]:
        db.commit()
    
    return {
        "message": f"Bulk upload completed: {len(results['success'])} successful, {len(results['failed'])} failed",
        "success_count": len(results["success"]),
        "failed_count": len(results["failed"]),
        "success": results["success"],
        "failed": results["failed"]
    }


@router.get("/template/departments")
async def download_department_template(
    format: str = "csv",  # csv or xlsx
    college_id: Optional[int] = None,  # Optional college_id for auto-linking
    current_user_tuple = Depends(get_current_admin_or_super)
):
    """Download CSV or Excel template for department/branch bulk upload
    
    If college_id is provided as query parameter, it will be auto-set and not included in template.
    Otherwise, college_id column will be included in template.
    """
    from fastapi.responses import StreamingResponse
    
    # If college_id is provided, don't include it in template (will be auto-set)
    include_college_id = college_id is None
    
    if format.lower() == "xlsx":
        # Excel format
        from openpyxl import Workbook
        from openpyxl.styles import Font, PatternFill, Alignment
        
        wb = Workbook()
        ws = wb.active
        ws.title = "Departments"
        
        # Headers with formatting - exclude college_id if provided in query param
        headers = ["name", "code", "branch_id", "number_of_years", "vertical"]
        if include_college_id:
            headers.insert(3, "college_id")  # Insert college_id after branch_id
        
        header_fill = PatternFill(start_color="366092", end_color="366092", fill_type="solid")
        header_font = Font(bold=True, color="FFFFFF")
        
        for col_idx, header in enumerate(headers, start=1):
            cell = ws.cell(row=1, column=col_idx, value=header)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal='center', vertical='center')
        
        # Sample data rows
        sample_data = [
            ["Computer Science", "CSE", "CSE001", "4", "B.Tech"],
            ["Electronics", "ECE", "ECE001", "4", "B.Tech"],
            ["Mechanical Engineering", "ME", "ME001", "4", "B.E"]
        ]
        if include_college_id:
            # Add college_id to sample data
            sample_data = [
                ["Computer Science", "CSE", "CSE001", "1", "4", "B.Tech"],
                ["Electronics", "ECE", "ECE001", "1", "4", "B.Tech"],
                ["Mechanical Engineering", "ME", "ME001", "1", "4", "B.E"]
            ]
        
        for row_idx, row_data in enumerate(sample_data, start=2):
            for col_idx, value in enumerate(row_data, start=1):
                ws.cell(row=row_idx, column=col_idx, value=value)
        
        # Adjust column widths
        column_widths = [25, 12, 15, 15, 15]  # Without college_id
        if include_college_id:
            column_widths = [25, 12, 15, 12, 15, 15]  # With college_id
        for col_idx, width in enumerate(column_widths, start=1):
            ws.column_dimensions[chr(64 + col_idx)].width = width
        
        # Freeze header row
        ws.freeze_panes = "A2"
        
        # Save to BytesIO
        excel_buffer = io.BytesIO()
        wb.save(excel_buffer)
        excel_buffer.seek(0)
        excel_content = excel_buffer.getvalue()
        excel_buffer.close()
        
        return StreamingResponse(
            iter([excel_content]),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": "attachment; filename=department_upload_template.xlsx",
                "Content-Length": str(len(excel_content))
            }
        )
    else:
        # CSV format (default)
        if include_college_id:
            template = "name,code,branch_id,college_id,number_of_years,vertical\n"
            template += "Computer Science,CSE,CSE001,1,4,B.Tech\n"
            template += "Electronics,ECE,ECE001,1,4,B.Tech\n"
            template += "Mechanical Engineering,ME,ME001,1,4,B.E\n"
        else:
            template = "name,code,branch_id,number_of_years,vertical\n"
            template += "Computer Science,CSE,CSE001,4,B.Tech\n"
            template += "Electronics,ECE,ECE001,4,B.Tech\n"
            template += "Mechanical Engineering,ME,ME001,4,B.E\n"
        
        return StreamingResponse(
            iter([template.encode('utf-8')]),
            media_type="text/csv",
            headers={
                "Content-Disposition": "attachment; filename=department_upload_template.csv",
                "Content-Length": str(len(template.encode('utf-8')))
        }
    )

