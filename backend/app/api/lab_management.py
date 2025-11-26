"""Lab Management API - Integrated College Management System
Handles lab-subject-department-faculty linkage and attendance
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from typing import List, Optional
from datetime import date, datetime

from app.core.database import get_db
from app.api.auth import (
    get_current_user, get_current_admin, get_current_faculty,
    get_current_hod, get_current_hod_or_faculty
)
from app.models.user import User, UserRole, RoleEnum
from app.models.coding_lab import CodingLab, LabFacultyAssignment
from app.models.lab_attendance import LabAttendance
from app.models.academic import Department, Subject, Section, Semester
from app.models.profile import Profile
from app.schemas.lab_attendance import (
    LabAttendanceCreate, LabAttendanceBulkCreate,
    LabAttendanceResponse, LabAttendanceSummary
)

router = APIRouter(prefix="/lab-management", tags=["Lab Management"])


# ==================== Faculty Assignment ====================

@router.post("/labs/{lab_id}/assign-faculty", status_code=status.HTTP_201_CREATED)
async def assign_faculty_to_lab(
    lab_id: int,
    faculty_id: int,
    current_user: User = Depends(get_current_admin),  # Admin only
    db: Session = Depends(get_db)
):
    """Assign faculty to a lab (Admin only)"""
    # Verify lab exists
    lab = db.query(CodingLab).filter(CodingLab.id == lab_id).first()
    if not lab:
        raise HTTPException(status_code=404, detail="Lab not found")
    
    # Verify faculty exists and is actually faculty
    faculty = db.query(User).filter(User.id == faculty_id).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")
    
    faculty_roles = db.query(UserRole).filter(
        UserRole.user_id == faculty_id,
        UserRole.role == RoleEnum.FACULTY
    ).first()
    if not faculty_roles:
        raise HTTPException(status_code=400, detail="User is not a faculty member")
    
    # Check if assignment already exists
    existing = db.query(LabFacultyAssignment).filter(
        LabFacultyAssignment.lab_id == lab_id,
        LabFacultyAssignment.faculty_id == faculty_id,
        LabFacultyAssignment.is_active == True
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Faculty already assigned to this lab")
    
    # Create assignment
    assignment = LabFacultyAssignment(
        lab_id=lab_id,
        faculty_id=faculty_id,
        assigned_by=current_user.id,
        is_active=True
    )
    
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    
    return {
        "message": "Faculty assigned successfully",
        "assignment_id": assignment.id,
        "lab_id": lab_id,
        "faculty_id": faculty_id
    }


@router.delete("/labs/{lab_id}/assign-faculty/{faculty_id}", status_code=status.HTTP_200_OK)
async def remove_faculty_from_lab(
    lab_id: int,
    faculty_id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Remove faculty assignment from a lab (Admin only)"""
    assignment = db.query(LabFacultyAssignment).filter(
        LabFacultyAssignment.lab_id == lab_id,
        LabFacultyAssignment.faculty_id == faculty_id,
        LabFacultyAssignment.is_active == True
    ).first()
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    assignment.is_active = False
    db.commit()
    
    return {"message": "Faculty assignment removed successfully"}


@router.get("/faculty/{faculty_id}/labs", response_model=List[dict])
async def get_faculty_labs(
    faculty_id: int,
    current_user: User = Depends(get_current_faculty),
    db: Session = Depends(get_db)
):
    """Get all labs assigned to a faculty member"""
    # Verify faculty can only see their own labs unless admin
    user_roles = [role.role for role in current_user.roles]
    if RoleEnum.ADMIN not in user_roles and RoleEnum.SUPER_ADMIN not in user_roles:
        if current_user.id != faculty_id:
            raise HTTPException(status_code=403, detail="You can only view your own labs")
    
    assignments = db.query(LabFacultyAssignment).filter(
        LabFacultyAssignment.faculty_id == faculty_id,
        LabFacultyAssignment.is_active == True
    ).all()
    
    labs = []
    for assignment in assignments:
        lab = db.query(CodingLab).filter(CodingLab.id == assignment.lab_id).first()
        if lab:
            lab_data = {
                "id": lab.id,
                "title": lab.title,
                "description": lab.description,
                "subject_id": lab.subject_id,
                "department_id": lab.department_id,
                "section_id": lab.section_id,
                "semester_id": lab.semester_id,
                "year": lab.year,
                "is_published": lab.is_published,
                "is_active": lab.is_active,
                "created_at": lab.created_at.isoformat() if lab.created_at else None,
            }
            # Include subject details if linked
            if lab.subject_id:
                subject = db.query(Subject).filter(Subject.id == lab.subject_id).first()
                if subject:
                    lab_data["subject"] = {
                        "id": subject.id,
                        "name": subject.name,
                        "code": subject.code
                    }
            # Include department details if linked
            if lab.department_id:
                dept = db.query(Department).filter(Department.id == lab.department_id).first()
                if dept:
                    lab_data["department"] = {
                        "id": dept.id,
                        "name": dept.name,
                        "code": dept.code
                    }
            labs.append(lab_data)
    
    return labs


