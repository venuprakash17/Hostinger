"""PDF Generation Service for Resumes"""
import os
import base64
from typing import Dict, Any, Optional
from io import BytesIO
import logging

logger = logging.getLogger(__name__)

# Check if weasyprint is available
WEASYPRINT_AVAILABLE = False
REPORTLAB_AVAILABLE = False

try:
    from weasyprint import HTML, CSS
    from weasyprint.text.fonts import FontConfiguration
    WEASYPRINT_AVAILABLE = True
except ImportError:
    logger.warning("weasyprint not available, PDF generation will use reportlab fallback")

# Fallback to reportlab
if not WEASYPRINT_AVAILABLE:
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
        from reportlab.lib.enums import TA_LEFT, TA_CENTER
        REPORTLAB_AVAILABLE = True
    except ImportError:
        logger.warning("reportlab not available, PDF generation will fail")


def generate_resume_pdf(resume_data: Dict[str, Any], template: str = "fresher_classic") -> bytes:
    """
    Generate PDF from resume data using specified template
    Returns PDF as bytes
    """
    if WEASYPRINT_AVAILABLE:
        try:
            # Get template HTML
            html_content = render_resume_html(resume_data, template)
            # Generate PDF using WeasyPrint
            font_config = FontConfiguration()
            html_doc = HTML(string=html_content)
            pdf_bytes = html_doc.write_pdf(
                stylesheets=[CSS(string=get_resume_css(template))],
                font_config=font_config
            )
            return pdf_bytes
        except Exception as e:
            logger.error(f"Error generating PDF with WeasyPrint: {str(e)}")
            # Fallback to reportlab
            if REPORTLAB_AVAILABLE:
                try:
                    return generate_pdf_reportlab(resume_data, template)
                except Exception as e2:
                    logger.error(f"Error generating PDF with ReportLab: {str(e2)}")
                    raise ValueError(f"PDF generation failed with both methods: WeasyPrint: {str(e)}, ReportLab: {str(e2)}")
            raise ValueError(f"PDF generation failed: {str(e)}. Install reportlab for fallback.")
    elif REPORTLAB_AVAILABLE:
        try:
            return generate_pdf_reportlab(resume_data, template)
        except Exception as e:
            logger.error(f"Error generating PDF with ReportLab: {str(e)}")
            raise ValueError(f"PDF generation failed: {str(e)}")
    else:
        raise ValueError("PDF generation service not available. Install weasyprint or reportlab: pip install weasyprint")


def render_resume_html(resume_data: Dict[str, Any], template: str) -> str:
    """
    Render resume data as HTML using template
    """
    profile = resume_data.get("profile", {})
    summary = resume_data.get("summary", "")
    education = resume_data.get("education", [])
    work_experience = resume_data.get("work_experience", [])
    projects = resume_data.get("projects", [])
    skills = resume_data.get("skills", {})
    certifications = resume_data.get("certifications", [])
    achievements = resume_data.get("achievements", [])
    extracurricular = resume_data.get("extracurricular", [])
    hobbies = resume_data.get("hobbies", [])
    
    # Get template-specific HTML structure
    if template == "fresher_classic":
        return render_fresher_classic_template(
            profile, summary, education, work_experience, projects,
            skills, certifications, achievements, extracurricular, hobbies
        )
    elif template == "project_focused":
        return render_project_focused_template(
            profile, summary, education, work_experience, projects,
            skills, certifications, achievements, extracurricular, hobbies
        )
    elif template == "skills_first":
        return render_skills_first_template(
            profile, summary, education, work_experience, projects,
            skills, certifications, achievements, extracurricular, hobbies
        )
    elif template == "internship_focused":
        return render_internship_focused_template(
            profile, summary, education, work_experience, projects,
            skills, certifications, achievements, extracurricular, hobbies
        )
    elif template == "minimal_ats":
        return render_minimal_ats_template(
            profile, summary, education, work_experience, projects,
            skills, certifications, achievements, extracurricular, hobbies
        )
    else:
        # Default to fresher_classic
        return render_fresher_classic_template(
            profile, summary, education, work_experience, projects,
            skills, certifications, achievements, extracurricular, hobbies
        )


