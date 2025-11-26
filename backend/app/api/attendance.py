"""Attendance API endpoints"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from typing import List, Optional
from datetime import date, datetime
from app.core.database import get_db
from app.models.attendance import Attendance
from app.models.user import User, UserRole, RoleEnum
from app.models.profile import Profile
from app.schemas.attendance import (
    AttendanceBulkCreate,
    AttendanceResponse,
    AttendanceUpdate,
    AttendanceApprovalRequest
)
from app.api.auth import get_current_user

router = APIRouter(prefix="/attendance", tags=["attendance"])


def get_current_faculty_or_admin(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> User:
    """Verify user is faculty or admin"""
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    
    if RoleEnum.ADMIN not in role_names and RoleEnum.FACULTY not in role_names:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only faculty and admins can perform this action"
        )
    
    return current_user


def get_current_admin_or_super(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Verify user is admin or super admin, returns (user, is_super_admin)"""
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    
    is_super_admin = RoleEnum.SUPER_ADMIN in role_names
    is_admin = RoleEnum.ADMIN in role_names
    
    if not is_super_admin and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and super admins can perform this action"
        )
    
    return current_user, is_super_admin


@router.post("/", response_model=List[AttendanceResponse], status_code=status.HTTP_201_CREATED)
async def mark_attendance(
    attendance_data: AttendanceBulkCreate,
    current_user: User = Depends(get_current_faculty_or_admin),
    db: Session = Depends(get_db)
):
    """Mark attendance for multiple students (faculty, HOD, or admin). Super Admin cannot mark attendance."""
    import logging
    logger = logging.getLogger(__name__)
    
    # Check if Super Admin is trying to mark attendance
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    if RoleEnum.SUPER_ADMIN in role_names and RoleEnum.FACULTY not in role_names:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Admin cannot mark attendance. They can only view and export."
        )
    if not attendance_data.records:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No attendance records provided"
        )
    
    # Get faculty/admin profile for college_id
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    college_id = profile.college_id if profile else None
    if not college_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must be associated with a college to mark attendance"
        )
    
    is_admin = RoleEnum.ADMIN in role_names or RoleEnum.SUPER_ADMIN in role_names
    is_faculty = RoleEnum.FACULTY in role_names
    today = date.today()
    
    processed_records = []  # Track successfully processed records
    errors = []
    
    try:
        for record in attendance_data.records:
            try:
                # Validate student exists
                student = db.query(User).filter(User.id == record.student_id).first()
                if not student:
                    errors.append(f"Student with ID {record.student_id} not found")
                    continue
                
                # Get student profile
                student_profile = db.query(Profile).filter(Profile.user_id == record.student_id).first()
                if not student_profile:
                    errors.append(f"Profile not found for student {record.student_id}")
                    continue
                
                # Get subject_id - prioritize from record, then look up by name
                subject_id = record.subject_id if hasattr(record, 'subject_id') and record.subject_id else None
                if not subject_id and record.subject:
                    from app.models.academic import Subject
                    subject_obj = db.query(Subject).filter(
                        Subject.name == record.subject,
                        Subject.college_id == college_id
                    ).first()
                    if subject_obj:
                        subject_id = subject_obj.id
                
                if not subject_id and not record.subject:
                    errors.append(f"Subject ID or name required for student {record.student_id}")
                    continue
                
                # Get section_id and section name
                section_id = record.section_id if hasattr(record, 'section_id') and record.section_id else None
                section_name = record.section if hasattr(record, 'section') and record.section else None
                if section_id and not section_name:
                    from app.models.academic import Section
                    section_obj = db.query(Section).filter(Section.id == section_id).first()
                    if section_obj:
                        section_name = section_obj.name
                
                # Get department_id from student profile
                department_id = None
                if student_profile.department:
                    from app.models.academic import Department
                    dept = db.query(Department).filter(
                        Department.name == student_profile.department,
                        Department.college_id == college_id
                    ).first()
                    if dept:
                        department_id = dept.id
                
                # Check if attendance already exists - use a more comprehensive check
                # This handles race conditions better by checking all relevant fields
                period_num = record.period_number if hasattr(record, 'period_number') and record.period_number is not None else None
                
                existing_query = db.query(Attendance).filter(
                    and_(
                        Attendance.student_id == record.student_id,
                        Attendance.date == record.date
                    )
                )
                
                # Add period filter if provided
                if period_num is not None:
                    existing_query = existing_query.filter(Attendance.period_number == period_num)
                else:
                    # If no period specified, match records with no period
                    existing_query = existing_query.filter(Attendance.period_number.is_(None))
                
                # Add subject filter - check both subject_id and subject name
                if subject_id:
                    existing_query = existing_query.filter(Attendance.subject_id == subject_id)
                elif record.subject:
                    existing_query = existing_query.filter(Attendance.subject == record.subject)
                
                # Get the first matching record
                existing = existing_query.first()
                
                # If found, update it instead of creating duplicate
                if existing:
                    # Update existing record
                    # Allow faculty and admins to update past attendance (faculty can update for their assigned subjects)
                    # Only restrict if user is neither admin nor faculty
                    if existing.date < today and not is_admin and not is_faculty:
                        errors.append(f"Cannot update past attendance for student {record.student_id} on {existing.date}")
                        continue
                    
                    existing.status = record.status
                    existing.marked_by = current_user.id
                    if section_name:
                        existing.section = section_name
                    if section_id:
                        existing.section_id = section_id
                    if hasattr(record, 'period_number') and record.period_number is not None:
                        existing.period_number = record.period_number
                    if hasattr(record, 'semester_id') and record.semester_id:
                        existing.semester_id = record.semester_id
                    if subject_id:
                        existing.subject_id = subject_id
                    if hasattr(record, 'notes'):
                        existing.notes = record.notes
                    existing.approval_status = "pending"
                    
                    processed_records.append({
                        'attendance': existing,
                        'student': student,
                        'student_profile': student_profile,
                        'is_update': True
                    })
                else:
                    # Create new record - use try/except to handle race conditions
                    try:
                        new_attendance = Attendance(
                            student_id=record.student_id,
                            subject_id=subject_id,
                            subject=record.subject,
                            date=record.date,
                            status=record.status,
                            semester_id=record.semester_id if hasattr(record, 'semester_id') and record.semester_id else None,
                            period_number=record.period_number if hasattr(record, 'period_number') and record.period_number is not None else None,
                            section=section_name,
                            section_id=section_id,
                            department_id=department_id,
                            college_id=college_id,
                            marked_by=current_user.id,
                            notes=record.notes if hasattr(record, 'notes') else None,
                            approval_status="pending"
                        )
                        db.add(new_attendance)
                        # Flush to check for unique constraint violations before commit
                        db.flush()
                        processed_records.append({
                            'attendance': new_attendance,
                            'student': student,
                            'student_profile': student_profile,
                            'is_update': False
                        })
                    except Exception as create_error:
                        # If unique constraint violation, try to find and update the existing record
                        if "UNIQUE constraint failed" in str(create_error) or "unique_student_subject_date_period" in str(create_error):
                            # Rollback the failed insert
                            db.rollback()
                            # Expire all objects to ensure we see the latest database state
                            db.expire_all()
                            
                            # Re-query to get the record that was just created by another process
                            # Use the same comprehensive query as the initial check
                            existing_query = db.query(Attendance).filter(
                                and_(
                                    Attendance.student_id == record.student_id,
                                    Attendance.date == record.date
                                )
                            )
                            
                            # Add period filter
                            if period_num is not None:
                                existing_query = existing_query.filter(Attendance.period_number == period_num)
                            else:
                                existing_query = existing_query.filter(Attendance.period_number.is_(None))
                            
                            # Add subject filter - check both subject_id and subject name
                            if subject_id:
                                existing_query = existing_query.filter(Attendance.subject_id == subject_id)
                            elif record.subject:
                                existing_query = existing_query.filter(Attendance.subject == record.subject)
                            
                            # Try to find the existing record
                            existing = existing_query.first()
                            
                            # If still not found, try a broader search (without period/subject filters)
                            if not existing:
                                logger.warning(f"Could not find existing record with exact match, trying broader search for student {record.student_id}")
                                existing_query = db.query(Attendance).filter(
                                    and_(
                                        Attendance.student_id == record.student_id,
                                        Attendance.date == record.date
                                    )
                                )
                                existing = existing_query.first()
                            
                            if existing:
                                # Update the existing record
                                # Allow faculty and admins to update past attendance (faculty can update for their assigned subjects)
                                # Only restrict if user is neither admin nor faculty
                                if existing.date < today and not is_admin and not is_faculty:
                                    errors.append(f"Cannot update past attendance for student {record.student_id} on {existing.date}")
                                    continue
                                
                                existing.status = record.status
                                existing.marked_by = current_user.id
                                if section_name:
                                    existing.section = section_name
                                if section_id:
                                    existing.section_id = section_id
                                if hasattr(record, 'period_number') and record.period_number is not None:
                                    existing.period_number = record.period_number
                                if hasattr(record, 'semester_id') and record.semester_id:
                                    existing.semester_id = record.semester_id
                                if subject_id:
                                    existing.subject_id = subject_id
                                if hasattr(record, 'notes'):
                                    existing.notes = record.notes
                                existing.approval_status = "pending"
                                
                                processed_records.append({
                                    'attendance': existing,
                                    'student': student,
                                    'student_profile': student_profile,
                                    'is_update': True
                                })
                                logger.info(f"Successfully updated existing attendance record for student {record.student_id}")
                            else:
                                # If we still can't find it, log the error but don't fail completely
                                # This might happen in rare race conditions - we'll let the commit handle it
                                error_msg = f"Could not find existing attendance record for student {record.student_id} after unique constraint violation. This may be a race condition."
                                logger.warning(error_msg)
                                # Don't add to errors - let it be handled by the commit phase
                                # The record might have been created by another process and will be visible on commit
                                continue
                        else:
                            # For other errors, re-raise to be caught by outer exception handler
                            raise
                
            except Exception as e:
                error_msg = f"Error processing attendance for student {record.student_id}: {str(e)}"
                errors.append(error_msg)
                logger.error(error_msg, exc_info=True)
                continue
        
        # Commit all changes at once
        if processed_records:
            try:
                db.commit()
                # Refresh all attendance objects to get updated timestamps
                for proc_record in processed_records:
                    db.refresh(proc_record['attendance'])
            except Exception as e:
                db.rollback()
                error_msg = f"Failed to save attendance: {str(e)}"
                logger.error(error_msg, exc_info=True)
                
                # Check for unique constraint violation
                if "UNIQUE constraint failed" in str(e) or "unique_student_subject_date_period" in str(e):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Attendance record already exists for this student, subject, date, and period. The record may have been created by another process. Please refresh and try again."
                    )
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=error_msg
                )
        
        # Build responses for all processed records
        result = []
        for proc_record in processed_records:
            attendance = proc_record['attendance']
            student = proc_record['student']
            student_profile = proc_record['student_profile']
            
            # Get subject and semester info
            subject = None
            if attendance.subject_id:
                from app.models.academic import Subject
                subject = db.query(Subject).filter(Subject.id == attendance.subject_id).first()
            semester = None
            if attendance.semester_id:
                from app.models.academic import Semester
                semester = db.query(Semester).filter(Semester.id == attendance.semester_id).first()
            
            result.append(AttendanceResponse(
                id=attendance.id,
                student_id=attendance.student_id,
                subject_id=attendance.subject_id,
                subject=attendance.subject,
                date=attendance.date,
                status=attendance.status,
                semester_id=attendance.semester_id,
                period_number=attendance.period_number,
                section=attendance.section,
                section_id=attendance.section_id,
                notes=attendance.notes,
                college_id=attendance.college_id,
                department_id=attendance.department_id,
                marked_by=attendance.marked_by,
                created_at=attendance.created_at,
                updated_at=attendance.updated_at,
                approval_status=attendance.approval_status,
                approved_by=attendance.approved_by,
                approval_notes=attendance.approval_notes,
                approval_date=attendance.approval_date,
                student_name=student_profile.full_name,
                student_email=student.email,
                student_roll_number=student_profile.roll_number,
                subject_code=subject.code if subject else None,
                semester_name=semester.name if semester else None
            ))
        
        # If we have errors but also some successes, log warnings
        if errors:
            logger.warning(f"Partial success: {len(result)} saved, {len(errors)} errors: {errors[:5]}")
        
        if not result and errors:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to save attendance: {', '.join(errors[:5])}"
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error in mark_attendance: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.get("/students", response_model=List[dict])
async def get_students_for_attendance(
    department: Optional[str] = None,
    section: Optional[str] = None,
    section_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    current_user: User = Depends(get_current_faculty_or_admin),
    db: Session = Depends(get_db)
):
    """Get students for attendance marking (filtered by department/section/section_id/subject_id)"""
    # Get faculty/admin profile
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    college_id = profile.college_id if profile else None
    
    if not college_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must be associated with a college to mark attendance"
        )
    
    # Setup logging for diagnostics (early, before using it)
    import logging
    logger = logging.getLogger(__name__)
    
    # If faculty, verify they are assigned to this subject and section
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    is_faculty = RoleEnum.FACULTY in role_names
    
    # For faculty, verify assignment but don't restrict section filtering
    # We'll use the section_id to get the section name directly
    if is_faculty and subject_id:
        from app.models.academic import SubjectAssignment
        assignment_query = db.query(SubjectAssignment).filter(
            and_(
                SubjectAssignment.faculty_id == current_user.id,
                SubjectAssignment.subject_id == subject_id,
                SubjectAssignment.is_active == True
            )
        )
        
        # If section_id is provided, verify the assignment includes this section
        if section_id:
            assignment_query = assignment_query.filter(
                SubjectAssignment.section_id == section_id
            )
        
        assignment = assignment_query.first()
        if not assignment:
            # For faculty, they must be assigned to the subject
            # If section_id is provided, they must be assigned to that specific section
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"You are not assigned to this subject (ID: {subject_id})" + 
                       (f" and section (ID: {section_id})" if section_id else "")
            )
    
    # Get subject year if subject_id is provided
    subject_year = None
    subject_year_numeric = None
    if subject_id:
        from app.models.academic import Subject
        from app.core.year_utils import parse_year, format_year
        subject = db.query(Subject).filter(Subject.id == subject_id).first()
        if subject and subject.year:
            subject_year = subject.year
            # Normalize year to numeric format for comparison (students store numeric)
            subject_year_numeric = parse_year(subject_year)
            logger.info(f"Subject year: {subject_year} -> numeric: {subject_year_numeric}")
        else:
            logger.warning(f"Subject {subject_id} not found or has no year assigned")
    
    # Get section name - prioritize section_id over section parameter
    section_name = None
    if section_id:
        # Get section name from section_id (most reliable)
        from app.models.academic import Section
        section_obj = db.query(Section).filter(Section.id == section_id).first()
        if section_obj:
            section_name = section_obj.name
            logger.info(f"Got section name '{section_name}' from section_id {section_id}")
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Section with ID {section_id} not found"
            )
    elif section:
        # Fallback to section parameter if section_id not provided
        section_name = section
        logger.info(f"Using section name '{section_name}' from parameter")
    
    # Get student user IDs for this college
    student_user_ids = db.query(UserRole.user_id).filter(
        UserRole.role == RoleEnum.STUDENT
    ).subquery()
    
    # Get profiles for students in this college
    # Note: We don't filter by department here because students in a section
    # might be from different departments, and we want to show all students
    # in the selected section and year regardless of department
    query = db.query(Profile).filter(
        and_(
            Profile.college_id == college_id,
            Profile.user_id.in_(student_user_ids)
        )
    )
    
    # Only filter by department if explicitly provided (for backward compatibility)
    # But for faculty attendance, we rely on section and year filtering
    if department:
        query = query.filter(Profile.department == department)
        logger.info(f"Filtering by department: {department}")
    
    # Get all profiles matching college (and department if specified)
    all_profiles = query.all()
    logger.info(f"Initial query: {len(all_profiles)} students in college {college_id}" + (f" and department {department}" if department else ""))
    
    # Filter by section name - handle flexible matching
    # Section name might be "A" but students might have "A", "A - Sem - 1", etc.
    if section_name:
        filtered_by_section = []
        section_name_clean = section_name.strip().upper()
        for profile in all_profiles:
            if not profile.section:
                continue
            profile_section_clean = profile.section.strip().upper()
            # Check for exact match or if section name is at the start of profile section
            # e.g., section_name="A" matches profile.section="A" or "A - Sem - 1"
            # Also handle case where profile section contains the section name as a word
            if (profile_section_clean == section_name_clean or 
                profile_section_clean.startswith(section_name_clean + " ") or
                profile_section_clean.startswith(section_name_clean + "-")):
                filtered_by_section.append(profile)
        all_profiles = filtered_by_section
        logger.info(f"After section filter ({section_name}): {len(all_profiles)} profiles")
    else:
        logger.info(f"No section filter applied: {len(all_profiles)} profiles")
    
    # Filter by year if subject has a year assigned
    # Students store year as numeric ("1", "2", etc.) after parse_year conversion
    # Subject stores year as formatted ("1st", "2nd", etc.)
    # We need to compare both formats
    if subject_year_numeric:
        from app.core.year_utils import parse_year
        filtered_profiles = []
        for profile in all_profiles:
            if not profile.present_year:
                continue
            # Normalize both to numeric for comparison
            profile_year_numeric = parse_year(profile.present_year)
            # Check if years match (both as numeric)
            if profile_year_numeric == subject_year_numeric:
                filtered_profiles.append(profile)
            else:
                logger.debug(f"Year mismatch: profile {profile.id} has year {profile.present_year} (numeric: {profile_year_numeric}), looking for {subject_year_numeric}")
        profiles = filtered_profiles
        logger.info(f"After year filter ({subject_year} -> {subject_year_numeric}): {len(profiles)} profiles")
    else:
        profiles = all_profiles
        logger.info(f"No year filter applied: {len(profiles)} profiles")
    
    # If no students found, provide diagnostic information
    if len(profiles) == 0:
        # Check if there are any students in the college at all
        total_students = db.query(Profile).filter(
            and_(
                Profile.college_id == college_id,
                Profile.user_id.in_(student_user_ids)
            )
        ).count()
        
        # Check students by section (without year filter)
        students_by_section = db.query(Profile).filter(
            and_(
                Profile.college_id == college_id,
                Profile.user_id.in_(student_user_ids),
                Profile.section.isnot(None)
            )
        ).all()
        section_names_found = set()
        for p in students_by_section:
            if p.section:
                section_names_found.add(p.section)
        
        # Check students by year (without section filter)
        if subject_year_numeric:
            students_by_year = db.query(Profile).filter(
                and_(
                    Profile.college_id == college_id,
                    Profile.user_id.in_(student_user_ids),
                    Profile.present_year.isnot(None)
                )
            ).all()
            year_values_found = set()
            for p in students_by_year:
                if p.present_year:
                    from app.core.year_utils import parse_year
                    year_val = parse_year(p.present_year)
                    year_values_found.add(year_val)
            
            logger.warning(
                f"No students found. Total students in college: {total_students}, "
                f"Sections found: {list(section_names_found)}, "
                f"Years found: {list(year_values_found)}, "
                f"Looking for section: {section_name}, year: {subject_year_numeric}"
            )
        else:
            logger.warning(
                f"No students found. Total students in college: {total_students}, "
                f"Sections found: {list(section_names_found)}, "
                f"Looking for section: {section_name}"
            )
    else:
        logger.info(f"Found {len(profiles)} students for college_id={college_id}, section={section_name}, subject_year={subject_year} (numeric={subject_year_numeric})")
    
    # Get user details
    result = []
    for profile in profiles:
        user = db.query(User).filter(User.id == profile.user_id).first()
        if user:
            result.append({
                "id": user.id,
                "full_name": profile.full_name,
                "email": user.email,
                "roll_number": profile.roll_number,
                "department": profile.department,
                "section": profile.section
            })
    
    return result


