"""Hall Ticket API endpoints"""
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.hall_ticket import HallTicket
from app.models.user import User, UserRole, RoleEnum
from app.models.profile import Profile
from app.schemas.hall_ticket import (
    HallTicketCreate, HallTicketBulkCreate, HallTicketResponse
)
from app.api.auth import get_current_user, get_current_admin_or_faculty
from datetime import datetime
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
import io
import os
from pathlib import Path

router = APIRouter(prefix="/hall-tickets", tags=["hall-tickets"])

# PDF storage directory
PDF_DIR = Path("uploads/hall-tickets")
PDF_DIR.mkdir(parents=True, exist_ok=True)


def generate_hall_ticket_pdf(hall_ticket: HallTicket, user_profile: Profile) -> bytes:
    """Generate PDF for hall ticket"""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
    
    # Container for the 'Flowable' objects
    elements = []
    
    # Define styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=20,
        textColor=colors.HexColor('#1a1a1a'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#333333'),
        spaceAfter=12,
        alignment=TA_LEFT
    )
    
    normal_style = styles['Normal']
    
    # Title
    elements.append(Paragraph("HALL TICKET", title_style))
    elements.append(Spacer(1, 0.3*inch))
    
    # Student Information
    elements.append(Paragraph("<b>STUDENT INFORMATION</b>", heading_style))
    
    student_data = [
        ["Name:", user_profile.full_name or "N/A"],
        ["Roll Number:", user_profile.roll_number or "N/A"],
        ["Email:", user_profile.email or "N/A"],
        ["Department:", user_profile.department or "N/A"],
        ["Section:", user_profile.section or "N/A"],
        ["Year:", user_profile.present_year or "N/A"],
    ]
    
    student_table = Table(student_data, colWidths=[2*inch, 4*inch])
    student_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f0f0f0')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
    ]))
    elements.append(student_table)
    elements.append(Spacer(1, 0.3*inch))
    
    # Exam Information
    elements.append(Paragraph("<b>EXAM INFORMATION</b>", heading_style))
    
    exam_date_str = hall_ticket.exam_date.strftime("%B %d, %Y") if hall_ticket.exam_date else "N/A"
    exam_time_str = hall_ticket.exam_time or "N/A"
    
    exam_data = [
        ["Exam Title:", hall_ticket.exam_title],
        ["Exam Type:", hall_ticket.exam_type.upper()],
        ["Date:", exam_date_str],
        ["Time:", exam_time_str],
        ["Duration:", f"{hall_ticket.duration_minutes} minutes" if hall_ticket.duration_minutes else "N/A"],
    ]
    
    exam_table = Table(exam_data, colWidths=[2*inch, 4*inch])
    exam_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f0f0f0')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
    ]))
    elements.append(exam_table)
    elements.append(Spacer(1, 0.3*inch))
    
    # Venue Information
    if hall_ticket.venue:
        elements.append(Paragraph("<b>VENUE INFORMATION</b>", heading_style))
        
        venue_data = [
            ["Venue:", hall_ticket.venue],
            ["Room Number:", hall_ticket.room_number or "N/A"],
            ["Seat Number:", hall_ticket.seat_number or "N/A"],
        ]
        
        if hall_ticket.address:
            venue_data.append(["Address:", hall_ticket.address])
        
        venue_table = Table(venue_data, colWidths=[2*inch, 4*inch])
        venue_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f0f0f0')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ]))
        elements.append(venue_table)
        elements.append(Spacer(1, 0.3*inch))
    
    # Instructions
    if hall_ticket.instructions:
        elements.append(Paragraph("<b>INSTRUCTIONS</b>", heading_style))
        for instruction in hall_ticket.instructions:
            elements.append(Paragraph(f"• {instruction}", normal_style))
        elements.append(Spacer(1, 0.3*inch))
    
    # Footer
    elements.append(Spacer(1, 0.5*inch))
    elements.append(Paragraph("Please bring this hall ticket and a valid ID to the exam venue.", 
                              ParagraphStyle('Footer', parent=normal_style, alignment=TA_CENTER, fontSize=9)))
    elements.append(Spacer(1, 0.2*inch))
    elements.append(Paragraph(f"Generated on: {datetime.utcnow().strftime('%B %d, %Y at %I:%M %p')}", 
                              ParagraphStyle('Footer', parent=normal_style, alignment=TA_CENTER, fontSize=8, textColor=colors.grey)))
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()


@router.post("/generate", response_model=HallTicketResponse, status_code=status.HTTP_201_CREATED)
async def generate_hall_ticket(
    ticket_data: HallTicketCreate,
    current_user: User = Depends(get_current_admin_or_faculty),
    db: Session = Depends(get_db)
):
    """Generate a hall ticket (Admin/Faculty only)"""
    # Get user's college
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    
    college_id = None
    if RoleEnum.ADMIN in role_names:
        admin_role = db.query(UserRole).filter(
            UserRole.user_id == current_user.id,
            UserRole.role == RoleEnum.ADMIN
        ).first()
        college_id = admin_role.college_id if admin_role else None
    elif RoleEnum.FACULTY in role_names:
        profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        college_id = profile.college_id if profile else None
    
    # Verify student exists and is in same college
    student_profile = db.query(Profile).filter(Profile.user_id == ticket_data.user_id).first()
    if not student_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
    
    if college_id and student_profile.college_id != college_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Student must be from the same college"
        )
    
    # Create hall ticket
    new_ticket = HallTicket(
        **ticket_data.model_dump(),
        college_id=college_id or student_profile.college_id,
        is_generated=False
    )
    
    db.add(new_ticket)
    db.commit()
    db.refresh(new_ticket)
    
    # Generate PDF
    try:
        pdf_bytes = generate_hall_ticket_pdf(new_ticket, student_profile)
        
        # Save PDF
        pdf_filename = f"hall_ticket_{new_ticket.id}_{ticket_data.user_id}.pdf"
        pdf_path = PDF_DIR / pdf_filename
        
        with open(pdf_path, 'wb') as f:
            f.write(pdf_bytes)
        
        # Update hall ticket with PDF URL
        new_ticket.pdf_url = f"/uploads/hall-tickets/{pdf_filename}"
        new_ticket.is_generated = True
        new_ticket.generated_at = datetime.utcnow()
        new_ticket.generated_by = current_user.id
        
        db.commit()
        db.refresh(new_ticket)
    except Exception as e:
        # If PDF generation fails, still return the ticket (without PDF)
        print(f"Error generating PDF: {str(e)}")
    
    return new_ticket