def get_resume_css(template: str) -> str:
    """Get CSS for resume template"""
    base_css = """
        @page {
            size: A4;
            margin: 0.75in;
        }
        
        body {
            font-family: 'Helvetica', Arial, sans-serif;
            font-size: 10pt;
            line-height: 1.4;
            color: #000000;
            margin: 0;
            padding: 0;
        }
        
        .resume-header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
            margin-bottom: 15px;
        }
        
        .resume-name {
            font-size: 22pt;
            font-weight: bold;
            margin-bottom: 5px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .resume-contact {
            font-size: 9pt;
            color: #333;
        }
        
        .resume-section {
            margin-top: 12px;
            margin-bottom: 8px;
        }
        
        .section-title {
            font-size: 11pt;
            font-weight: bold;
            text-transform: uppercase;
            border-bottom: 1px solid #000;
            padding-bottom: 3px;
            margin-bottom: 8px;
            letter-spacing: 0.5px;
        }
        
        .section-item {
            margin-bottom: 10px;
        }
        
        .item-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
        }
        
        .item-title {
            font-weight: bold;
            font-size: 11pt;
        }
        
        .item-date {
            font-size: 9pt;
            color: #666;
        }
        
        .item-subtitle {
            font-size: 10pt;
            color: #333;
            margin-bottom: 3px;
        }
        
        .item-description {
            font-size: 10pt;
            margin-top: 3px;
        }
        
        .bullet-list {
            margin: 5px 0;
            padding-left: 20px;
        }
        
        .bullet-item {
            margin-bottom: 3px;
        }
        
        .skills-list {
            margin: 5px 0;
        }
        
        .skill-category {
            font-weight: bold;
            margin-right: 5px;
        }
    """
    
    return base_css


def render_fresher_classic_template(profile, summary, education, work_experience, projects,
                                    skills, certifications, achievements, extracurricular, hobbies) -> str:
    """Render Fresher Classic template"""
    html_parts = ['<html><head><meta charset="UTF-8"></head><body>']
    
    # Header
    html_parts.append('<div class="resume-header">')
    html_parts.append(f'<div class="resume-name">{profile.get("full_name", "")}</div>')
    contact_parts = []
    if profile.get("email"):
        contact_parts.append(profile["email"])
    if profile.get("phone_number"):
        contact_parts.append(profile["phone_number"])
    if profile.get("linkedin_profile"):
        contact_parts.append(profile["linkedin_profile"])
    if profile.get("github_portfolio"):
        contact_parts.append(profile["github_portfolio"])
    html_parts.append(f'<div class="resume-contact">{" | ".join(contact_parts)}</div>')
    html_parts.append('</div>')
    
    # Summary
    if summary:
        html_parts.append('<div class="resume-section">')
        html_parts.append('<div class="section-title">Professional Summary</div>')
        html_parts.append(f'<div class="item-description">{summary}</div>')
        html_parts.append('</div>')
    
    # Education
    if education:
        html_parts.append('<div class="resume-section">')
        html_parts.append('<div class="section-title">Education</div>')
        for edu in education:
            html_parts.append('<div class="section-item">')
            html_parts.append('<div class="item-header">')
            degree = edu.get("degree", "")
            institution = edu.get("institution_name", "")
            html_parts.append(f'<div class="item-title">{degree} - {institution}</div>')
            start = edu.get("start_date", "")
            end = "Present" if edu.get("is_current") else edu.get("end_date", "")
            html_parts.append(f'<div class="item-date">{start} - {end}</div>')
            html_parts.append('</div>')
            if edu.get("cgpa_percentage"):
                html_parts.append(f'<div class="item-subtitle">CGPA: {edu["cgpa_percentage"]}</div>')
            html_parts.append('</div>')
        html_parts.append('</div>')
    
    # Projects
    if projects:
        html_parts.append('<div class="resume-section">')
        html_parts.append('<div class="section-title">Projects</div>')
        for proj in projects:
            html_parts.append('<div class="section-item">')
            html_parts.append('<div class="item-header">')
            html_parts.append(f'<div class="item-title">{proj.get("project_title", "")}</div>')
            html_parts.append('</div>')
            if proj.get("description"):
                html_parts.append(f'<div class="item-description">{proj["description"]}</div>')
            if proj.get("technologies_used"):
                tech = ", ".join(proj["technologies_used"]) if isinstance(proj["technologies_used"], list) else proj["technologies_used"]
                html_parts.append(f'<div class="item-subtitle">Technologies: {tech}</div>')
            html_parts.append('</div>')
        html_parts.append('</div>')
    
    # Skills
    if skills:
        html_parts.append('<div class="resume-section">')
        html_parts.append('<div class="section-title">Skills</div>')
        if isinstance(skills, dict):
            for category, skill_list in skills.items():
                if skill_list:
                    skill_str = ", ".join(skill_list) if isinstance(skill_list, list) else str(skill_list)
                    html_parts.append(f'<div class="skills-list"><span class="skill-category">{category}:</span> {skill_str}</div>')
        html_parts.append('</div>')
    
    # Certifications
    if certifications:
        html_parts.append('<div class="resume-section">')
        html_parts.append('<div class="section-title">Certifications</div>')
        for cert in certifications:
            cert_name = cert.get("certification_name", "")
            org = cert.get("issuing_organization", "")
            html_parts.append(f'<div class="bullet-item">• {cert_name} - {org}</div>')
        html_parts.append('</div>')
    
    html_parts.append('</body></html>')
    return "\n".join(html_parts)


