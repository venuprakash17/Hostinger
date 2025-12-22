"""Coding Problems API - Super Admin only, year-based visibility"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, load_only
from sqlalchemy import and_, or_, func, cast, String
from typing import List, Optional
from datetime import datetime
import hashlib
import time

from app.core.database import get_db, engine
from app.api.auth import get_current_user, get_current_super_admin
from app.models.user import User
from app.models.quiz import CodingProblem
from app.models.user_saved_code import UserSavedCode
from app.models.profile import Profile
from app.models.coding_submission import CodingSubmission
from pydantic import BaseModel

router = APIRouter(prefix="/coding-problems", tags=["coding-problems"])


# ==================== Schemas ====================

class TestCaseInput(BaseModel):
    stdin: str
    expected_output: str
    is_public: bool = True

class CodingProblemCreate(BaseModel):
    title: str
    description: str
    input_format: Optional[str] = None
    output_format: Optional[str] = None
    constraints: Optional[str] = None
    sample_input: Optional[str] = None
    sample_output: Optional[str] = None
    difficulty: Optional[str] = None
    tags: Optional[List[str]] = []
    year: Optional[int] = None  # Year as integer (1-4) for backward compatibility
    year_str: Optional[str] = None  # Year as string (e.g., "1st", "2nd", "3rd", "4th")
    allowed_languages: List[str] = ["python", "c", "cpp", "java", "javascript"]
    restricted_languages: Optional[List[str]] = []
    recommended_languages: Optional[List[str]] = []
    starter_code_python: Optional[str] = None
    starter_code_c: Optional[str] = None
    starter_code_cpp: Optional[str] = None
    starter_code_java: Optional[str] = None
    starter_code_javascript: Optional[str] = None
    time_limit: int = 5
    memory_limit: int = 256
    test_cases: List[TestCaseInput] = []
    is_active: bool = True
    # Scope fields
    scope_type: Optional[str] = "svnapro"  # "svnapro", "college", "department", "section"
    college_id: Optional[int] = None
    department: Optional[str] = None
    section_id: Optional[int] = None
    # section removed - database doesn't have this column, use year-based restriction only
    # academic_year_id removed - database doesn't have this column

class CodingProblemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    input_format: Optional[str] = None
    output_format: Optional[str] = None
    constraints: Optional[str] = None
    sample_input: Optional[str] = None
    sample_output: Optional[str] = None
    difficulty: Optional[str] = None
    tags: Optional[List[str]] = None
    year: Optional[int] = None
    allowed_languages: Optional[List[str]] = None
    restricted_languages: Optional[List[str]] = None
    recommended_languages: Optional[List[str]] = None
    starter_code_python: Optional[str] = None
    starter_code_c: Optional[str] = None
    starter_code_cpp: Optional[str] = None
    starter_code_java: Optional[str] = None
    starter_code_javascript: Optional[str] = None
    time_limit: Optional[int] = None
    memory_limit: Optional[int] = None
    test_cases: Optional[List[TestCaseInput]] = None
    is_active: Optional[bool] = None
    # Scope fields
    scope_type: Optional[str] = None
    college_id: Optional[int] = None
    department: Optional[str] = None
    section_id: Optional[int] = None

class CodingProblemResponse(BaseModel):
    id: int
    title: str = ""
    description: str = ""
    input_format: Optional[str] = None
    output_format: Optional[str] = None
    constraints: Optional[str] = None
    sample_input: Optional[str] = None
    sample_output: Optional[str] = None
    difficulty: Optional[str] = None
    tags: Optional[List[str]] = []
    year: int = 1
    allowed_languages: List[str] = []
    restricted_languages: List[str] = []
    recommended_languages: List[str] = []
    starter_code_python: Optional[str] = None
    starter_code_c: Optional[str] = None
    starter_code_cpp: Optional[str] = None
    starter_code_java: Optional[str] = None
    starter_code_javascript: Optional[str] = None
    time_limit: int = 5
    memory_limit: int = 256
    test_cases: List[dict] = []
    is_active: bool = True
    created_by: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    # Scope fields
    scope_type: Optional[str] = "svnapro"
    college_id: Optional[int] = None
    department: Optional[str] = None
    section_id: Optional[int] = None
    # section removed - column doesn't exist in database
    year_str: Optional[str] = None
    # academic_year_id removed - column doesn't exist in database
    # Analytics tracking
    problem_code: Optional[str] = None  # Unique identifier for analytics

    class Config:
        from_attributes = True

class CodeSaveRequest(BaseModel):
    language: str
    code: str

class CodeExecutionRequest(BaseModel):
    language: str
    code: str
    stdin: Optional[str] = None

class SubmissionRequest(BaseModel):
    language: str
    code: str

class TestCaseRunRequest(BaseModel):
    language: str
    code: str
    test_case_index: int


# ==================== Helper Functions ====================

def parse_year_to_int(year_str: str) -> Optional[int]:
    """Parse year string to integer (1-4)
    
    Handles formats like:
    - "1st", "2nd", "3rd", "4th"
    - "1", "2", "3", "4"
    - "First", "Second", etc.
    """
    if isinstance(year_str, int):
        return year_str if 1 <= year_str <= 4 else None
    
    if not isinstance(year_str, str):
        return None
    
    year_str = year_str.strip().lower()
    
    # Remove ordinal suffixes
    year_str = year_str.replace('st', '').replace('nd', '').replace('rd', '').replace('th', '')
    
    # Try direct number
    try:
        year = int(year_str)
        if 1 <= year <= 4:
            return year
    except:
        pass
    
    # Try word format
    year_map = {
        'first': 1, 'second': 2, 'third': 3, 'fourth': 4,
        'one': 1, 'two': 2, 'three': 3, 'four': 4
    }
    if year_str in year_map:
        return year_map[year_str]
    
    return None


def get_student_year(user: User, db: Session) -> Optional[int]:
    """Get student's year as integer (1-4)"""
    profile = db.query(Profile).filter(Profile.user_id == user.id).first()
    if not profile or not profile.present_year:
        return None
    
    return parse_year_to_int(profile.present_year)


def normalize_text(text: str) -> str:
    """Normalize text for duplicate comparison"""
    if not text:
        return ""
    return ' '.join(text.lower().strip().split())


def find_duplicates(db: Session) -> List[dict]:
    """Find duplicate problems based on normalized title and description"""
    all_problems = db.query(CodingProblem).all()
    seen = {}
    duplicates = []
    
    for problem in all_problems:
        title_norm = normalize_text(problem.title or "")
        desc_norm = normalize_text(problem.description or "")
        key = f"{title_norm}|||{desc_norm}"
        
        if key in seen:
            # Found duplicate
            original = seen[key]
            duplicates.append({
                "original_id": original["id"],
                "original_title": original["title"],
                "duplicate_id": problem.id,
                "duplicate_title": problem.title,
                "created_at": problem.created_at.isoformat() if problem.created_at else None
            })
        else:
            seen[key] = {
                "id": problem.id,
                "title": problem.title
            }
    
    return duplicates


# ==================== CRUD Endpoints ====================

@router.get("/test")
async def test_endpoint():
    """Simple test endpoint to verify routing works"""
    import sys
    print("[TEST] Test endpoint called", file=sys.stderr)
    return {"status": "ok", "message": "Coding problems endpoint is accessible"}