# ==================== Student Filtering ====================

@router.get("/labs/{lab_id}/students", response_model=List[dict])
async def get_lab_students(
    lab_id: int,
    current_user: User = Depends(get_current_faculty),
    db: Session = Depends(get_db)
):
    """Get students for a lab, filtered by lab's department/year/subject/section"""
    # Verify lab exists
    lab = db.query(CodingLab).filter(CodingLab.id == lab_id).first()
    if not lab:
        raise HTTPException(status_code=404, detail="Lab not found")
    
    # Verify faculty is assigned to this lab
    user_roles = [role.role for role in current_user.roles]
    if RoleEnum.ADMIN not in user_roles and RoleEnum.SUPER_ADMIN not in user_roles:
        assignment = db.query(LabFacultyAssignment).filter(
            LabFacultyAssignment.lab_id == lab_id,
            LabFacultyAssignment.faculty_id == current_user.id,
            LabFacultyAssignment.is_active == True
        ).first()
        if not assignment:
            raise HTTPException(status_code=403, detail="You are not assigned to this lab")
    
    # Build query for students
    query = db.query(User, Profile).join(Profile, User.id == Profile.user_id)
    
    # Filter by student role
    student_role_ids = db.query(UserRole.user_id).filter(
        UserRole.role == RoleEnum.STUDENT
    ).subquery()
    query = query.filter(User.id.in_(student_role_ids))
    
    # Filter by department if lab has department_id
    if lab.department_id:
        query = query.filter(Profile.department == str(lab.department_id))
        # Also try matching by department name if department_id is stored as string
        dept = db.query(Department).filter(Department.id == lab.department_id).first()
        if dept:
            query = query.filter(
                or_(
                    Profile.department == str(lab.department_id),
                    Profile.department == dept.name,
                    Profile.department == dept.code
                )
            )
    
    # Filter by section if lab has section_id
    if lab.section_id:
        section = db.query(Section).filter(Section.id == lab.section_id).first()
        if section:
            query = query.filter(
                or_(
                    Profile.section == str(lab.section_id),
                    Profile.section == section.name
                )
            )
    elif lab.section:
        query = query.filter(Profile.section == lab.section)
    
    # Filter by year if lab has year
    if lab.year:
        query = query.filter(Profile.present_year == lab.year)
    
    # Filter by college if lab has college_id
    if lab.college_id:
        query = query.filter(Profile.college_id == lab.college_id)
    
    students = query.all()
    
    result = []
    for user, profile in students:
        result.append({
            "id": user.id,
            "email": user.email,
            "full_name": profile.full_name if profile else None,
            "roll_number": profile.roll_number if profile else None,
            "department": profile.department if profile else None,
            "section": profile.section if profile else None,
            "present_year": profile.present_year if profile else None,
        })
    
    return result


# ==================== Lab Attendance ====================