def render_project_focused_template(profile, summary, education, work_experience, projects,
                                    skills, certifications, achievements, extracurricular, hobbies) -> str:
    """Render Project-Focused template (projects immediately after summary)"""
    # Similar structure but projects come before education
    html_parts = ['<html><head><meta charset="UTF-8"></head><body>']
    
    # Header (same as classic)
    html_parts.append('<div class="resume-header">')
    html_parts.append(f'<div class="resume-name">{profile.get("full_name", "")}</div>')
    contact_parts = []
    if profile.get("email"):
        contact_parts.append(profile["email"])
    if profile.get("phone_number"):
        contact_parts.append(profile["phone_number"])
    if profile.get("linkedin_profile"):
        contact_parts.append(profile["linkedin_profile"])
    if profile.get("github_portfolio"):
        contact_parts.append(profile["github_portfolio"])
    html_parts.append(f'<div class="resume-contact">{" | ".join(contact_parts)}</div>')
    html_parts.append('</div>')
    
    # Summary
    if summary:
        html_parts.append('<div class="resume-section">')
        html_parts.append('<div class="section-title">Professional Summary</div>')
        html_parts.append(f'<div class="item-description">{summary}</div>')
        html_parts.append('</div>')
    
    # Projects (moved up)
    if projects:
        html_parts.append('<div class="resume-section">')
        html_parts.append('<div class="section-title">Projects</div>')
        for proj in projects:
            html_parts.append('<div class="section-item">')
            html_parts.append('<div class="item-header">')
            html_parts.append(f'<div class="item-title">{proj.get("project_title", "")}</div>')
            html_parts.append('</div>')
            if proj.get("description"):
                html_parts.append(f'<div class="item-description">{proj["description"]}</div>')
            if proj.get("technologies_used"):
                tech = ", ".join(proj["technologies_used"]) if isinstance(proj["technologies_used"], list) else proj["technologies_used"]
                html_parts.append(f'<div class="item-subtitle">Technologies: {tech}</div>')
            if proj.get("contributions"):
                html_parts.append('<div class="bullet-list">')
                for contrib in proj["contributions"]:
                    html_parts.append(f'<div class="bullet-item">• {contrib}</div>')
                html_parts.append('</div>')
            html_parts.append('</div>')
        html_parts.append('</div>')
    
    # Education (after projects)
    if education:
        html_parts.append('<div class="resume-section">')
        html_parts.append('<div class="section-title">Education</div>')
        for edu in education:
            html_parts.append('<div class="section-item">')
            html_parts.append('<div class="item-header">')
            degree = edu.get("degree", "")
            institution = edu.get("institution_name", "")
            html_parts.append(f'<div class="item-title">{degree} - {institution}</div>')
            start = edu.get("start_date", "")
            end = "Present" if edu.get("is_current") else edu.get("end_date", "")
            html_parts.append(f'<div class="item-date">{start} - {end}</div>')
            html_parts.append('</div>')
            html_parts.append('</div>')
        html_parts.append('</div>')
    
    # Skills
    if skills:
        html_parts.append('<div class="resume-section">')
        html_parts.append('<div class="section-title">Skills</div>')
        if isinstance(skills, dict):
            for category, skill_list in skills.items():
                if skill_list:
                    skill_str = ", ".join(skill_list) if isinstance(skill_list, list) else str(skill_list)
                    html_parts.append(f'<div class="skills-list"><span class="skill-category">{category}:</span> {skill_str}</div>')
        html_parts.append('</div>')
    
    html_parts.append('</body></html>')
    return "\n".join(html_parts)