@router.get("/debug")
async def debug_endpoint(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Debug endpoint to test authentication and database"""
    import sys
    print(f"[DEBUG] Debug endpoint called, user_id={current_user.id if current_user else None}", file=sys.stderr)
    try:
        from app.models.quiz import CodingProblem
        count = db.query(CodingProblem).count()
        print(f"[DEBUG] Found {count} coding problems in database", file=sys.stderr)
        return {
            "status": "ok",
            "user_id": current_user.id if current_user else None,
            "problem_count": count
        }
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"[DEBUG] Error in debug endpoint: {e}", file=sys.stderr)
        print(f"[DEBUG] Traceback:\n{error_trace}", file=sys.stderr)
        return {
            "status": "error",
            "error": str(e),
            "traceback": error_trace
        }


@router.get("/", response_model=List[CodingProblemResponse])
async def list_problems(
    difficulty: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    year: Optional[int] = Query(None, description="Filter by year (1-4)"),
    language: Optional[str] = Query(None, description="Filter by language"),
    tags: Optional[str] = Query(None, description="Comma-separated tags"),
    complexity: Optional[str] = Query(None, description="Filter by complexity (Easy/Medium/Hard)"),
    scope_type: Optional[str] = Query(None, description="Filter by scope (svnapro/college/department/section)"),
    solved: Optional[bool] = Query(None, description="Filter by solved status (students only)"),
    search: Optional[str] = Query(None, description="Search in title and description"),
    # academic_year_id parameter removed - column doesn't exist in database
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List coding problems - year-based visibility for students
    
    - Students: Only see problems where problem.year <= student.year
    - Super Admin: See all problems
    - Filters: difficulty, year, language, tags, complexity, scope_type, solved status, search
    """
    import logging
    import traceback
    import sys
    logger = logging.getLogger(__name__)
    
    # CRITICAL: Print immediately to stderr so it shows in docker logs
    print("=" * 80, file=sys.stderr)
    print("[LOG] ========== CODING PROBLEMS LIST ENDPOINT CALLED ==========", file=sys.stderr)
    print(f"[LOG] Timestamp: {datetime.utcnow().isoformat()}", file=sys.stderr)
    print(f"[LOG] User ID: {current_user.id if current_user else None}", file=sys.stderr)
    print(f"[LOG] User Email: {current_user.email if current_user else None}", file=sys.stderr)
    print(f"[LOG] Parameters:", file=sys.stderr)
    print(f"[LOG]   - is_active: {is_active} (type: {type(is_active).__name__})", file=sys.stderr)
    print(f"[LOG]   - difficulty: {difficulty}", file=sys.stderr)
    print(f"[LOG]   - year: {year}", file=sys.stderr)
    print(f"[LOG]   - language: {language}", file=sys.stderr)
    print(f"[LOG]   - tags: {tags}", file=sys.stderr)
    print(f"[LOG]   - scope_type: {scope_type}", file=sys.stderr)
    print(f"[LOG]   - solved: {solved}", file=sys.stderr)
    print(f"[LOG]   - search: {search}", file=sys.stderr)
    print("=" * 80, file=sys.stderr)
    sys.stderr.flush()  # Force flush
    
    # Ensure errors are printed to stdout/stderr
    logger.info(f"[LOG] list_problems called with is_active={is_active}, user_id={current_user.id if current_user else None}")
    
    # Wrap entire function in try-catch to prevent any unhandled exceptions
    try:
        # Ensure we have a valid user
        print("[LOG] Step 1: Validating user...", file=sys.stderr)
        sys.stderr.flush()
        if not current_user or not hasattr(current_user, 'id') or not current_user.id:
            logger.error("[LOG] Invalid user object in list_problems")
            print("[LOG] ❌ Invalid user - returning 401", file=sys.stderr)
            sys.stderr.flush()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required"
            )
        print(f"[LOG] ✅ User validated: ID={current_user.id}", file=sys.stderr)
        sys.stderr.flush()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[LOG] Error validating user: {e}")
        logger.error(traceback.format_exc())
        print(f"[LOG] ❌ User validation error: {e}", file=sys.stderr)
        sys.stderr.flush()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    try:
        print("[LOG] Step 2: Checking user roles...", file=sys.stderr)
        sys.stderr.flush()
        from app.models.user import UserRole, RoleEnum
        
        # Check if user is super admin
        user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
        role_names = [role.role for role in user_roles]
        is_super_admin = RoleEnum.SUPER_ADMIN in role_names
        print(f"[LOG] ✅ User roles checked: {[r.value for r in role_names]}, is_super_admin={is_super_admin}", file=sys.stderr)
        sys.stderr.flush()
    except Exception as e:
        # If there's an error checking roles, assume not super admin
        logger.error(f"[LOG] Error checking user roles: {e}")
        logger.error(traceback.format_exc())
        print(f"[LOG] ⚠️  Error checking roles, defaulting to not super admin: {e}", file=sys.stderr)
        sys.stderr.flush()
        is_super_admin = False
    
    # CRITICAL: Check columns FIRST and use raw SQL if year_str is missing
    # This prevents SQLAlchemy from trying to build a query with missing columns
    print("[LOG] Step 3: Checking database schema...", file=sys.stderr)
    sys.stderr.flush()
    from sqlalchemy import text, inspect
    from sqlalchemy.exc import ProgrammingError, InternalError
    
    use_raw_sql = False
    try:
        inspector = inspect(engine)
        if 'coding_problems' in inspector.get_table_names():
            columns = [col['name'] for col in inspector.get_columns('coding_problems')]
            print(f"[LOG] Found {len(columns)} columns in coding_problems table", file=sys.stderr)
            print(f"[LOG] Columns: {', '.join(columns[:10])}{'...' if len(columns) > 10 else ''}", file=sys.stderr)
            sys.stderr.flush()
            
            # Check for critical columns that might be missing
            missing_columns = []
            if 'year_str' not in columns:
                missing_columns.append('year_str')
            if 'section' not in columns:
                missing_columns.append('section')
            
            if missing_columns:
                print(f"[LOG] ⚠️  Missing columns detected: {missing_columns} - will use raw SQL", file=sys.stderr)
                sys.stderr.flush()
                use_raw_sql = True
            else:
                print("[LOG] ✅ All required columns exist - can use ORM", file=sys.stderr)
                sys.stderr.flush()
                # Try to add it in background
                try:
                    print("[LOG] Attempting to add year_str column...", file=sys.stderr)
                    sys.stderr.flush()
                    conn = engine.connect()
                    trans = conn.begin()
                    try:
                        conn.execute(text("ALTER TABLE coding_problems ADD COLUMN year_str VARCHAR(20)"))
                        trans.commit()
                        print("[LOG] ✅ year_str column added successfully", file=sys.stderr)
                        sys.stderr.flush()
                        use_raw_sql = False  # Can use ORM now
                    except Exception as add_error:
                        trans.rollback()
                        error_msg = str(add_error).lower()
                        if "already exists" not in error_msg and "duplicate" not in error_msg:
                            print(f"[LOG] ⚠️  Error adding column: {add_error}", file=sys.stderr)
                            sys.stderr.flush()
                        else:
                            print(f"[LOG] ℹ️  Column already exists (expected): {add_error}", file=sys.stderr)
                            sys.stderr.flush()
                    finally:
                        conn.close()
                except Exception as e:
                    print(f"[LOG] ⚠️  Migration error: {e}", file=sys.stderr)
                    sys.stderr.flush()
        else:
            print("[LOG] ⚠️  coding_problems table not found!", file=sys.stderr)
            sys.stderr.flush()
    except Exception as migration_check_error:
        print(f"[LOG] ❌ Could not check columns: {migration_check_error}", file=sys.stderr)
        print(f"[LOG] Traceback: {traceback.format_exc()}", file=sys.stderr)
        sys.stderr.flush()
        use_raw_sql = True  # Use raw SQL as fallback
    
    # Handle is_active parameter
    print("[LOG] Step 4: Processing parameters...", file=sys.stderr)
    sys.stderr.flush()
    if is_active is None:
        is_active = True  # Default to active problems only
    elif isinstance(is_active, str):
        is_active = is_active.lower() in ('true', '1', 'yes')
    print(f"[LOG] ✅ Processed is_active: {is_active}", file=sys.stderr)
    sys.stderr.flush()
    
    # CRITICAL FIX: Execute query - use raw SQL if columns missing, otherwise use ORM
    problems = []
    
    if use_raw_sql:
        # Use raw SQL immediately if columns are missing
        print("[LOG] Step 5: Using RAW SQL query method", file=sys.stderr)
        sys.stderr.flush()
        # Will be handled in raw SQL section below
    else:
        # Build and execute ORM query
        print("[LOG] Step 5: Using ORM query method", file=sys.stderr)
        sys.stderr.flush()
        try:
            query = db.query(CodingProblem)
            
            # Apply filters
            if difficulty:
                query = query.filter(CodingProblem.difficulty == difficulty)
            
            if complexity:
                query = query.filter(CodingProblem.difficulty == complexity)
            
            query = query.filter(CodingProblem.is_active == is_active)
            
            if year:
                try:
                    query = query.filter(
                        or_(
                            CodingProblem.year == year,
                            CodingProblem.year == str(year),
                            CodingProblem.year == f"{year}st" if year == 1 else f"{year}nd" if year == 2 else f"{year}rd" if year == 3 else f"{year}th"
                        )
                    )
                except Exception as e:
                    logging.warning(f"Year filter error, skipping: {e}")
            
            if language:
                query = query.filter(
                    or_(
                        CodingProblem.allowed_languages.contains([language]),
                        CodingProblem.restricted_languages.contains([language]),
                        CodingProblem.recommended_languages.contains([language])
                    )
                )
            
            if tags:
                tag_list = [tag.strip() for tag in tags.split(',') if tag.strip()]
                for tag in tag_list:
                    query = query.filter(CodingProblem.tags.contains([tag]))
            
            if scope_type:
                query = query.filter(CodingProblem.scope_type == scope_type)
            
            # academic_year_id filtering removed - column doesn't exist in database
            
            if search:
                search_term = f"%{search.lower()}%"
                query = query.filter(
                    or_(
                        func.lower(CodingProblem.title).like(search_term),
                        func.lower(CodingProblem.description).like(search_term)
                    )
                )
            
            now = datetime.utcnow()
            query = query.filter(
                or_(
                    CodingProblem.expiry_date.is_(None),
                    CodingProblem.expiry_date > now
                )
            )
            
            # Execute ORM query
            print(f"[LOG] Executing ORM query...", file=sys.stderr)
            sys.stderr.flush()
            # CRITICAL: Use load_only to explicitly exclude non-existent columns
            # This prevents SQLAlchemy from trying to SELECT columns that don't exist
            try:
                # Explicitly load only columns that exist - exclude academic_year_id and section
                problems = query.options(
                    load_only(
                        CodingProblem.id, CodingProblem.title, CodingProblem.description,
                        CodingProblem.input_format, CodingProblem.output_format,
                        CodingProblem.constraints, CodingProblem.sample_input,
                        CodingProblem.sample_output, CodingProblem.difficulty,
                        CodingProblem.tags, CodingProblem.year, CodingProblem.year_str,
                        CodingProblem.allowed_languages, CodingProblem.restricted_languages,
                        CodingProblem.recommended_languages, CodingProblem.starter_code_python,
                        CodingProblem.starter_code_c, CodingProblem.starter_code_cpp,
                        CodingProblem.starter_code_java, CodingProblem.starter_code_javascript,
                        CodingProblem.time_limit, CodingProblem.memory_limit,
                        CodingProblem.test_cases, CodingProblem.is_active,
                        CodingProblem.created_by, CodingProblem.expiry_date,
                        CodingProblem.scope_type, CodingProblem.college_id,
                        CodingProblem.department, CodingProblem.section_id,
                        CodingProblem.problem_code, CodingProblem.created_at,
                        CodingProblem.updated_at
                        # NOTE: academic_year_id and section explicitly excluded
                    )
                ).order_by(CodingProblem.created_at.desc()).limit(1000).all()  # Limit for performance
                print(f"[LOG] ✅ ORM query successful: found {len(problems)} problems", file=sys.stderr)
                sys.stderr.flush()
            except (ProgrammingError, InternalError) as immediate_error:
                # If query fails immediately, rollback and switch to raw SQL
                error_str = str(immediate_error).lower()
                print(f"[LOG] ❌ Immediate ORM query error: {immediate_error}", file=sys.stderr)
                sys.stderr.flush()
                try:
                    db.rollback()
                    print(f"[LOG] ✅ Transaction rolled back after immediate error", file=sys.stderr)
                    sys.stderr.flush()
                except:
                    pass
                raise immediate_error  # Re-raise to be caught by outer handler
        except (ProgrammingError, InternalError) as query_error:
            error_str = str(query_error).lower()
            print(f"[LOG] ❌ ORM query failed with database error: {query_error}", file=sys.stderr)
            sys.stderr.flush()
            # CRITICAL: Rollback the failed transaction before trying raw SQL
            try:
                db.rollback()
                print(f"[LOG] ✅ Transaction rolled back successfully", file=sys.stderr)
                sys.stderr.flush()
            except Exception as rollback_error:
                print(f"[LOG] ⚠️  Rollback error (may be expected): {rollback_error}", file=sys.stderr)
                sys.stderr.flush()
            
            if "undefinedcolumn" in error_str or ("column" in error_str and "does not exist" in error_str):
                print(f"[LOG] ⚠️  Column error detected - falling back to raw SQL", file=sys.stderr)
                sys.stderr.flush()
                use_raw_sql = True  # Switch to raw SQL
            else:
                print(f"[LOG] ⚠️  Non-column database error - falling back to raw SQL", file=sys.stderr)
                sys.stderr.flush()
                use_raw_sql = True  # Fallback to raw SQL
        except Exception as e:
            logger.error(f"[LOG] Unexpected error in ORM query: {e}")
            logger.error(traceback.format_exc())
            print(f"[LOG] ❌ Unexpected ORM error: {e}", file=sys.stderr)
            print(f"[LOG] Traceback: {traceback.format_exc()}", file=sys.stderr)
            sys.stderr.flush()
            # CRITICAL: Rollback the failed transaction
            try:
                db.rollback()
                print(f"[LOG] ✅ Transaction rolled back after unexpected error", file=sys.stderr)
                sys.stderr.flush()
            except Exception as rollback_error:
                print(f"[LOG] ⚠️  Rollback error: {rollback_error}", file=sys.stderr)
                sys.stderr.flush()
            use_raw_sql = True  # Fallback to raw SQL
    
    # Execute raw SQL if needed (either from start or as fallback)
    if use_raw_sql:
        print("[LOG] Step 6: Executing RAW SQL query...", file=sys.stderr)
        sys.stderr.flush()
        # CRITICAL: Ensure transaction is clean before raw SQL
        try:
            db.rollback()
            print(f"[LOG] ✅ Transaction rolled back before raw SQL", file=sys.stderr)
            sys.stderr.flush()
        except Exception as rollback_error:
            print(f"[LOG] ⚠️  Pre-rollback check: {rollback_error}", file=sys.stderr)
            sys.stderr.flush()
        
        try:
            # Get list of existing columns
            inspector = inspect(engine)
            if 'coding_problems' in inspector.get_table_names():
                existing_columns = [col['name'] for col in inspector.get_columns('coding_problems')]
                print(f"[LOG] Found {len(existing_columns)} existing columns for raw SQL", file=sys.stderr)
                sys.stderr.flush()
                
                # Build SELECT with only existing columns (safe columns that should always exist)
                safe_columns = ['id', 'title', 'description', 'input_format', 'output_format', 
                               'constraints', 'sample_input', 'sample_output', 'difficulty', 
                               'tags', 'year', 'allowed_languages', 'restricted_languages', 
                               'recommended_languages', 'starter_code_python', 'starter_code_c', 
                               'starter_code_cpp', 'starter_code_java', 'starter_code_javascript', 
                               'time_limit', 'memory_limit', 'test_cases', 'is_active', 
                               'created_by', 'created_at', 'updated_at', 'scope_type', 
                               'college_id', 'department', 'section_id', 'expiry_date']
                
                # Filter to only columns that actually exist
                select_columns = [col for col in safe_columns if col in existing_columns]
                
                # Add optional columns if they exist (section and academic_year_id removed - don't exist in database)
                optional_columns = ['year_str', 'problem_code']
                for col in optional_columns:
                    if col in existing_columns:
                        select_columns.append(col)
                
                # Build WHERE clause
                where_parts = []
                
                if is_active is not None:
                    where_parts.append(f"is_active = {str(is_active).lower()}")
                else:
                    where_parts.append("is_active = true")
                
                where_parts.append("(expiry_date IS NULL OR expiry_date > NOW())")
                
                # Add other filters if needed (simplified for raw SQL)
                if difficulty and 'difficulty' in existing_columns:
                    difficulty_escaped = difficulty.replace("'", "''")
                    where_parts.append(f"difficulty = '{difficulty_escaped}'")
                
                if scope_type and 'scope_type' in existing_columns:
                    scope_type_escaped = scope_type.replace("'", "''")
                    where_parts.append(f"scope_type = '{scope_type_escaped}'")
                
                # Build and execute raw SQL
                sql = f"""
                    SELECT {', '.join(select_columns)}
                    FROM coding_problems
                    WHERE {' AND '.join(where_parts)}
                    ORDER BY created_at DESC
                """
                print(f"[LOG] Executing raw SQL query with {len(select_columns)} columns", file=sys.stderr)
                print(f"[LOG] SQL: {sql[:200]}...", file=sys.stderr)
                sys.stderr.flush()
                
                result = db.execute(text(sql))
                rows = result.fetchall()
                print(f"[LOG] ✅ Raw SQL query successful: found {len(rows)} rows", file=sys.stderr)
                sys.stderr.flush()
                
                # Convert rows to objects with proper type handling
                for row in rows:
                    row_dict = {}
                    for idx, col_name in enumerate(select_columns):
                        value = row[idx]
                        # Handle JSON columns
                        if col_name in ['tags', 'allowed_languages', 'restricted_languages', 
                                       'recommended_languages', 'test_cases']:
                            if isinstance(value, str):
                                try:
                                    import json
                                    value = json.loads(value)
                                except:
                                    value = [] if col_name != 'test_cases' else []
                            elif value is None:
                                value = [] if col_name != 'test_cases' else []
                        row_dict[col_name] = value
                    
                    # Create a simple object that mimics CodingProblem
                    class ProblemObj:
                        def __init__(self, d):
                            for k, v in d.items():
                                setattr(self, k, v)
                    
                    problem = ProblemObj(row_dict)
                    problems.append(problem)
                
                print(f"[LOG] ✅ Loaded {len(problems)} problems via raw SQL", file=sys.stderr)
                sys.stderr.flush()
        except Exception as sql_error:
            print(f"[LOG] ❌ Raw SQL failed: {sql_error}", file=sys.stderr)
            print(f"[LOG] Traceback: {traceback.format_exc()}", file=sys.stderr)
            sys.stderr.flush()
            logger.error(f"[LOG] Raw SQL error: {sql_error}")
            logger.error(traceback.format_exc())
            problems = []
    
    # Apply year filter in Python if database query failed or for better compatibility
    print(f"[LOG] Step 7: Post-processing {len(problems)} problems...", file=sys.stderr)
    sys.stderr.flush()
    if year and problems:
        filtered_by_year = []
        for problem in problems:
            problem_year = problem.year
            if isinstance(problem_year, str):
                problem_year = parse_year_to_int(problem_year)
            elif problem_year is None:
                continue  # Skip problems with no year
            
            if problem_year == year:
                filtered_by_year.append(problem)
        problems = filtered_by_year
    
    # Year-based and scope-based filtering for students (after fetching, to handle string years)
    if not is_super_admin:
        # Check if user is an institution student (they can see ALL problems, no year filtering)
        user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
        role_names = [role.role for role in user_roles]
        is_institution_student = RoleEnum.INSTITUTION_STUDENT in role_names
        
        if is_institution_student:
            # Institution students can see ALL problems - no year or scope filtering needed
            print(f"[LOG] Institution student detected - showing all problems (no filtering)", file=sys.stderr)
            sys.stderr.flush()
        else:
            # Regular college students: apply year and scope filtering
            student_year = get_student_year(current_user, db)
            student_profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
            
            print(f"[LOG] Student filtering - student_year: {student_year}, profile: {student_profile.full_name if student_profile else None}", file=sys.stderr)
            print(f"[LOG] Total problems before student filtering: {len(problems)}", file=sys.stderr)
            sys.stderr.flush()
            
            if student_year:
                # Filter problems by year and scope after converting string years to integers
                filtered_problems = []
                for problem in problems:
                    problem_year = problem.year
                    if isinstance(problem_year, str):
                        problem_year = parse_year_to_int(problem_year) or 1
                    elif problem_year is None:
                        # If problem has no year, make it visible to all students (default to year 1)
                        problem_year = 1
                        print(f"[LOG] Problem {getattr(problem, 'id', 'unknown')} has no year, defaulting to 1", file=sys.stderr)
                        sys.stderr.flush()
                    
                    # Year check: problem.year <= student.year (students can see problems for their year and below)
                    if problem_year > student_year:
                        print(f"[LOG] Skipping problem {getattr(problem, 'id', 'unknown')}: problem_year={problem_year} > student_year={student_year}", file=sys.stderr)
                        sys.stderr.flush()
                        continue
                    
                    # Scope check: 
                    # - "svnapro": visible to all students (no scope filtering)
                    # - "college": visible if student.college_id matches problem.college_id
                    # - "department": visible if student.college_id and department match
                    # - "section": visible if student.section_id matches problem.section_id
                    # Get scope_type safely (handle None or missing attribute)
                    problem_scope = getattr(problem, 'scope_type', None) or "svnapro"
                    
                    scope_match = False
                    if problem_scope == "svnapro" or not problem_scope:
                        # SvnaPro problems visible to all (or if scope_type is None/empty)
                        scope_match = True
                        print(f"[LOG] Problem {getattr(problem, 'id', 'unknown')}: SvnaPro scope - visible to all", file=sys.stderr)
                        sys.stderr.flush()
                    elif problem_scope == "college":
                        # College-level: check college_id match
                        if student_profile and student_profile.college_id and getattr(problem, 'college_id', None):
                            if student_profile.college_id == problem.college_id:
                                scope_match = True
                                print(f"[LOG] Problem {getattr(problem, 'id', 'unknown')}: College scope match", file=sys.stderr)
                                sys.stderr.flush()
                            else:
                                print(f"[LOG] Problem {getattr(problem, 'id', 'unknown')}: College scope mismatch (student={student_profile.college_id}, problem={problem.college_id})", file=sys.stderr)
                                sys.stderr.flush()
                        elif not getattr(problem, 'college_id', None):
                            # If problem has no college_id, treat as svnapro
                            scope_match = True
                            print(f"[LOG] Problem {getattr(problem, 'id', 'unknown')}: College scope but no college_id - treating as svnapro", file=sys.stderr)
                            sys.stderr.flush()
                    elif problem_scope == "department":
                        # Department-level: check college_id and department match
                        if student_profile and student_profile.college_id and getattr(problem, 'college_id', None):
                            if (student_profile.college_id == problem.college_id and 
                                student_profile.department and getattr(problem, 'department', None) and
                                student_profile.department.lower() == problem.department.lower()):
                                scope_match = True
                                print(f"[LOG] Problem {getattr(problem, 'id', 'unknown')}: Department scope match", file=sys.stderr)
                                sys.stderr.flush()
                    elif problem_scope == "section":
                        # Section-level: check section_id match OR section name match
                        section_match = False
                        if student_profile:
                            # Check by section_id (exact match)
                            if student_profile.section_id and getattr(problem, 'section_id', None):
                                if student_profile.section_id == problem.section_id:
                                    section_match = True
                            # Note: section name matching removed - section column doesn't exist in database
                            # Only section_id matching is supported
                        if section_match:
                            # Also check year match for section-level problems
                            if getattr(problem, 'year_str', None) and student_profile.present_year:
                                # Match year string (e.g., "1st" matches "1st")
                                if problem.year_str.lower() != student_profile.present_year.lower():
                                    section_match = False
                                    print(f"[LOG] Problem {getattr(problem, 'id', 'unknown')}: Section match but year mismatch", file=sys.stderr)
                                    sys.stderr.flush()
                            if section_match:
                                scope_match = True
                                print(f"[LOG] Problem {getattr(problem, 'id', 'unknown')}: Section scope match", file=sys.stderr)
                                sys.stderr.flush()
                    
                    if scope_match:
                        filtered_problems.append(problem)
                        print(f"[LOG] ✅ Problem {getattr(problem, 'id', 'unknown')} added to filtered list", file=sys.stderr)
                        sys.stderr.flush()
                    else:
                        print(f"[LOG] ❌ Problem {getattr(problem, 'id', 'unknown')} filtered out by scope", file=sys.stderr)
                        sys.stderr.flush()
                
                problems = filtered_problems
                print(f"[LOG] ✅ After student filtering: {len(problems)} problems remain", file=sys.stderr)
                sys.stderr.flush()
                
                # Solved status filter (for students only)
                if solved is not None:
                    # Get all problem IDs the student has solved
                    solved_problem_ids = set()
                    if solved:
                        submissions = db.query(CodingSubmission).filter(
                            CodingSubmission.user_id == current_user.id,
                            CodingSubmission.status == "accepted"
                        ).all()
                        solved_problem_ids = {s.problem_id for s in submissions}
                    
                    if solved:
                        # Show only solved problems
                        problems = [p for p in problems if p.id in solved_problem_ids]
                    else:
                        # Show only unsolved problems
                        problems = [p for p in problems if p.id not in solved_problem_ids]
            else:
                # If student has no year set, show only svnapro problems (no year restriction)
                print(f"[LOG] ⚠️  Student has no year set - showing only svnapro problems", file=sys.stderr)
                sys.stderr.flush()
                filtered_problems = []
                for problem in problems:
                    # Only show svnapro problems if student has no year
                    if not problem.scope_type or problem.scope_type == "svnapro":
                        filtered_problems.append(problem)
                problems = filtered_problems
            problems = filtered_problems
            print(f"[LOG] ✅ After no-year filtering: {len(problems)} svnapro problems", file=sys.stderr)
            sys.stderr.flush()
    
    # Convert to response format
    print(f"[LOG] Step 8: Converting {len(problems)} problems to response format...", file=sys.stderr)
    sys.stderr.flush()
    
    # CRITICAL: Access all problem attributes while session is still active
    # Store problem data in dictionaries to avoid lazy loading issues after session closes
    problem_data_list = []
    for problem in problems:
        try:
            # Extract all needed data while session is active
            problem_data = {
                'id': problem.id,
                'title': problem.title or "",
                'description': problem.description or "",
                'input_format': getattr(problem, 'input_format', None),
                'output_format': getattr(problem, 'output_format', None),
                'constraints': getattr(problem, 'constraints', None),
                'sample_input': getattr(problem, 'sample_input', None),
                'sample_output': getattr(problem, 'sample_output', None),
                'difficulty': getattr(problem, 'difficulty', None),
                'tags': problem.tags if isinstance(problem.tags, list) else (problem.tags.split(',') if isinstance(problem.tags, str) else []),
                'year': problem.year,
                'allowed_languages': problem.allowed_languages or [],
                'restricted_languages': problem.restricted_languages or [],
                'recommended_languages': problem.recommended_languages or [],
                'starter_code_python': getattr(problem, 'starter_code_python', None),
                'starter_code_c': getattr(problem, 'starter_code_c', None),
                'starter_code_cpp': getattr(problem, 'starter_code_cpp', None),
                'starter_code_java': getattr(problem, 'starter_code_java', None),
                'starter_code_javascript': getattr(problem, 'starter_code_javascript', None),
                'time_limit': getattr(problem, 'time_limit', 5) or 5,
                'memory_limit': getattr(problem, 'memory_limit', 256) or 256,
                'test_cases': problem.test_cases,
                'is_active': problem.is_active if isinstance(problem.is_active, bool) else str(problem.is_active).lower() == 'true',
                'created_by': getattr(problem, 'created_by', None) if hasattr(problem, 'created_by') else None,
                'created_at': getattr(problem, 'created_at', datetime.utcnow()),
                'updated_at': getattr(problem, 'updated_at', None),
                'scope_type': getattr(problem, 'scope_type', None) or "svnapro",
                'college_id': getattr(problem, 'college_id', None),
                'department': getattr(problem, 'department', None),
                'section_id': getattr(problem, 'section_id', None),
                'year_str': getattr(problem, 'year_str', None),
                'problem_code': getattr(problem, 'problem_code', None)
            }
            problem_data_list.append(problem_data)
        except Exception as e:
            print(f"[ERROR] Failed to extract data from problem {getattr(problem, 'id', 'unknown')}: {e}", file=sys.stderr)
            sys.stderr.flush()
            continue
    
    print(f"[LOG] Extracted data from {len(problem_data_list)} problems, now converting to response format...", file=sys.stderr)
    sys.stderr.flush()
    
    result = []
    try:
        for idx, problem_data in enumerate(problem_data_list):
            if idx == 0:
                print(f"[DEBUG] Processing first problem: ID={problem_data['id']}, year={problem_data['year']}, is_active={problem_data['is_active']}", file=sys.stderr)
                sys.stderr.flush()
            try:
                # Use pre-extracted data to avoid lazy loading issues
                # Convert year to integer if it's a string (handle old data format)
                year_value = problem_data['year']
                if isinstance(year_value, str):
                    year_value = parse_year_to_int(year_value) or 1
                elif year_value is None:
                    year_value = 1
                
                # Ensure year_value is always an int
                if not isinstance(year_value, int):
                    try:
                        year_value = int(year_value) if year_value is not None else 1
                    except:
                        year_value = 1
                
                # Handle test_cases - ensure it's a list
                test_cases = problem_data['test_cases']
                if test_cases is None:
                    test_cases = []
                elif isinstance(test_cases, dict):
                    # If it's a dict, convert to list format
                    test_cases = list(test_cases.values()) if test_cases else []
                elif not isinstance(test_cases, list):
                    test_cases = []
                
                # Handle tags - ensure it's a list
                tags = problem_data['tags']
                if tags is None:
                    tags = []
                elif isinstance(tags, str):
                    # If tags is a string, try to parse it
                    try:
                        import json
                        tags = json.loads(tags)
                    except:
                        tags = [tags]
                elif not isinstance(tags, list):
                    tags = []
                
                # Handle languages - ensure they're lists
                allowed_languages = problem_data['allowed_languages']
                if isinstance(allowed_languages, str):
                    try:
                        import json
                        allowed_languages = json.loads(allowed_languages)
                    except:
                        allowed_languages = [allowed_languages] if allowed_languages else []
                elif not isinstance(allowed_languages, list):
                    allowed_languages = []
                
                restricted_languages = problem_data['restricted_languages']
                if isinstance(restricted_languages, str):
                    try:
                        import json
                        restricted_languages = json.loads(restricted_languages)
                    except:
                        restricted_languages = [restricted_languages] if restricted_languages else []
                elif not isinstance(restricted_languages, list):
                    restricted_languages = []
                
                recommended_languages = problem_data['recommended_languages']
                if isinstance(recommended_languages, str):
                    try:
                        import json
                        recommended_languages = json.loads(recommended_languages)
                    except:
                        recommended_languages = [recommended_languages] if recommended_languages else []
                elif not isinstance(recommended_languages, list):
                    recommended_languages = []
                
                # Ensure time_limit and memory_limit are ints
                time_limit_value = problem_data['time_limit']
                if not isinstance(time_limit_value, int):
                    try:
                        time_limit_value = int(time_limit_value)
                    except:
                        time_limit_value = 5
                
                memory_limit_value = problem_data['memory_limit']
                if not isinstance(memory_limit_value, int):
                    try:
                        memory_limit_value = int(memory_limit_value)
                    except:
                        memory_limit_value = 256
                
                # Ensure is_active is a bool
                is_active_value = problem_data['is_active']
                if not isinstance(is_active_value, bool):
                    is_active_value = str(is_active_value).lower() in ('true', '1', 'yes')
                
                try:
                    response_obj = CodingProblemResponse(
                        id=problem_data['id'],
                        title=problem_data['title'],
                        description=problem_data['description'],
                        input_format=problem_data['input_format'],
                        output_format=problem_data['output_format'],
                        constraints=problem_data['constraints'],
                        sample_input=problem_data['sample_input'],
                        sample_output=problem_data['sample_output'],
                        difficulty=problem_data['difficulty'] or "Unknown",
                        tags=tags,
                        year=year_value,
                        allowed_languages=allowed_languages,
                        restricted_languages=restricted_languages,
                        recommended_languages=recommended_languages,
                        starter_code_python=problem_data['starter_code_python'],
                        starter_code_c=problem_data['starter_code_c'],
                        starter_code_cpp=problem_data['starter_code_cpp'],
                        starter_code_java=problem_data['starter_code_java'],
                        starter_code_javascript=problem_data['starter_code_javascript'],
                        time_limit=time_limit_value,
                        memory_limit=memory_limit_value,
                        test_cases=test_cases,
                        is_active=is_active_value,
                        created_by=problem_data['created_by'],
                        created_at=problem_data['created_at'],
                        updated_at=problem_data['updated_at'],
                        scope_type=problem_data['scope_type'],
                        college_id=problem_data['college_id'],
                        department=problem_data['department'],
                        section_id=problem_data['section_id'],
                        year_str=problem_data['year_str'],
                        problem_code=problem_data['problem_code']
                    )
                    result.append(response_obj)
                    if len(result) % 5 == 0:
                        print(f"[LOG] Converted {len(result)} problems so far...", file=sys.stderr)
                        sys.stderr.flush()
                except Exception as validation_error:
                    # Log validation error with problem details
                    print(f"[VALIDATION ERROR] Problem ID {problem.id}: {validation_error}", file=sys.stderr)
                    print(f"[VALIDATION ERROR] Problem data: year={year_value}, created_at={created_at_value}, is_active={is_active_value}", file=sys.stderr)
                    print(f"[VALIDATION ERROR] Problem title: {problem.title}", file=sys.stderr)
                    print(f"[VALIDATION ERROR] Problem scope_type: {getattr(problem, 'scope_type', None)}", file=sys.stderr)
                    logger.error(f"Validation error for problem {problem.id}: {validation_error}")
                    import traceback
                    error_trace = traceback.format_exc()
                    logger.error(error_trace)
                    print(f"[VALIDATION ERROR] Full traceback:\n{error_trace}", file=sys.stderr)
                    sys.stderr.flush()
                    # Skip this problem instead of failing entire request
                    continue
            except Exception as e:
                # Skip problematic records and log error
                problem_id = getattr(problem, 'id', 'unknown')
                print(f"[ERROR] Error processing problem {problem_id}: {e}", file=sys.stderr)
                logger.error(f"Error processing problem {problem_id}: {e}")
                import traceback
                error_trace = traceback.format_exc()
                logger.error(error_trace)
                print(f"[ERROR] Full traceback:\n{error_trace}", file=sys.stderr)
                sys.stderr.flush()
                continue
        
        print(f"[LOG] ✅ Response conversion complete: {len(result)} problems ready", file=sys.stderr)
        print(f"[LOG] ========== ENDPOINT SUCCESS - RETURNING {len(result)} PROBLEMS ==========", file=sys.stderr)
        print("=" * 80, file=sys.stderr)
        sys.stderr.flush()
        return result
    except HTTPException as http_ex:
        # Only re-raise authentication errors, return empty list for everything else
        if http_ex.status_code == status.HTTP_401_UNAUTHORIZED:
            print(f"[LOG] ❌ Authentication error - re-raising 401", file=sys.stderr)
            sys.stderr.flush()
            raise
        print(f"[LOG] ⚠️  HTTPException caught (non-auth), returning empty list: {http_ex.detail}", file=sys.stderr)
        print(f"[LOG] Status code: {http_ex.status_code}", file=sys.stderr)
        print("=" * 80, file=sys.stderr)
        sys.stderr.flush()
        logger.warning(f"[LOG] HTTPException in list_problems: {http_ex.detail}")
        return []
    except Exception as e:
        # Print to stderr so it shows in docker logs
        error_trace = traceback.format_exc()
        print("=" * 80, file=sys.stderr)
        print(f"[LOG] ❌❌❌ CRITICAL ERROR in list_problems ❌❌❌", file=sys.stderr)
        print(f"[LOG] Error: {e}", file=sys.stderr)
        print(f"[LOG] Error type: {type(e).__name__}", file=sys.stderr)
        print(f"[LOG] Full traceback:", file=sys.stderr)
        print(error_trace, file=sys.stderr)
        print("=" * 80, file=sys.stderr)
        print("[LOG] ⚠️  Returning empty list instead of 500 error to prevent frontend crash", file=sys.stderr)
        print(f"[LOG] ========== ENDPOINT ERROR - RETURNING EMPTY LIST ==========", file=sys.stderr)
        print("=" * 80, file=sys.stderr)
        sys.stderr.flush()
        logger.error(f"[LOG] CRITICAL ERROR in list_problems: {e}")
        logger.error(f"[LOG] Traceback: {error_trace}")
        # NEVER raise 500 - always return empty list
        return []