@router.get("/", response_model=List[AttendanceResponse])
async def get_attendance(
    student_id: Optional[int] = None,
    subject: Optional[str] = None,
    subject_id: Optional[int] = None,
    section: Optional[str] = None,
    section_id: Optional[int] = None,
    period_number: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    department: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get attendance records with filters"""
    query = db.query(Attendance)
    
    # Role-based filtering
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    is_admin = RoleEnum.ADMIN in role_names or RoleEnum.SUPER_ADMIN in role_names
    is_hod = RoleEnum.HOD in role_names
    is_faculty = RoleEnum.FACULTY in role_names
    is_student = RoleEnum.STUDENT in role_names
    
    # Students can only see their own attendance
    if is_student and not is_admin and not is_hod and not is_faculty:
        query = query.filter(Attendance.student_id == current_user.id)
    # Faculty can see attendance for their assigned subjects
    elif is_faculty and not is_admin:
        profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        if profile and profile.college_id:
            query = query.filter(Attendance.college_id == profile.college_id)
        # Further filter by subject assignments if subject_id is provided
        if subject_id:
            from app.models.academic import SubjectAssignment
            assignment_subject_ids = db.query(SubjectAssignment.subject_id).filter(
                and_(
                    SubjectAssignment.faculty_id == current_user.id,
                    SubjectAssignment.is_active == True
                )
            ).subquery()
            query = query.filter(Attendance.subject_id.in_(assignment_subject_ids))
    # HOD can see attendance for their department
    elif is_hod and not is_admin:
        profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        if profile and profile.department:
            from app.models.academic import Department
            dept = db.query(Department).filter(Department.name == profile.department).first()
            if dept:
                query = query.filter(Attendance.department_id == dept.id)
    
    # Apply filters
    if student_id:
        query = query.filter(Attendance.student_id == student_id)
    if subject:
        query = query.filter(Attendance.subject == subject)
    if subject_id:
        query = query.filter(Attendance.subject_id == subject_id)
    if section:
        query = query.filter(Attendance.section == section)
    if section_id:
        query = query.filter(Attendance.section_id == section_id)
    if period_number is not None:
        query = query.filter(Attendance.period_number == period_number)
    if date_from:
        query = query.filter(Attendance.date >= date_from)
    if date_to:
        query = query.filter(Attendance.date <= date_to)
    if department:
        from app.models.academic import Department
        dept = db.query(Department).filter(Department.name == department).first()
        if dept:
            query = query.filter(Attendance.department_id == dept.id)
    
    records = query.order_by(Attendance.date.desc(), Attendance.created_at.desc()).all()
    
    # Build response with enriched data
    result = []
    for record in records:
        student = db.query(User).filter(User.id == record.student_id).first()
        student_profile = db.query(Profile).filter(Profile.user_id == record.student_id).first()
        subject_obj = None
        if record.subject_id:
            from app.models.academic import Subject
            subject_obj = db.query(Subject).filter(Subject.id == record.subject_id).first()
        semester = None
        if record.semester_id:
            from app.models.academic import Semester
            semester = db.query(Semester).filter(Semester.id == record.semester_id).first()
        
        result.append(AttendanceResponse(
            id=record.id,
            student_id=record.student_id,
            subject_id=record.subject_id,
            subject=record.subject,
            date=record.date,
            status=record.status,
            semester_id=record.semester_id,
            period_number=record.period_number,
            section=record.section,
            section_id=record.section_id,
            notes=record.notes,
            college_id=record.college_id,
            department_id=record.department_id,
            marked_by=record.marked_by,
            created_at=record.created_at,
            updated_at=record.updated_at,
            approval_status=record.approval_status,
            approved_by=record.approved_by,
            approval_notes=record.approval_notes,
            approval_date=record.approval_date,
            student_name=student_profile.full_name if student_profile else None,
            student_email=student.email if student else None,
            student_roll_number=student_profile.roll_number if student_profile else None,
            subject_code=subject_obj.code if subject_obj else None,
            semester_name=semester.name if semester else None
        ))
    
    return result


@router.put("/{attendance_id}", response_model=AttendanceResponse)
async def update_attendance(
    attendance_id: int,
    attendance_data: AttendanceUpdate,
    current_user: User = Depends(get_current_faculty_or_admin),
    db: Session = Depends(get_db)
):
    """Update attendance record (marker, admin, or HOD can update)"""
    attendance = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    
    if not attendance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attendance record not found"
        )
    
    # Check permissions: marker, admin, or HOD can update
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    is_admin = RoleEnum.ADMIN in role_names or RoleEnum.SUPER_ADMIN in role_names
    is_hod = RoleEnum.HOD in role_names
    
    # Check if HOD can update (same department)
    can_update = False
    if attendance.marked_by == current_user.id:
        can_update = True
    elif is_admin:
        can_update = True
    elif is_hod:
        profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        if profile and profile.department:
            from app.models.academic import Department
            dept = db.query(Department).filter(
                Department.name == profile.department,
                Department.id == attendance.department_id
            ).first()
            if dept:
                can_update = True
    
    if not can_update:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update this attendance record"
        )
    
    # Update fields
    if attendance_data.status:
        attendance.status = attendance_data.status
    if attendance_data.notes is not None:
        attendance.notes = attendance_data.notes
    
    attendance.approval_status = "pending"  # Reset approval if edited
    db.commit()
    db.refresh(attendance)
    
    # Get student and subject info for response
    student = db.query(User).filter(User.id == attendance.student_id).first()
    student_profile = db.query(Profile).filter(Profile.user_id == attendance.student_id).first()
    subject = None
    if attendance.subject_id:
        from app.models.academic import Subject
        subject = db.query(Subject).filter(Subject.id == attendance.subject_id).first()
    semester = None
    if attendance.semester_id:
        from app.models.academic import Semester
        semester = db.query(Semester).filter(Semester.id == attendance.semester_id).first()
    
    return AttendanceResponse(
        id=attendance.id,
        student_id=attendance.student_id,
        subject_id=attendance.subject_id,
        subject=attendance.subject,
        date=attendance.date,
        status=attendance.status,
        semester_id=attendance.semester_id,
        period_number=attendance.period_number,
        section=attendance.section,
        section_id=attendance.section_id,
        notes=attendance.notes,
        college_id=attendance.college_id,
        department_id=attendance.department_id,
        marked_by=attendance.marked_by,
        created_at=attendance.created_at,
        updated_at=attendance.updated_at,
        approval_status=attendance.approval_status,
        approved_by=attendance.approved_by,
        approval_notes=attendance.approval_notes,
        approval_date=attendance.approval_date,
        student_name=student_profile.full_name if student_profile else None,
        student_email=student.email if student else None,
        student_roll_number=student_profile.roll_number if student_profile else None,
        subject_code=subject.code if subject else None,
        semester_name=semester.name if semester else None
    )


@router.delete("/{attendance_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_attendance(
    attendance_id: int,
    current_user_tuple = Depends(get_current_admin_or_super),
    db: Session = Depends(get_db)
):
    """Delete attendance record (admin only)"""
    current_user, _ = current_user_tuple
    attendance = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    
    if not attendance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attendance record not found"
        )
    
    db.delete(attendance)
    db.commit()
    
    return None


@router.post("/{attendance_id}/approval", response_model=AttendanceResponse)
async def approve_attendance(
    attendance_id: int,
    approval_data: AttendanceApprovalRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Approve/reject/modify attendance (HOD or admin)"""
    attendance = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    
    if not attendance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attendance record not found"
        )
    
    # Check permissions: HOD or admin can approve
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    is_admin = RoleEnum.ADMIN in role_names or RoleEnum.SUPER_ADMIN in role_names
    is_hod = RoleEnum.HOD in role_names
    
    if not (is_admin or is_hod):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HOD or admin can approve attendance"
        )
    
    # HOD can only approve attendance in their department
    if is_hod and not is_admin:
        profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        if profile and profile.department:
            from app.models.academic import Department
            dept = db.query(Department).filter(
                Department.name == profile.department,
                Department.id == attendance.department_id
            ).first()
            if not dept:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only approve attendance in your department"
                )
    
    # Update approval status
    attendance.approval_status = approval_data.approval_status
    attendance.approved_by = current_user.id
    attendance.approval_notes = approval_data.approval_notes
    attendance.approval_date = datetime.now()
    
    db.commit()
    db.refresh(attendance)
    
    # Get student and subject info for response
    student = db.query(User).filter(User.id == attendance.student_id).first()
    student_profile = db.query(Profile).filter(Profile.user_id == attendance.student_id).first()
    subject = None
    if attendance.subject_id:
        from app.models.academic import Subject
        subject = db.query(Subject).filter(Subject.id == attendance.subject_id).first()
    semester = None
    if attendance.semester_id:
        from app.models.academic import Semester
        semester = db.query(Semester).filter(Semester.id == attendance.semester_id).first()
    
    return AttendanceResponse(
        id=attendance.id,
        student_id=attendance.student_id,
        subject_id=attendance.subject_id,
        subject=attendance.subject,
        date=attendance.date,
        status=attendance.status,
        semester_id=attendance.semester_id,
        period_number=attendance.period_number,
        section=attendance.section,
        section_id=attendance.section_id,
        notes=attendance.notes,
        college_id=attendance.college_id,
        department_id=attendance.department_id,
        marked_by=attendance.marked_by,
        created_at=attendance.created_at,
        updated_at=attendance.updated_at,
        approval_status=attendance.approval_status,
        approved_by=attendance.approved_by,
        approval_notes=attendance.approval_notes,
        approval_date=attendance.approval_date,
        student_name=student_profile.full_name if student_profile else None,
        student_email=student.email if student else None,
        student_roll_number=student_profile.roll_number if student_profile else None,
        subject_code=subject.code if subject else None,
        semester_name=semester.name if semester else None
    )