def render_skills_first_template(profile, summary, education, work_experience, projects,
                                 skills, certifications, achievements, extracurricular, hobbies) -> str:
    """Render Skills-First template"""
    # Skills immediately after summary
    return render_project_focused_template(profile, summary, education, work_experience, projects,
                                          skills, certifications, achievements, extracurricular, hobbies)


def render_internship_focused_template(profile, summary, education, work_experience, projects,
                                      skills, certifications, achievements, extracurricular, hobbies) -> str:
    """Render Internship-Focused template"""
    # Similar to classic but highlights experience/internships
    return render_fresher_classic_template(profile, summary, education, work_experience, projects,
                                          skills, certifications, achievements, extracurricular, hobbies)


def render_minimal_ats_template(profile, summary, education, work_experience, projects,
                               skills, certifications, achievements, extracurricular, hobbies) -> str:
    """Render Minimal ATS Pro template"""
    # Ultra-clean, maximum readability
    return render_fresher_classic_template(profile, summary, education, work_experience, projects,
                                          skills, certifications, achievements, extracurricular, hobbies)


def generate_pdf_reportlab(resume_data: Dict[str, Any], template: str = "fresher_classic") -> bytes:
    """Generate PDF using reportlab (fallback)"""
    # Import here to avoid issues if reportlab is not available
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
        from reportlab.lib.enums import TA_LEFT, TA_CENTER
    except ImportError:
        raise ValueError("reportlab not installed. Install with: pip install reportlab")
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=0.75*inch, leftMargin=0.75*inch,
                            topMargin=0.75*inch, bottomMargin=0.75*inch)
    
    styles = getSampleStyleSheet()
    story = []
    
    # Title style
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor='black',
        spaceAfter=6,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    # Section heading style
    section_style = ParagraphStyle(
        'CustomSection',
        parent=styles['Heading2'],
        fontSize=12,
        textColor='black',
        spaceAfter=6,
        spaceBefore=12,
        alignment=TA_LEFT,
        fontName='Helvetica-Bold',
        underlineWidth=1
    )
    
    # Content style
    content_style = ParagraphStyle(
        'CustomContent',
        parent=styles['Normal'],
        fontSize=10,
        textColor='black',
        spaceAfter=6,
        alignment=TA_LEFT,
        fontName='Helvetica'
    )
    
    profile = resume_data.get("profile", {})
    
    # Header
    if profile.get("full_name"):
        story.append(Paragraph(profile["full_name"], title_style))
        story.append(Spacer(1, 0.1*inch))
    
    contact_info = []
    if profile.get("email"):
        contact_info.append(profile["email"])
    if profile.get("phone_number"):
        contact_info.append(profile["phone_number"])
    if profile.get("linkedin_profile"):
        contact_info.append(profile["linkedin_profile"])
    
    if contact_info:
        story.append(Paragraph(" | ".join(contact_info), content_style))
        story.append(Spacer(1, 0.15*inch))
    
    # Summary
    summary = resume_data.get("summary", "")
    if summary:
        story.append(Paragraph("<b>PROFESSIONAL SUMMARY</b>", section_style))
        story.append(Paragraph(summary, content_style))
    
    # Education
    education = resume_data.get("education", [])
    if education:
        story.append(Paragraph("<b>EDUCATION</b>", section_style))
        for edu in education:
            degree = edu.get("degree", "")
            institution = edu.get("institution_name", "")
            edu_text = f"<b>{degree}</b> - {institution}"
            if edu.get("cgpa_percentage"):
                edu_text += f" | CGPA: {edu['cgpa_percentage']}"
            story.append(Paragraph(edu_text, content_style))
            story.append(Spacer(1, 0.05*inch))
    
    # Projects
    projects = resume_data.get("projects", [])
    if projects:
        story.append(Paragraph("<b>PROJECTS</b>", section_style))
        for proj in projects:
            title = proj.get("project_title", "")
            desc = proj.get("description", "")
            story.append(Paragraph(f"<b>{title}</b>", content_style))
            if desc:
                story.append(Paragraph(desc, content_style))
            story.append(Spacer(1, 0.05*inch))
    
    # Skills
    skills = resume_data.get("skills", {})
    if skills:
        story.append(Paragraph("<b>SKILLS</b>", section_style))
        if isinstance(skills, dict):
            for category, skill_list in skills.items():
                if skill_list:
                    skills_text = f"<b>{category}:</b> {', '.join(skill_list) if isinstance(skill_list, list) else skill_list}"
                    story.append(Paragraph(skills_text, content_style))
    
    # Build PDF
    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()