@router.post("/labs/{lab_id}/attendance", response_model=List[LabAttendanceResponse], status_code=status.HTTP_201_CREATED)
async def mark_lab_attendance(
    lab_id: int,
    attendance_data: LabAttendanceBulkCreate,
    current_user: User = Depends(get_current_faculty),
    db: Session = Depends(get_db)
):
    """Mark attendance for a lab session (Faculty only)"""
    # Verify lab exists
    lab = db.query(CodingLab).filter(CodingLab.id == lab_id).first()
    if not lab:
        raise HTTPException(status_code=404, detail="Lab not found")
    
    # Verify faculty is assigned to this lab
    user_roles = [role.role for role in current_user.roles]
    if RoleEnum.ADMIN not in user_roles and RoleEnum.SUPER_ADMIN not in user_roles:
        assignment = db.query(LabFacultyAssignment).filter(
            LabFacultyAssignment.lab_id == lab_id,
            LabFacultyAssignment.faculty_id == current_user.id,
            LabFacultyAssignment.is_active == True
        ).first()
        if not assignment:
            raise HTTPException(status_code=403, detail="You are not assigned to this lab")
    
    # Verify lab_id matches
    if attendance_data.lab_id != lab_id:
        raise HTTPException(status_code=400, detail="Lab ID mismatch")
    
    # Create attendance records
    created_records = []
    for record in attendance_data.attendance_records:
        student_id = record.get("student_id")
        status_val = record.get("status", "present")
        notes = record.get("notes")
        
        if not student_id:
            continue
        
        # Check if attendance already exists for this date
        existing = db.query(LabAttendance).filter(
            LabAttendance.lab_id == lab_id,
            LabAttendance.student_id == student_id,
            LabAttendance.date == attendance_data.date
        ).first()
        
        if existing:
            # Update existing record
            existing.status = status_val
            existing.notes = notes
            existing.session_number = attendance_data.session_number
            existing.updated_at = datetime.utcnow()
            created_records.append(existing)
        else:
            # Create new record
            attendance = LabAttendance(
                lab_id=lab_id,
                faculty_id=current_user.id,
                student_id=student_id,
                date=attendance_data.date,
                status=status_val,
                notes=notes,
                session_number=attendance_data.session_number
            )
            db.add(attendance)
            created_records.append(attendance)
    
    db.commit()
    
    # Refresh all records
    for record in created_records:
        db.refresh(record)
    
    return created_records


@router.get("/labs/{lab_id}/attendance-history", response_model=List[LabAttendanceResponse])
async def get_lab_attendance_history(
    lab_id: int,
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    current_user: User = Depends(get_current_faculty),
    db: Session = Depends(get_db)
):
    """Get attendance history for a lab"""
    # Verify lab exists
    lab = db.query(CodingLab).filter(CodingLab.id == lab_id).first()
    if not lab:
        raise HTTPException(status_code=404, detail="Lab not found")
    
    # Verify faculty is assigned to this lab
    user_roles = [role.role for role in current_user.roles]
    if RoleEnum.ADMIN not in user_roles and RoleEnum.SUPER_ADMIN not in user_roles:
        assignment = db.query(LabFacultyAssignment).filter(
            LabFacultyAssignment.lab_id == lab_id,
            LabFacultyAssignment.faculty_id == current_user.id,
            LabFacultyAssignment.is_active == True
        ).first()
        if not assignment:
            raise HTTPException(status_code=403, detail="You are not assigned to this lab")
    
    query = db.query(LabAttendance).filter(LabAttendance.lab_id == lab_id)
    
    if start_date:
        query = query.filter(LabAttendance.date >= start_date)
    if end_date:
        query = query.filter(LabAttendance.date <= end_date)
    
    attendance_records = query.order_by(LabAttendance.date.desc()).all()
    
    return attendance_records


@router.get("/labs/{lab_id}/attendance-summary/{attendance_date}", response_model=LabAttendanceSummary)
async def get_lab_attendance_summary(
    lab_id: int,
    attendance_date: date,
    current_user: User = Depends(get_current_faculty),
    db: Session = Depends(get_db)
):
    """Get attendance summary for a specific date"""
    # Verify lab exists
    lab = db.query(CodingLab).filter(CodingLab.id == lab_id).first()
    if not lab:
        raise HTTPException(status_code=404, detail="Lab not found")
    
    # Get all students for this lab
    students = await get_lab_students(lab_id, current_user, db)
    total_students = len(students)
    
    # Get attendance records for this date
    attendance_records = db.query(LabAttendance).filter(
        LabAttendance.lab_id == lab_id,
        LabAttendance.date == attendance_date
    ).all()
    
    present_count = sum(1 for r in attendance_records if r.status == "present")
    absent_count = sum(1 for r in attendance_records if r.status == "absent")
    late_count = sum(1 for r in attendance_records if r.status == "late")
    excused_count = sum(1 for r in attendance_records if r.status == "excused")
    
    attendance_percentage = (present_count / total_students * 100) if total_students > 0 else 0
    
    return LabAttendanceSummary(
        lab_id=lab_id,
        total_students=total_students,
        present_count=present_count,
        absent_count=absent_count,
        late_count=late_count,
        excused_count=excused_count,
        attendance_percentage=round(attendance_percentage, 2),
        date=attendance_date
    )