def get_current_content_creator(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Verify user can create coding problems (super admin, admin, HOD, or faculty)"""
    from app.models.user import UserRole, RoleEnum
    
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
            detail="Only super admins, admins, faculty, or HODs can create coding problems"
        )
    
    # Get college_id from role or profile
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


@router.post("/", response_model=CodingProblemResponse, status_code=status.HTTP_201_CREATED)
async def create_problem(
    problem_data: CodingProblemCreate,
    current_user_tuple = Depends(get_current_content_creator),
    db: Session = Depends(get_db)
):
    """Create coding problem - Super Admin, Admin, Faculty, or HOD"""
    current_user, user_info = current_user_tuple
    
    # Validate year
    if problem_data.year not in [1, 2, 3, 4]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Year must be 1, 2, 3, or 4"
        )
    
    # Validate languages
    valid_languages = ["python", "c", "cpp", "java", "javascript", "js"]
    for lang in problem_data.allowed_languages:
        if lang not in valid_languages:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid language: {lang}. Allowed: {valid_languages}"
            )
    
    # Validate test cases
    if not problem_data.test_cases or len(problem_data.test_cases) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one test case is required to evaluate solutions"
        )
    
    # Validate each test case
    for i, test_case in enumerate(problem_data.test_cases):
        if not test_case.stdin or not test_case.stdin.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Test case {i + 1} is missing input (stdin)"
            )
        if not test_case.expected_output or not test_case.expected_output.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Test case {i + 1} is missing expected output"
            )
    
    # Check for duplicates (case-insensitive)
    title_norm = normalize_text(problem_data.title)
    desc_norm = normalize_text(problem_data.description)
    
    all_problems = db.query(CodingProblem).all()
    duplicate = None
    for prob in all_problems:
        prob_title_norm = normalize_text(prob.title or "")
        prob_desc_norm = normalize_text(prob.description or "")
        if prob_title_norm == title_norm and prob_desc_norm == desc_norm:
            duplicate = prob
            break
    
    if duplicate:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Duplicate problem found: '{duplicate.title}' (ID: {duplicate.id}). Please update the existing problem instead."
        )
    
    # Determine scope_type and related fields
    scope_type = problem_data.scope_type or "svnapro"
    college_id = problem_data.college_id
    department = problem_data.department
    section_id = problem_data.section_id
    
    # Super Admin can create SvnaPro problems (scope_type = "svnapro")
    # College Admin/Faculty/HOD must create college-level problems
    if user_info["is_super_admin"]:
        # Super Admin defaults to "svnapro" if not specified
        if not scope_type or scope_type == "svnapro":
            scope_type = "svnapro"
            college_id = None
            department = None
            section_id = None
        else:
            # Super Admin can also create college-level problems
            if scope_type == "college" and not college_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="college_id is required for college-level problems"
                )
    else:
        # College Admin/Faculty/HOD must create college-level problems
        if scope_type == "svnapro":
            scope_type = "college"  # Force to college level
        
        # Set college_id from user's profile/role
        if not college_id:
            college_id = user_info["college_id"]
            if not college_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="college_id is required for college-level problems"
                )
        
        # Set department from profile if not provided
        if not department and user_info["profile"] and user_info["profile"].department:
            department = user_info["profile"].department
        
        # Note: section column removed - only section_id is supported
        # Section-level problems require section_id (section name matching removed)
        if scope_type == "section":
            # section_id is required for section-level problems
            if not section_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Either section_id or section name is required for section-level problems"
                )
    
    # Generate unique problem_code for analytics tracking
    problem_code = f"CP_{hashlib.md5(f'{problem_data.title}_{problem_data.description}_{time.time()}'.encode()).hexdigest()[:12].upper()}"
    
    # Note: section column removed - only section_id is used
    # section_name removed - section column doesn't exist in database
    
    # academic_year_id removed - database doesn't have this column
    # Academic year linking removed
    
    # Convert year to year_str format
    year_str_value = problem_data.year_str
    if not year_str_value and problem_data.year:
        year_int = problem_data.year
        year_str_value = f"{year_int}st" if year_int == 1 else f"{year_int}nd" if year_int == 2 else f"{year_int}rd" if year_int == 3 else f"{year_int}th"
    
    # Create problem
    problem = CodingProblem(
        title=problem_data.title,
        description=problem_data.description,
        input_format=problem_data.input_format,
        output_format=problem_data.output_format,
        constraints=problem_data.constraints,
        sample_input=problem_data.sample_input,
        sample_output=problem_data.sample_output,
        difficulty=problem_data.difficulty,
        tags=problem_data.tags or [],
        year=problem_data.year,  # Keep for backward compatibility
        year_str=year_str_value,  # New string format
        allowed_languages=problem_data.allowed_languages,
        restricted_languages=problem_data.restricted_languages or [],
        recommended_languages=problem_data.recommended_languages or [],
        starter_code_python=problem_data.starter_code_python,
        starter_code_c=problem_data.starter_code_c,
        starter_code_cpp=problem_data.starter_code_cpp,
        starter_code_java=problem_data.starter_code_java,
        starter_code_javascript=problem_data.starter_code_javascript,
        time_limit=problem_data.time_limit,
        memory_limit=problem_data.memory_limit,
        test_cases=[tc.dict() for tc in problem_data.test_cases],
        is_active=problem_data.is_active,
        created_by=current_user.id,
        scope_type=scope_type,
        college_id=college_id,
        department=department,
        section_id=section_id,
        # section removed - column doesn't exist in database
        # academic_year_id removed - column doesn't exist in database
        problem_code=problem_code
    )
    
    db.add(problem)
    db.commit()
    db.refresh(problem)
    
    # Convert year to integer if needed
    year_value = problem.year
    if isinstance(year_value, str):
        year_value = parse_year_to_int(year_value) or 1
    elif year_value is None:
        year_value = 1
    
    return CodingProblemResponse(
        id=problem.id,
        title=problem.title,
        description=problem.description,
        input_format=problem.input_format,
        output_format=problem.output_format,
        constraints=problem.constraints,
        sample_input=problem.sample_input,
        sample_output=problem.sample_output,
        difficulty=problem.difficulty,
        tags=problem.tags or [],
        year=year_value,
        allowed_languages=problem.allowed_languages or [],
        restricted_languages=problem.restricted_languages or [],
        recommended_languages=problem.recommended_languages or [],
        starter_code_python=problem.starter_code_python,
        starter_code_c=problem.starter_code_c,
        starter_code_cpp=problem.starter_code_cpp,
        starter_code_java=problem.starter_code_java,
        starter_code_javascript=problem.starter_code_javascript,
        time_limit=problem.time_limit,
        memory_limit=problem.memory_limit,
        test_cases=problem.test_cases or [],
        is_active=problem.is_active,
        created_by=problem.created_by,
        created_at=problem.created_at,
        updated_at=problem.updated_at,
        scope_type=problem.scope_type or "svnapro",
        college_id=problem.college_id,
        department=problem.department,
        section_id=problem.section_id,
        problem_code=getattr(problem, 'problem_code', None)  # Handle missing column gracefully
    )


@router.get("/{problem_id}", response_model=CodingProblemResponse)
async def get_problem(
    problem_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get problem details - year-check for students"""
    from app.models.user import UserRole, RoleEnum
    
    problem = db.query(CodingProblem).filter(CodingProblem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Check year visibility for students
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    is_super_admin = RoleEnum.SUPER_ADMIN in role_names
    
    if not is_super_admin:
        student_year = get_student_year(current_user, db)
        student_profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        
        # Convert problem.year to int for comparison
        problem_year = problem.year
        if isinstance(problem_year, str):
            problem_year = parse_year_to_int(problem_year) or 1
        elif problem_year is None:
            problem_year = 1
        
        # Year check
        if student_year and problem_year > student_year:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to problems for this year"
            )
        
        # Scope check
        if problem.scope_type == "svnapro":
            # SvnaPro problems visible to all (year check already passed)
            pass
        elif problem.scope_type == "college":
            # College-level: check college_id match
            if not student_profile or not student_profile.college_id or not problem.college_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have access to this problem"
                )
            if student_profile.college_id != problem.college_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have access to this problem"
                )
        elif problem.scope_type == "department":
            # Department-level: check college_id and department match
            if not student_profile or not student_profile.college_id or not problem.college_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have access to this problem"
                )
            if (student_profile.college_id != problem.college_id or
                not student_profile.department or not problem.department or
                student_profile.department.lower() != problem.department.lower()):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have access to this problem"
                )
        elif problem.scope_type == "section":
            # Section-level: check section_id match
            if not student_profile or not student_profile.section_id or not problem.section_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have access to this problem"
                )
            if student_profile.section_id != problem.section_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have access to this problem"
                )
    
    # CRITICAL: Extract all problem data while session is active to avoid lazy loading issues
    try:
        # Extract all needed data while session is active
        problem_data = {
            'id': problem.id,
            'title': problem.title or "",
            'description': problem.description or "",
            'input_format': getattr(problem, 'input_format', None),
            'output_format': getattr(problem, 'output_format', None),
            'constraints': getattr(problem, 'constraints', None),
            'sample_input': getattr(problem, 'sample_input', None),
            'sample_output': getattr(problem, 'sample_output', None),
            'difficulty': getattr(problem, 'difficulty', None) or "Unknown",
            'tags': problem.tags if isinstance(problem.tags, list) else (problem.tags.split(',') if isinstance(problem.tags, str) else []),
            'year': problem.year,
            'allowed_languages': problem.allowed_languages or [],
            'restricted_languages': problem.restricted_languages or [],
            'recommended_languages': problem.recommended_languages or [],
            'starter_code_python': getattr(problem, 'starter_code_python', None),
            'starter_code_c': getattr(problem, 'starter_code_c', None),
            'starter_code_cpp': getattr(problem, 'starter_code_cpp', None),
            'starter_code_java': getattr(problem, 'starter_code_java', None),
            'starter_code_javascript': getattr(problem, 'starter_code_javascript', None),
            'time_limit': getattr(problem, 'time_limit', 5) or 5,
            'memory_limit': getattr(problem, 'memory_limit', 256) or 256,
            'test_cases': problem.test_cases or [],
            'is_active': problem.is_active if isinstance(problem.is_active, bool) else str(problem.is_active).lower() == 'true',
            'created_by': getattr(problem, 'created_by', None) if hasattr(problem, 'created_by') else None,
            'created_at': getattr(problem, 'created_at', datetime.utcnow()),
            'updated_at': getattr(problem, 'updated_at', None),
            'scope_type': getattr(problem, 'scope_type', None) or "svnapro",
            'college_id': getattr(problem, 'college_id', None),
            'department': getattr(problem, 'department', None),
            'section_id': getattr(problem, 'section_id', None),
            'year_str': getattr(problem, 'year_str', None),
            'problem_code': getattr(problem, 'problem_code', None)
        }
    except Exception as e:
        print(f"[ERROR] Failed to extract problem data: {e}", file=sys.stderr)
        import traceback
        print(f"[ERROR] Traceback: {traceback.format_exc()}", file=sys.stderr)
        sys.stderr.flush()
        raise HTTPException(status_code=500, detail=f"Failed to retrieve problem data: {str(e)}")
    
    # Convert year to integer if needed
    year_value = problem_data['year']
    if isinstance(year_value, str):
        year_value = parse_year_to_int(year_value) or 1
    elif year_value is None:
        year_value = 1
    
    # Ensure year_value is always an int
    if not isinstance(year_value, int):
        try:
            year_value = int(year_value) if year_value is not None else 1
        except:
            year_value = 1
    
    # Handle test_cases - ensure it's a list
    test_cases = problem_data['test_cases']
    if test_cases is None:
        test_cases = []
    elif isinstance(test_cases, str):
        # If it's a string (JSON), parse it
        try:
            import json
            test_cases = json.loads(test_cases)
            if not isinstance(test_cases, list):
                test_cases = []
        except:
            test_cases = []
    elif isinstance(test_cases, dict):
        # If it's a dict, convert to list format
        test_cases = list(test_cases.values()) if test_cases else []
    elif not isinstance(test_cases, list):
        test_cases = []
    
    # Ensure test_cases is a list of dicts with proper structure
    if isinstance(test_cases, list):
        # Validate and normalize each test case
        normalized_test_cases = []
        for tc in test_cases:
            if isinstance(tc, dict):
                normalized_test_cases.append(tc)
            elif isinstance(tc, str):
                try:
                    import json
                    parsed = json.loads(tc)
                    if isinstance(parsed, dict):
                        normalized_test_cases.append(parsed)
                except:
                    pass
        test_cases = normalized_test_cases
    
    # Handle tags - ensure it's a list
    tags = problem_data['tags']
    if tags is None:
        tags = []
    elif isinstance(tags, str):
        # If tags is a string, try to parse it
        try:
            import json
            tags = json.loads(tags)
        except:
            tags = [tags]
    elif not isinstance(tags, list):
        tags = []
    
    # Handle languages - ensure they're lists
    allowed_languages = problem_data['allowed_languages']
    if isinstance(allowed_languages, str):
        try:
            import json
            allowed_languages = json.loads(allowed_languages)
        except:
            allowed_languages = [allowed_languages] if allowed_languages else []
    elif not isinstance(allowed_languages, list):
        allowed_languages = []
    
    restricted_languages = problem_data['restricted_languages']
    if isinstance(restricted_languages, str):
        try:
            import json
            restricted_languages = json.loads(restricted_languages)
        except:
            restricted_languages = [restricted_languages] if restricted_languages else []
    elif not isinstance(restricted_languages, list):
        restricted_languages = []
    
    recommended_languages = problem_data['recommended_languages']
    if isinstance(recommended_languages, str):
        try:
            import json
            recommended_languages = json.loads(recommended_languages)
        except:
            recommended_languages = [recommended_languages] if recommended_languages else []
    elif not isinstance(recommended_languages, list):
        recommended_languages = []
    
    # Ensure time_limit and memory_limit are ints
    time_limit_value = problem_data['time_limit']
    if not isinstance(time_limit_value, int):
        try:
            time_limit_value = int(time_limit_value)
        except:
            time_limit_value = 5
    
    memory_limit_value = problem_data['memory_limit']
    if not isinstance(memory_limit_value, int):
        try:
            memory_limit_value = int(memory_limit_value)
        except:
            memory_limit_value = 256
    
    # Ensure is_active is a bool
    is_active_value = problem_data['is_active']
    if not isinstance(is_active_value, bool):
        is_active_value = str(is_active_value).lower() in ('true', '1', 'yes')
    
    return CodingProblemResponse(
        id=problem_data['id'],
        title=problem_data['title'],
        description=problem_data['description'],
        input_format=problem_data['input_format'],
        output_format=problem_data['output_format'],
        constraints=problem_data['constraints'],
        sample_input=problem_data['sample_input'],
        sample_output=problem_data['sample_output'],
        difficulty=problem_data['difficulty'],
        tags=tags,
        year=year_value,
        allowed_languages=allowed_languages,
        restricted_languages=restricted_languages,
        recommended_languages=recommended_languages,
        starter_code_python=problem_data['starter_code_python'],
        starter_code_c=problem_data['starter_code_c'],
        starter_code_cpp=problem_data['starter_code_cpp'],
        starter_code_java=problem_data['starter_code_java'],
        starter_code_javascript=problem_data['starter_code_javascript'],
        time_limit=time_limit_value,
        memory_limit=memory_limit_value,
        test_cases=test_cases,
        is_active=is_active_value,
        created_by=problem_data['created_by'],
        created_at=problem_data['created_at'],
        updated_at=problem_data['updated_at'],
        scope_type=problem_data['scope_type'],
        college_id=problem_data['college_id'],
        department=problem_data['department'],
        section_id=problem_data['section_id'],
        year_str=problem_data['year_str'],
        problem_code=problem_data['problem_code']
    )


