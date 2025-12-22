"""Academic Year Migration API endpoints"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from typing import List, Optional
from datetime import datetime
from app.core.database import get_db
from app.models.user import User, UserRole, RoleEnum
from app.models.profile import Profile
from app.models.academic import (
    AcademicYear,
    AcademicYearMigration,
    Subject,
    Section,
    SubjectAssignment,
    FacultySectionAssignment,
    ArchivedSubjectAssignment,
    ArchivedFacultySectionAssignment,
    Semester,
    Department
)
from app.api.auth import get_current_user
from app.api.users import get_current_super_admin
from app.schemas.academic import (
    AcademicYearMigrationCreate,
    AcademicYearMigrationResponse,
    PromoteStudentsRequest,
    ArchiveOldYearRequest,
    MigrationPreviewResponse,
    PromotionRule
)
from app.api.promotion import get_next_year

router = APIRouter(prefix="/academic/migrations", tags=["academic-migrations"])


@router.post("/preview", response_model=MigrationPreviewResponse)
async def preview_migration(
    from_academic_year_id: int = Query(...),
    to_academic_year_id: int = Query(...),
    college_id: int = Query(...),
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """Preview migration impact before executing"""
    
    # Verify academic years exist
    from_year = db.query(AcademicYear).filter(AcademicYear.id == from_academic_year_id).first()
    to_year = db.query(AcademicYear).filter(AcademicYear.id == to_academic_year_id).first()
    
    if not from_year or not to_year:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Academic year not found"
        )
    
    # Count students to promote
    student_profiles = db.query(Profile).join(User).join(UserRole).filter(
        UserRole.role == RoleEnum.STUDENT,
        Profile.college_id == college_id
    ).all()
    
    promotion_breakdown = []
    students_to_promote = 0
    
    for profile in student_profiles:
        if profile.present_year:
            next_year = get_next_year(profile.present_year)
            if profile.present_year != next_year:
                students_to_promote += 1
                promotion_breakdown.append({
                    "from_year": profile.present_year,
                    "to_year": next_year,
                    "count": 1
                })
    
    # Aggregate promotion breakdown
    from collections import Counter
    promotion_counts = Counter((p["from_year"], p["to_year"]) for p in promotion_breakdown)
    promotion_breakdown = [
        {"from_year": fy, "to_year": ty, "count": count}
        for (fy, ty), count in promotion_counts.items()
    ]
    
    # Count sections to archive (from old academic year)
    sections_to_archive = db.query(Section).join(Semester).filter(
        Section.college_id == college_id,
        Section.is_active == True,
        Semester.academic_year_id == from_academic_year_id
    ).count()
    
    # Count subjects to archive (linked to old academic year semesters)
    subjects_to_archive = db.query(Subject).join(Semester).filter(
        Subject.college_id == college_id,
        Subject.is_active == True,
        Semester.academic_year_id == from_academic_year_id
    ).count()
    
    # Count assignments to clear
    assignments_to_clear = db.query(SubjectAssignment).join(Subject).join(Semester).filter(
        Subject.college_id == college_id,
        SubjectAssignment.is_active == True,
        Semester.academic_year_id == from_academic_year_id
    ).count()
    
    sections_breakdown = db.query(
        Section.name,
        Department.code,
        func.count(Section.id).label('count')
    ).join(Department).join(Semester).filter(
        Section.college_id == college_id,
        Section.is_active == True,
        Semester.academic_year_id == from_academic_year_id
    ).group_by(Section.name, Department.code).all()
    
    return MigrationPreviewResponse(
        students_to_promote=students_to_promote,
        sections_to_archive=sections_to_archive,
        subjects_to_archive=subjects_to_archive,
        assignments_to_clear=assignments_to_clear,
        promotion_breakdown=promotion_breakdown,
        sections_breakdown=[
            {"section": s[0], "department": s[1], "count": s[2]}
            for s in sections_breakdown
        ]
    )


@router.post("/promote-students", response_model=dict)
async def promote_students(
    request: PromoteStudentsRequest,
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """Promote students based on promotion rules"""
    
    # Verify academic year exists
    academic_year = db.query(AcademicYear).filter(
        AcademicYear.id == request.academic_year_id
    ).first()
    if not academic_year:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Academic year {request.academic_year_id} not found"
        )
    
    # Get student profiles
    query = db.query(Profile).join(User).join(UserRole).filter(
        UserRole.role == RoleEnum.STUDENT
    )
    
    if request.college_id:
        query = query.filter(Profile.college_id == request.college_id)
    
    profiles = query.all()
    
    if not profiles:
        return {
            "message": "No students found to promote",
            "promoted_count": 0,
            "details": []
        }
    
    promoted = []
    promotion_map = {rule.from_year: rule.to_year for rule in request.promotion_rules}
    
    for profile in profiles:
        if profile.present_year and profile.present_year in promotion_map:
            old_year = profile.present_year
            new_year = promotion_map[old_year]
            
            if old_year != new_year:
                profile.present_year = new_year
                promoted.append({
                    "user_id": profile.user_id,
                    "email": profile.email,
                    "name": profile.full_name,
                    "old_year": old_year,
                    "new_year": new_year
                })
    
    if promoted:
        db.commit()
    
    return {
        "message": f"Promoted {len(promoted)} students",
        "promoted_count": len(promoted),
        "details": promoted
    }


@router.post("/archive-old-year", response_model=AcademicYearMigrationResponse)
async def archive_old_academic_year(
    request: ArchiveOldYearRequest,
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """Archive old academic year data for a specific college"""
    
    # Verify academic years exist
    from_year = db.query(AcademicYear).filter(
        AcademicYear.id == request.from_academic_year_id
    ).first()
    to_year = db.query(AcademicYear).filter(
        AcademicYear.id == request.to_academic_year_id
    ).first()
    
    if not from_year or not to_year:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Academic year not found"
        )
    
    # Create migration record
    migration = AcademicYearMigration(
        from_academic_year_id=request.from_academic_year_id,
        to_academic_year_id=request.to_academic_year_id,
        college_id=request.college_id,
        migration_type="year_transition",
        status="in_progress",
        initiated_by=current_user.id,
        started_at=datetime.utcnow()
    )
    db.add(migration)
    db.flush()
    
    try:
        sections_archived = 0
        subjects_archived = 0
        assignments_cleared = 0
        
        # Archive sections
        if request.archive_sections:
            sections = db.query(Section).join(Semester).filter(
                Section.college_id == request.college_id,
                Section.is_active == True,
                Semester.academic_year_id == request.from_academic_year_id
            ).all()
            
            for section in sections:
                section.is_active = False
                sections_archived += 1
        
        # Archive subjects
        if request.archive_subjects:
            subjects = db.query(Subject).join(Semester).filter(
                Subject.college_id == request.college_id,
                Subject.is_active == True,
                Semester.academic_year_id == request.from_academic_year_id
            ).all()
            
            for subject in subjects:
                subject.is_active = False
                subjects_archived += 1
        
        # Archive assignments
        if request.archive_assignments:
            # Archive subject assignments
            subject_assignments = db.query(SubjectAssignment).join(Subject).join(Semester).filter(
                Subject.college_id == request.college_id,
                SubjectAssignment.is_active == True,
                Semester.academic_year_id == request.from_academic_year_id
            ).all()
            
            for assignment in subject_assignments:
                # Create archived record
                archived = ArchivedSubjectAssignment(
                    original_id=assignment.id,
                    faculty_id=assignment.faculty_id,
                    subject_id=assignment.subject_id,
                    semester_id=assignment.semester_id,
                    section=assignment.section,
                    section_id=assignment.section_id,
                    assigned_by=assignment.assigned_by,
                    academic_year_id=request.from_academic_year_id,
                    migration_id=migration.id
                )
                db.add(archived)
                
                # Delete active assignment
                db.delete(assignment)
                assignments_cleared += 1
            
            # Archive faculty-section assignments
            faculty_section_assignments = db.query(FacultySectionAssignment).join(Section).join(Semester).filter(
                Section.college_id == request.college_id,
                FacultySectionAssignment.is_active == True,
                Semester.academic_year_id == request.from_academic_year_id
            ).all()
            
            for assignment in faculty_section_assignments:
                # Create archived record
                archived = ArchivedFacultySectionAssignment(
                    original_id=assignment.id,
                    faculty_id=assignment.faculty_id,
                    section_id=assignment.section_id,
                    assigned_by=assignment.assigned_by,
                    academic_year_id=request.from_academic_year_id,
                    migration_id=migration.id
                )
                db.add(archived)
                
                # Delete active assignment
                db.delete(assignment)
                assignments_cleared += 1
        
        # Update migration record
        migration.status = "completed"
        migration.completed_at = datetime.utcnow()
        migration.sections_archived = sections_archived
        migration.subjects_archived = subjects_archived
        migration.assignments_cleared = assignments_cleared
        
        db.commit()
        db.refresh(migration)
        
        return migration
        
    except Exception as e:
        migration.status = "failed"
        migration.notes = str(e)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Migration failed: {str(e)}"
        )


@router.get("/", response_model=List[AcademicYearMigrationResponse])
async def list_migrations(
    college_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None),
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """List all academic year migrations"""
    
    query = db.query(AcademicYearMigration)
    
    if college_id:
        query = query.filter(AcademicYearMigration.college_id == college_id)
    
    if status_filter:
        query = query.filter(AcademicYearMigration.status == status_filter)
    
    migrations = query.order_by(AcademicYearMigration.created_at.desc()).all()
    
    return migrations


@router.get("/{migration_id}", response_model=AcademicYearMigrationResponse)
async def get_migration(
    migration_id: int,
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """Get migration details"""
    
    migration = db.query(AcademicYearMigration).filter(
        AcademicYearMigration.id == migration_id
    ).first()
    
    if not migration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Migration not found"
        )
    
    return migration