@router.post("/generate/bulk", response_model=dict)
async def generate_bulk_hall_tickets(
    ticket_data: HallTicketBulkCreate,
    current_user: User = Depends(get_current_admin_or_faculty),
    db: Session = Depends(get_db)
):
    """Generate hall tickets for multiple students (Admin/Faculty only)"""
    # Get user's college
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    
    college_id = None
    if RoleEnum.ADMIN in role_names:
        admin_role = db.query(UserRole).filter(
            UserRole.user_id == current_user.id,
            UserRole.role == RoleEnum.ADMIN
        ).first()
        college_id = admin_role.college_id if admin_role else None
    elif RoleEnum.FACULTY in role_names:
        profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        college_id = profile.college_id if profile else None
    
    # Get student profiles
    profiles = db.query(Profile).filter(Profile.user_id.in_(ticket_data.user_ids)).all()
    
    if len(profiles) != len(ticket_data.user_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Some students not found"
        )
    
    # Verify all students are in same college
    if college_id:
        for profile in profiles:
            if profile.college_id != college_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="All students must be from the same college"
                )
    
    generated = []
    failed = []
    
    for profile in profiles:
        try:
            # Create hall ticket
            new_ticket = HallTicket(
                exam_id=ticket_data.exam_id,
                exam_type=ticket_data.exam_type,
                exam_title=ticket_data.exam_title,
                user_id=profile.user_id,
                exam_date=ticket_data.exam_date,
                exam_time=ticket_data.exam_time,
                duration_minutes=ticket_data.duration_minutes,
                venue=ticket_data.venue,
                room_number=None,  # Can be assigned later
                seat_number=None,  # Can be assigned later
                address=None,
                instructions=ticket_data.instructions,
                college_id=college_id or profile.college_id,
                is_generated=False
            )
            
            db.add(new_ticket)
            db.flush()  # Get ID without committing
            
            # Generate PDF
            pdf_bytes = generate_hall_ticket_pdf(new_ticket, profile)
            
            # Save PDF
            pdf_filename = f"hall_ticket_{new_ticket.id}_{profile.user_id}.pdf"
            pdf_path = PDF_DIR / pdf_filename
            
            with open(pdf_path, 'wb') as f:
                f.write(pdf_bytes)
            
            # Update ticket
            new_ticket.pdf_url = f"/uploads/hall-tickets/{pdf_filename}"
            new_ticket.is_generated = True
            new_ticket.generated_at = datetime.utcnow()
            new_ticket.generated_by = current_user.id
            
            generated.append({
                "user_id": profile.user_id,
                "ticket_id": new_ticket.id,
                "name": profile.full_name
            })
        except Exception as e:
            failed.append({
                "user_id": profile.user_id,
                "name": profile.full_name,
                "error": str(e)
            })
    
    db.commit()
    
    return {
        "message": f"Generated {len(generated)} hall tickets",
        "generated": len(generated),
        "failed": len(failed),
        "details": generated,
        "errors": failed
    }


@router.get("/my", response_model=List[HallTicketResponse])
async def get_my_hall_tickets(
    exam_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's hall tickets"""
    query = db.query(HallTicket).filter(HallTicket.user_id == current_user.id)
    
    if exam_type:
        query = query.filter(HallTicket.exam_type == exam_type)
    
    tickets = query.order_by(HallTicket.exam_date.desc()).all()
    return tickets


@router.get("/{ticket_id}", response_model=HallTicketResponse)
async def get_hall_ticket(
    ticket_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific hall ticket"""
    ticket = db.query(HallTicket).filter(HallTicket.id == ticket_id).first()
    
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hall ticket not found"
        )
    
    # Verify user has access
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_names = [role.role for role in user_roles]
    is_admin = RoleEnum.ADMIN in role_names or RoleEnum.SUPER_ADMIN in role_names
    
    if ticket.user_id != current_user.id and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view this hall ticket"
        )
    
    return ticket


@router.get("/{ticket_id}/download")
async def download_hall_ticket(
    ticket_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download hall ticket PDF"""
    ticket = db.query(HallTicket).filter(HallTicket.id == ticket_id).first()
    
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hall ticket not found"
        )
    
    # Verify user has access
    if ticket.user_id != current_user.id:
        user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
        role_names = [role.role for role in user_roles]
        is_admin = RoleEnum.ADMIN in role_names or RoleEnum.SUPER_ADMIN in role_names
        
        if not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to download this hall ticket"
            )
    
    if not ticket.pdf_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PDF not generated yet"
        )
    
    # Read PDF file
    pdf_path = Path(ticket.pdf_url.lstrip('/'))
    if not pdf_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PDF file not found"
        )
    
    with open(pdf_path, 'rb') as f:
        pdf_content = f.read()
    
    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="hall_ticket_{ticket_id}.pdf"'
        }
    )