@router.put("/{problem_id}", response_model=CodingProblemResponse)
async def update_problem(
    problem_id: int,
    problem_data: CodingProblemUpdate,
    current_user_tuple = Depends(get_current_content_creator),
    db: Session = Depends(get_db)
):
    """Update coding problem - Super Admin, Admin, Faculty, or HOD"""
    current_user, user_info = current_user_tuple
    problem = db.query(CodingProblem).filter(CodingProblem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Validate test cases if provided
    if problem_data.test_cases is not None:
        if len(problem_data.test_cases) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one test case is required to evaluate solutions"
            )
        
        # Validate each test case
        for i, test_case in enumerate(problem_data.test_cases):
            if not test_case.stdin or not test_case.stdin.strip():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Test case {i + 1} is missing input (stdin)"
                )
            if not test_case.expected_output or not test_case.expected_output.strip():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Test case {i + 1} is missing expected output"
                )
    
    # Update fields
    update_data = problem_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        if field == "test_cases" and value:
            # Convert TestCaseInput to dict
            setattr(problem, field, [tc if isinstance(tc, dict) else tc.dict() for tc in value])
        else:
            setattr(problem, field, value)
    
    db.commit()
    db.refresh(problem)
    
    # Convert year to integer if needed
    year_value = problem.year
    if isinstance(year_value, str):
        year_value = parse_year_to_int(year_value) or 1
    elif year_value is None:
        year_value = 1
    
    return CodingProblemResponse(
        id=problem.id,
        title=problem.title,
        description=problem.description,
        input_format=problem.input_format,
        output_format=problem.output_format,
        constraints=problem.constraints,
        sample_input=problem.sample_input,
        sample_output=problem.sample_output,
        difficulty=problem.difficulty,
        tags=problem.tags or [],
        year=year_value,
        allowed_languages=problem.allowed_languages or [],
        restricted_languages=problem.restricted_languages or [],
        recommended_languages=problem.recommended_languages or [],
        starter_code_python=problem.starter_code_python,
        starter_code_c=problem.starter_code_c,
        starter_code_cpp=problem.starter_code_cpp,
        starter_code_java=problem.starter_code_java,
        starter_code_javascript=problem.starter_code_javascript,
        time_limit=problem.time_limit,
        memory_limit=problem.memory_limit,
        test_cases=problem.test_cases or [],
        is_active=problem.is_active,
        created_by=problem.created_by,
        created_at=problem.created_at,
        updated_at=problem.updated_at,
        scope_type=problem.scope_type or "svnapro",
        college_id=problem.college_id,
        department=problem.department,
        section_id=problem.section_id,
        problem_code=getattr(problem, 'problem_code', None)  # Handle missing column gracefully
    )


