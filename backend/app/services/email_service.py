"""Email service for sending HTML emails using SMTP"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional
from app.config import get_settings
import logging

logger = logging.getLogger(__name__)

def send_email(
    to_emails: List[str],
    subject: str,
    html_body: str,
    text_body: Optional[str] = None
) -> bool:
    """
    Send HTML email using SMTP
    
    Args:
        to_emails: List of recipient email addresses
        subject: Email subject
        html_body: HTML email body
        text_body: Optional plain text fallback
    
    Returns:
        True if email sent successfully, False otherwise
    """
    settings = get_settings()
    
    # Check if SMTP is configured
    if not settings.SMTP_HOST or not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning("SMTP not configured. Skipping email send.")
        logger.info(f"Would send email to {to_emails} with subject: {subject}")
        return False
    
    try:
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = settings.SMTP_USER
        msg['To'] = ', '.join(to_emails)
        
        # Create text and HTML parts
        if text_body:
            text_part = MIMEText(text_body, 'plain')
            msg.attach(text_part)
        
        html_part = MIMEText(html_body, 'html')
        msg.attach(html_part)
        
        # Connect to SMTP server and send
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()  # Enable encryption
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
        
        logger.info(f"Email sent successfully to {to_emails}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send email to {to_emails}: {str(e)}")
        return False


def generate_interview_invitation_email(
    student_name: str,
    interviewer_name: str,
    interview_title: str,
    interview_type: str,
    scheduled_date: str,
    scheduled_time: str,
    duration_minutes: int,
    meeting_link: Optional[str] = None,
    venue: Optional[str] = None,
    description: Optional[str] = None,
    is_student: bool = True
) -> str:
    """
    Generate HTML email for interview invitation
    
    Args:
        student_name: Name of the student
        interviewer_name: Name of the interviewer
        interview_title: Title of the interview
        interview_type: Type of interview (technical, hr, etc.)
        scheduled_date: Scheduled date (formatted)
        scheduled_time: Scheduled time (formatted)
        duration_minutes: Duration in minutes
        meeting_link: Optional meeting link (Zoom/Google Meet)
        venue: Optional venue for offline interviews
        description: Optional interview description
        is_student: True if email is for student, False if for interviewer
    
    Returns:
        HTML email body
    """
    recipient_role = "Student" if is_student else "Interviewer"
    recipient_name = student_name if is_student else interviewer_name
    other_party_name = interviewer_name if is_student else student_name
    
    type_display = interview_type.replace('_', ' ').title()
    if interview_type == 'group_discussion':
        type_display = 'Group Discussion'
    
    meeting_info = ""
    if meeting_link:
        meeting_info = f"""
        <div style="margin: 20px 0; padding: 15px; background-color: #e3f2fd; border-left: 4px solid #2196f3; border-radius: 4px;">
            <strong style="color: #1976d2;">Meeting Link:</strong><br>
            <a href="{meeting_link}" style="color: #1976d2; text-decoration: none; font-weight: bold; word-break: break-all;">{meeting_link}</a>
            <p style="margin: 10px 0 0 0; color: #555; font-size: 14px;">
                Please join the meeting 5 minutes before the scheduled time.
            </p>
        </div>
        """
    elif venue:
        meeting_info = f"""
        <div style="margin: 20px 0; padding: 15px; background-color: #fff3e0; border-left: 4px solid #ff9800; border-radius: 4px;">
            <strong style="color: #f57c00;">Venue:</strong><br>
            <span style="color: #555; font-size: 16px;">{venue}</span>
            <p style="margin: 10px 0 0 0; color: #555; font-size: 14px;">
                Please arrive 10 minutes before the scheduled time.
            </p>
        </div>
        """
    
    description_section = ""
    if description:
        description_section = f"""
        <div style="margin: 20px 0;">
            <h3 style="color: #333; margin-bottom: 10px;">Interview Details</h3>
            <p style="color: #666; line-height: 1.6;">{description}</p>
        </div>
        """
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f5f5f5;
            }}
            .container {{
                background-color: #ffffff;
                border-radius: 8px;
                padding: 30px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }}
            .header {{
                text-align: center;
                border-bottom: 3px solid #2196f3;
                padding-bottom: 20px;
                margin-bottom: 30px;
            }}
            .header h1 {{
                color: #2196f3;
                margin: 0;
                font-size: 28px;
            }}
            .content {{
                margin: 20px 0;
            }}
            .info-box {{
                background-color: #f9f9f9;
                border: 1px solid #e0e0e0;
                border-radius: 6px;
                padding: 20px;
                margin: 15px 0;
            }}
            .info-row {{
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px solid #e0e0e0;
            }}
            .info-row:last-child {{
                border-bottom: none;
            }}
            .info-label {{
                font-weight: 600;
                color: #555;
            }}
            .info-value {{
                color: #333;
                text-align: right;
            }}
            .cta-button {{
                display: inline-block;
                background-color: #2196f3;
                color: #ffffff;
                padding: 12px 30px;
                text-decoration: none;
                border-radius: 5px;
                font-weight: bold;
                margin: 20px 0;
            }}
            .footer {{
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e0e0e0;
                text-align: center;
                color: #888;
                font-size: 14px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎯 Mock Interview Invitation</h1>
            </div>
            
            <div class="content">
                <p>Dear <strong>{recipient_name}</strong>,</p>
                
                <p>You have been invited to participate in a mock interview session. Please find the details below:</p>
                
                <div class="info-box">
                    <div class="info-row">
                        <span class="info-label">Interview Type:</span>
                        <span class="info-value">{type_display}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Title:</span>
                        <span class="info-value">{interview_title}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">{'Interviewer' if is_student else 'Student'}:</span>
                        <span class="info-value">{other_party_name}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Date:</span>
                        <span class="info-value">{scheduled_date}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Time:</span>
                        <span class="info-value">{scheduled_time}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Duration:</span>
                        <span class="info-value">{duration_minutes} minutes</span>
                    </div>
                </div>
                
                {meeting_info}
                
                {description_section}
                
                <div style="margin: 30px 0; padding: 20px; background-color: #f5f5f5; border-radius: 6px;">
                    <h3 style="color: #333; margin-top: 0;">Preparation Tips:</h3>
                    <ul style="color: #666; line-height: 1.8;">
                        <li>Review the job description and requirements</li>
                        <li>Prepare questions about the role and company</li>
                        <li>Practice common interview questions</li>
                        <li>Ensure a quiet environment and stable internet connection</li>
                        <li>Have your resume and notes ready</li>
                    </ul>
                </div>
                
                {f'<p style="color: #666;">We look forward to your participation. Good luck!</p>' if is_student else '<p style="color: #666;">Thank you for conducting this mock interview. Your expertise will greatly help the student.</p>'}
            </div>
            
            <div class="footer">
                <p>This is an automated email from Elevate Edu Platform.</p>
                <p>Please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return html


def send_interview_invitations(
    student_emails: List[str],
    student_names: List[str],
    interviewer_email: Optional[str],
    interviewer_name: Optional[str],
    interview_title: str,
    interview_type: str,
    scheduled_datetime: str,
    duration_minutes: int,
    meeting_link: Optional[str] = None,
    venue: Optional[str] = None,
    description: Optional[str] = None
) -> dict:
    """
    Send interview invitation emails to students and interviewer
    
    Returns:
        Dictionary with send status for each recipient
    """
    from datetime import datetime
    
    # Parse scheduled datetime
    try:
        dt = datetime.fromisoformat(scheduled_datetime.replace('Z', '+00:00'))
        scheduled_date = dt.strftime('%B %d, %Y')
        scheduled_time = dt.strftime('%I:%M %p')
    except:
        scheduled_date = scheduled_datetime.split('T')[0]
        scheduled_time = scheduled_datetime.split('T')[1][:5]
    
    results = {
        'students_sent': [],
        'students_failed': [],
        'interviewer_sent': False,
        'interviewer_failed': False
    }
    
    # Send emails to students
    for email, name in zip(student_emails, student_names):
        html_body = generate_interview_invitation_email(
            student_name=name,
            interviewer_name=interviewer_name or "Interviewer",
            interview_title=interview_title,
            interview_type=interview_type,
            scheduled_date=scheduled_date,
            scheduled_time=scheduled_time,
            duration_minutes=duration_minutes,
            meeting_link=meeting_link,
            venue=venue,
            description=description,
            is_student=True
        )
        
        subject = f"Mock Interview Invitation: {interview_title}"
        text_body = f"""
        Dear {name},
        
        You have been invited to a mock interview:
        
        Type: {interview_type}
        Title: {interview_title}
        Date: {scheduled_date}
        Time: {scheduled_time}
        Duration: {duration_minutes} minutes
        Interviewer: {interviewer_name or 'TBD'}
        
        {f'Meeting Link: {meeting_link}' if meeting_link else f'Venue: {venue}' if venue else ''}
        
        {description or ''}
        
        Please prepare accordingly.
        """
        
        if send_email([email], subject, html_body, text_body):
            results['students_sent'].append(email)
        else:
            results['students_failed'].append(email)
    
    # Send email to interviewer
    if interviewer_email and interviewer_name:
        # Get first student name for interviewer email
        first_student_name = student_names[0] if student_names else "Student"
        student_list = ", ".join(student_names) if len(student_names) > 1 else first_student_name
        
        html_body = generate_interview_invitation_email(
            student_name=student_list,
            interviewer_name=interviewer_name,
            interview_title=interview_title,
            interview_type=interview_type,
            scheduled_date=scheduled_date,
            scheduled_time=scheduled_time,
            duration_minutes=duration_minutes,
            meeting_link=meeting_link,
            venue=venue,
            description=description,
            is_student=False
        )
        
        subject = f"Mock Interview Assignment: {interview_title}"
        text_body = f"""
        Dear {interviewer_name},
        
        You have been assigned to conduct a mock interview:
        
        Type: {interview_type}
        Title: {interview_title}
        Students: {student_list}
        Date: {scheduled_date}
        Time: {scheduled_time}
        Duration: {duration_minutes} minutes
        
        {f'Meeting Link: {meeting_link}' if meeting_link else f'Venue: {venue}' if venue else ''}
        
        {description or ''}
        
        Thank you for your participation.
        """
        
        if send_email([interviewer_email], subject, html_body, text_body):
            results['interviewer_sent'] = True
        else:
            results['interviewer_failed'] = True
    
    return results