@router.get("/analytics", response_model=dict)
async def get_attendance_analytics(
    student_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    subject: Optional[str] = None,  # Support subject name for backward compatibility
    section_id: Optional[int] = None,
    section: Optional[str] = None,  # Support section name for backward compatibility
    department: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed attendance analytics for students and teachers"""
    import logging
    logger = logging.getLogger(__name__)
    
    # Role-based filtering
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    is_admin = RoleEnum.ADMIN in role_names or RoleEnum.SUPER_ADMIN in role_names
    is_hod = RoleEnum.HOD in role_names
    is_faculty = RoleEnum.FACULTY in role_names
    is_student = RoleEnum.STUDENT in role_names
    
    # Get user profile for college/department filtering
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    college_id = profile.college_id if profile else None
    
    # Build base query
    query = db.query(Attendance)
    
    # Apply role-based filtering
    if is_student and not is_admin and not is_hod and not is_faculty:
        # Students can only see their own analytics
        query = query.filter(Attendance.student_id == current_user.id)
    elif is_faculty and not is_admin:
        # Faculty can see analytics for their assigned subjects
        if college_id:
            query = query.filter(Attendance.college_id == college_id)
        if subject_id:
            from app.models.academic import SubjectAssignment
            assignment_subject_ids = db.query(SubjectAssignment.subject_id).filter(
                and_(
                    SubjectAssignment.faculty_id == current_user.id,
                    SubjectAssignment.is_active == True,
                    SubjectAssignment.subject_id == subject_id
                )
            ).subquery()
            query = query.filter(Attendance.subject_id.in_(assignment_subject_ids))
    elif is_hod and not is_admin:
        # HOD can see analytics for their department
        if profile and profile.department:
            from app.models.academic import Department
            dept = db.query(Department).filter(Department.name == profile.department).first()
            if dept:
                query = query.filter(Attendance.department_id == dept.id)
    elif is_admin and college_id:
        # College admin can see analytics for their college
        query = query.filter(Attendance.college_id == college_id)
    # Super admin can see all
    
    # Apply filters
    if student_id:
        query = query.filter(Attendance.student_id == student_id)
    
    # Handle subject filter - support both subject_id and subject name
    if subject_id:
        query = query.filter(Attendance.subject_id == subject_id)
    elif subject:
        # Look up subject by name
        from app.models.academic import Subject
        subject_obj = db.query(Subject).filter(Subject.name == subject).first()
        if subject_obj:
            query = query.filter(Attendance.subject_id == subject_obj.id)
        else:
            # Also try matching by subject field in attendance (for backward compatibility)
            query = query.filter(Attendance.subject == subject)
    
    # Handle section filter - support both section_id and section name
    if section_id:
        query = query.filter(Attendance.section_id == section_id)
    elif section:
        # Look up section by name
        from app.models.academic import Section
        section_obj = db.query(Section).filter(Section.name == section).first()
        if section_obj:
            query = query.filter(Attendance.section_id == section_obj.id)
        else:
            # Also try matching by section field in attendance (for backward compatibility)
            query = query.filter(Attendance.section == section)
    
    if department:
        from app.models.academic import Department
        dept = db.query(Department).filter(Department.name == department).first()
        if dept:
            query = query.filter(Attendance.department_id == dept.id)
    if date_from:
        query = query.filter(Attendance.date >= date_from)
    if date_to:
        query = query.filter(Attendance.date <= date_to)
    
    # Get all attendance records
    records = query.all()
    
    if not records:
        # Return structure matching frontend expectations
        return {
            "summary": {
                "total_records": 0,
                "present_count": 0,
                "absent_count": 0,
                "late_count": 0,
                "attendance_percentage": 0.0
            },
            "by_subject": {},
            "by_date": {},
            "by_student": []
        }
    
    # Calculate overall statistics
    total_records = len(records)
    present_count = sum(1 for r in records if r.status == "present")
    absent_count = sum(1 for r in records if r.status == "absent")
    late_count = sum(1 for r in records if r.status == "late")
    excused_count = sum(1 for r in records if r.status == "excused")
    present_percentage = (present_count / total_records * 100) if total_records > 0 else 0.0
    
    # Get unique students and subjects
    student_ids = set(r.student_id for r in records)
    subject_ids = set(r.subject_id for r in records if r.subject_id)
    section_ids = set(r.section_id for r in records if r.section_id)
    dates = set(r.date for r in records)
    period_numbers = set(r.period_number for r in records if r.period_number is not None)
    
    # Subject-wise statistics
    subject_stats = []
    for subj_id in subject_ids:
        subject_records = [r for r in records if r.subject_id == subj_id]
        if not subject_records:
            continue
        
        from app.models.academic import Subject
        subject = db.query(Subject).filter(Subject.id == subj_id).first()
        if not subject:
            continue
        
        subj_students = set(r.student_id for r in subject_records)
        subj_present = sum(1 for r in subject_records if r.status == "present")
        subj_absent = sum(1 for r in subject_records if r.status == "absent")
        subj_late = sum(1 for r in subject_records if r.status == "late")
        subj_excused = sum(1 for r in subject_records if r.status == "excused")
        subj_total = len(subject_records)
        subj_present_pct = (subj_present / subj_total * 100) if subj_total > 0 else 0.0
        
        subject_stats.append({
            "subject_id": subj_id,
            "subject_name": subject.name,
            "subject_code": subject.code,
            "total_classes": len(dates),
            "total_students": len(subj_students),
            "total_records": subj_total,
            "present": subj_present,
            "absent": subj_absent,
            "late": subj_late,
            "excused": subj_excused,
            "present_percentage": round(subj_present_pct, 2)
        })
    
    # Student-wise statistics
    student_stats = []
    for stud_id in student_ids:
        student_records = [r for r in records if r.student_id == stud_id]
        if not student_records:
            continue
        
        student = db.query(User).filter(User.id == stud_id).first()
        student_profile = db.query(Profile).filter(Profile.user_id == stud_id).first()
        if not student or not student_profile:
            continue
        
        stud_present = sum(1 for r in student_records if r.status == "present")
        stud_absent = sum(1 for r in student_records if r.status == "absent")
        stud_late = sum(1 for r in student_records if r.status == "late")
        stud_excused = sum(1 for r in student_records if r.status == "excused")
        stud_total = len(student_records)
        stud_present_pct = (stud_present / stud_total * 100) if stud_total > 0 else 0.0
        
        # Subject-wise breakdown for this student
        stud_subject_stats = []
        for subj_id in set(r.subject_id for r in student_records if r.subject_id):
            subj_records = [r for r in student_records if r.subject_id == subj_id]
            from app.models.academic import Subject
            subject = db.query(Subject).filter(Subject.id == subj_id).first()
            if subject:
                subj_present = sum(1 for r in subj_records if r.status == "present")
                subj_total = len(subj_records)
                subj_pct = (subj_present / subj_total * 100) if subj_total > 0 else 0.0
                stud_subject_stats.append({
                    "subject_id": subj_id,
                    "subject_name": subject.name,
                    "total_classes": subj_total,
                    "present": subj_present,
                    "present_percentage": round(subj_pct, 2)
                })
        
        student_stats.append({
            "student_id": stud_id,
            "student_name": student_profile.full_name,
            "student_email": student.email,
            "roll_number": student_profile.roll_number,
            "total_classes": stud_total,
            "present": stud_present,
            "absent": stud_absent,
            "late": stud_late,
            "excused": stud_excused,
            "present_percentage": round(stud_present_pct, 2),
            "subject_wise_breakdown": stud_subject_stats
        })
    
    # Daily statistics
    daily_stats = []
    for att_date in sorted(dates):
        daily_records = [r for r in records if r.date == att_date]
        daily_present = sum(1 for r in daily_records if r.status == "present")
        daily_absent = sum(1 for r in daily_records if r.status == "absent")
        daily_late = sum(1 for r in daily_records if r.status == "late")
        daily_excused = sum(1 for r in daily_records if r.status == "excused")
        daily_total = len(daily_records)
        daily_present_pct = (daily_present / daily_total * 100) if daily_total > 0 else 0.0
        
        daily_stats.append({
            "date": att_date.isoformat(),
            "total_students": len(set(r.student_id for r in daily_records)),
            "total_records": daily_total,
            "present": daily_present,
            "absent": daily_absent,
            "late": daily_late,
            "excused": daily_excused,
            "present_percentage": round(daily_present_pct, 2)
        })
    
    # Section-wise statistics
    section_stats = []
    for sect_id in section_ids:
        section_records = [r for r in records if r.section_id == sect_id]
        if not section_records:
            continue
        
        from app.models.academic import Section
        section = db.query(Section).filter(Section.id == sect_id).first()
        if not section:
            continue
        
        sect_students = set(r.student_id for r in section_records)
        sect_present = sum(1 for r in section_records if r.status == "present")
        sect_absent = sum(1 for r in section_records if r.status == "absent")
        sect_late = sum(1 for r in section_records if r.status == "late")
        sect_excused = sum(1 for r in section_records if r.status == "excused")
        sect_total = len(section_records)
        sect_present_pct = (sect_present / sect_total * 100) if sect_total > 0 else 0.0
        
        section_stats.append({
            "section_id": sect_id,
            "section_name": section.name,
            "total_students": len(sect_students),
            "total_records": sect_total,
            "present": sect_present,
            "absent": sect_absent,
            "late": sect_late,
            "excused": sect_excused,
            "present_percentage": round(sect_present_pct, 2)
        })
    
    # Period-wise statistics
    period_stats = []
    for period_num in sorted(period_numbers):
        period_records = [r for r in records if r.period_number == period_num]
        if not period_records:
            continue
        
        period_present = sum(1 for r in period_records if r.status == "present")
        period_absent = sum(1 for r in period_records if r.status == "absent")
        period_late = sum(1 for r in period_records if r.status == "late")
        period_excused = sum(1 for r in period_records if r.status == "excused")
        period_total = len(period_records)
        period_present_pct = (period_present / period_total * 100) if period_total > 0 else 0.0
        
        period_stats.append({
            "period_number": period_num,
            "total_records": period_total,
            "present": period_present,
            "absent": period_absent,
            "late": period_late,
            "excused": period_excused,
            "present_percentage": round(period_present_pct, 2)
        })
    
    # Transform data to match frontend expectations
    # Convert subject_stats array to by_subject object
    by_subject = {}
    for stat in subject_stats:
        subject_key = stat.get("subject_name") or stat.get("subject_code") or f"Subject_{stat['subject_id']}"
        by_subject[subject_key] = {
            "total": stat["total_records"],
            "present": stat["present"],
            "absent": stat["absent"],
            "late": stat["late"]
        }
    
    # Convert daily_stats array to by_date object
    by_date = {}
    for stat in daily_stats:
        date_key = stat["date"]
        by_date[date_key] = {
            "total": stat["total_records"],
            "present": stat["present"],
            "absent": stat["absent"],
            "late": stat["late"]
        }
    
    # Transform student_stats to match frontend format
    by_student = []
    for stat in student_stats:
        by_student.append({
            "student_id": stat["student_id"],
            "student_name": stat["student_name"],
            "roll_number": stat["roll_number"],
            "total": stat["total_classes"],
            "present": stat["present"],
            "absent": stat["absent"],
            "late": stat["late"],
            "percentage": round(stat["present_percentage"], 2)
        })
    
    return {
        "summary": {
            "total_records": total_records,
            "present_count": present_count,
            "absent_count": absent_count,
            "late_count": late_count,
            "attendance_percentage": round(present_percentage, 2)
        },
        "by_subject": by_subject,
        "by_date": by_date,
        "by_student": by_student,
        # Keep original structure for backward compatibility
        "total_students": len(student_ids),
        "total_classes": len(dates),
        "overall_stats": {
            "present": present_count,
            "absent": absent_count,
            "late": late_count,
            "excused": excused_count,
            "present_percentage": round(present_percentage, 2)
        },
        "subject_wise_stats": subject_stats,
        "student_wise_stats": student_stats,
        "daily_stats": daily_stats,
        "section_wise_stats": section_stats,
        "period_wise_stats": period_stats
    }