@router.delete("/{problem_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_problem(
    problem_id: int,
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """Delete coding problem - Super Admin only"""
    problem = db.query(CodingProblem).filter(CodingProblem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    db.delete(problem)
    db.commit()
    return None


# ==================== Deduplication Endpoints ====================

@router.get("/duplicates/find", response_model=List[dict])
async def find_duplicate_problems(
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """Find duplicate problems - Super Admin only"""
    duplicates = find_duplicates(db)
    return duplicates


@router.post("/duplicates/clear", response_model=dict)
async def clear_duplicate_problems(
    keep_latest: bool = Query(True, description="Keep latest duplicate (True) or oldest (False)"),
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """Clear duplicate problems - keeps one, removes others
    
    - keep_latest=True: Keep the most recently created problem
    - keep_latest=False: Keep the oldest problem
    """
    all_problems = db.query(CodingProblem).all()
    seen = {}
    to_delete = []
    kept = []
    
    for problem in all_problems:
        title_norm = normalize_text(problem.title or "")
        desc_norm = normalize_text(problem.description or "")
        key = f"{title_norm}|||{desc_norm}"
        
        if key in seen:
            # Found duplicate
            existing = seen[key]
            if keep_latest:
                # Keep the one created later
                if problem.created_at > existing["created_at"]:
                    to_delete.append(existing["id"])
                    seen[key] = {
                        "id": problem.id,
                        "title": problem.title,
                        "created_at": problem.created_at
                    }
                    kept.append(problem.id)
                else:
                    to_delete.append(problem.id)
            else:
                # Keep the oldest
                to_delete.append(problem.id)
        else:
            seen[key] = {
                "id": problem.id,
                "title": problem.title,
                "created_at": problem.created_at or datetime.utcnow()
            }
            kept.append(problem.id)
    
    # Delete duplicates
    deleted_count = 0
    for problem_id in to_delete:
        problem = db.query(CodingProblem).filter(CodingProblem.id == problem_id).first()
        if problem:
            # Check if there are submissions - if yes, merge them to the kept problem
            submissions = db.query(CodingSubmission).filter(CodingSubmission.problem_id == problem_id).all()
            if submissions and kept:
                # Update submissions to point to the kept problem
                kept_id = kept[0] if isinstance(kept[0], int) else seen[normalize_text(problem.title or "") + "|||" + normalize_text(problem.description or "")]["id"]
                for submission in submissions:
                    submission.problem_id = kept_id
            
            db.delete(problem)
            deleted_count += 1
    
    db.commit()
    
    return {
        "message": f"Cleared {deleted_count} duplicate problems",
        "deleted_count": deleted_count,
        "kept_count": len(kept),
        "kept_ids": kept[:10]  # Show first 10 kept IDs
    }


# ==================== Code Execution Endpoints ====================

@router.post("/{problem_id}/save-code")
async def save_code(
    problem_id: int,
    save_data: CodeSaveRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Save user's code draft for a problem"""
    # Get or create saved code
    saved_code = db.query(UserSavedCode).filter(
        UserSavedCode.user_id == current_user.id,
        UserSavedCode.problem_id == problem_id,
        UserSavedCode.language == save_data.language
    ).first()
    
    if saved_code:
        saved_code.code = save_data.code
        saved_code.updated_at = datetime.utcnow()
    else:
        saved_code = UserSavedCode(
            user_id=current_user.id,
            problem_id=problem_id,
            language=save_data.language,
            code=save_data.code
        )
        db.add(saved_code)
    
    db.commit()
    return {"message": "Code saved successfully"}


@router.get("/{problem_id}/saved-code/{language}")
async def get_saved_code(
    problem_id: int,
    language: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's saved code for a problem"""
    saved_code = db.query(UserSavedCode).filter(
        UserSavedCode.user_id == current_user.id,
        UserSavedCode.problem_id == problem_id,
        UserSavedCode.language == language
    ).first()
    
    if saved_code:
        return {"code": saved_code.code}
    return {"code": None}


@router.post("/{problem_id}/execute")
async def execute_code(
    problem_id: int,
    execution_data: CodeExecutionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Execute code against sample input"""
    from app.services.piston_executor import execute_with_piston
    
    # Get problem
    problem = db.query(CodingProblem).filter(CodingProblem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Validate language
    if execution_data.language not in (problem.allowed_languages or []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Language {execution_data.language} is not allowed"
        )
    
    # Check restricted languages
    if problem.restricted_languages and len(problem.restricted_languages) > 0:
        if execution_data.language not in problem.restricted_languages:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Language {execution_data.language} is restricted. Allowed: {problem.restricted_languages}"
            )
    
    # Use provided stdin or sample input
    stdin = execution_data.stdin or problem.sample_input or ""
    
    try:
        result = await execute_with_piston(
            language=execution_data.language,
            code=execution_data.code,
            stdin=stdin,
            time_limit=problem.time_limit,
            memory_limit=problem.memory_limit
        )
        
        return {
            "output": result.get("output", ""),
            "error": result.get("error"),
            "runtime": result.get("runtime", 0)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Execution failed: {str(e)}"
        )


@router.post("/{problem_id}/run-test-case")
async def run_test_case(
    problem_id: int,
    test_data: TestCaseRunRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Run code against a specific test case"""
    from app.services.piston_executor import execute_with_piston
    
    # Get problem
    problem = db.query(CodingProblem).filter(CodingProblem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    language = test_data.language
    code = test_data.code
    test_case_index = test_data.test_case_index
    
    # Validate language
    if language not in (problem.allowed_languages or []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Language {language} is not allowed"
        )
    
    # Get test case
    test_cases = problem.test_cases or []
    if test_case_index < 0 or test_case_index >= len(test_cases):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid test case index"
        )
    
    test_case = test_cases[test_case_index]
    stdin = test_case.get("stdin", "")
    expected_output = test_case.get("expected_output", "")
    
    try:
        result = await execute_with_piston(
            language=language,
            code=code,
            stdin=stdin,
            time_limit=problem.time_limit,
            memory_limit=problem.memory_limit
        )
        
        actual = result.get("output", "").strip()
        expected = expected_output.strip()
        passed = actual == expected
        
        return {
            "test_case_index": test_case_index,
            "passed": passed,
            "expected": expected,
            "actual": actual,
            "error": result.get("error"),
            "runtime": result.get("runtime", 0),
            "is_public": test_case.get("is_public", True)
        }
    except Exception as e:
        return {
            "test_case_index": test_case_index,
            "passed": False,
            "error": str(e),
            "is_public": test_case.get("is_public", True)
        }


@router.post("/{problem_id}/submit")
async def submit_solution(
    problem_id: int,
    submission_data: SubmissionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit solution - run all test cases"""
    from app.services.piston_executor import execute_with_piston
    
    # Get problem
    problem = db.query(CodingProblem).filter(CodingProblem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Validate language
    if submission_data.language not in (problem.allowed_languages or []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Language {submission_data.language} is not allowed"
        )
    
    # Check restricted languages
    if problem.restricted_languages and len(problem.restricted_languages) > 0:
        if submission_data.language not in problem.restricted_languages:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Language {submission_data.language} is restricted. Allowed: {problem.restricted_languages}"
            )
    
    # Run all test cases
    test_cases = problem.test_cases or []
    results = []
    passed = 0
    total_execution_time = 0.0
    max_memory = 0.0
    
    for i, test_case in enumerate(test_cases):
        try:
            result = await execute_with_piston(
                language=submission_data.language,
                code=submission_data.code,
                stdin=test_case.get("stdin", ""),
                time_limit=problem.time_limit,
                memory_limit=problem.memory_limit
            )
            
            expected = test_case.get("expected_output", "").strip()
            actual = result.get("output", "").strip()
            is_correct = expected == actual
            
            if is_correct:
                passed += 1
            
            # Track execution metrics
            runtime = result.get("runtime")
            if runtime is not None:
                try:
                    total_execution_time += float(runtime)
                except (ValueError, TypeError):
                    pass  # Skip invalid runtime values
            # Memory tracking would need Piston API support
            
            results.append({
                "test_case": i + 1,
                "passed": is_correct,
                "expected": expected,
                "actual": actual,
                "is_public": test_case.get("is_public", True),
                "error": result.get("error") if not is_correct and result.get("error") else None
            })
        except Exception as e:
            results.append({
                "test_case": i + 1,
                "passed": False,
                "error": str(e),
                "is_public": test_case.get("is_public", True)
            })
    
    # Determine status
    if passed == len(test_cases):
        submission_status = "accepted"
    elif passed == 0:
        submission_status = "wrong_answer"
    else:
        submission_status = "wrong_answer"
    
    # Store submission in database
    try:
        submission = CodingSubmission(
            user_id=current_user.id,
            problem_id=problem_id,
            language=submission_data.language,
            code=submission_data.code,
            status=submission_status,
            test_results=results,  # Fixed: use test_results instead of results
            passed_tests=passed,
            total_tests=len(test_cases),
            execution_time=total_execution_time if total_execution_time > 0 else None,
            memory_used=max_memory if max_memory > 0 else None
        )
        db.add(submission)
        db.commit()
        db.refresh(submission)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save submission: {str(e)}"
        )
    
    return {
        "submission_id": submission.id,
        "status": submission_status,
        "success": submission_status == "accepted",
        "passed": passed,
        "failed": len(test_cases) - passed,
        "total": len(test_cases),
        "total_tests": len(test_cases),  # Add for frontend compatibility
        "results": results,
        "execution_time": total_execution_time,
        "memory_used": max_memory if max_memory > 0 else None
    }


@router.get("/{problem_id}/submissions")
async def get_problem_submissions(
    problem_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's submissions for a problem"""
    submissions = db.query(CodingSubmission).filter(
        CodingSubmission.user_id == current_user.id,
        CodingSubmission.problem_id == problem_id
    ).order_by(CodingSubmission.created_at.desc()).all()
    
    return [
        {
            "id": s.id,
            "language": s.language,
            "status": s.status,
            "passed_tests": s.passed_tests,
            "total_tests": s.total_tests,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "results": s.results
        }
        for s in submissions
    ]
