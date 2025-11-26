"""Resume API endpoints - ATS Score, Cover Letter Generation"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from app.core.database import get_db
from app.models.user import User
from app.api.auth import get_current_user
from pydantic import BaseModel, Field
import re

router = APIRouter(prefix="/resume", tags=["resume"])


class ResumeData(BaseModel):
    """Resume data for ATS scoring"""
    personal_info: Optional[Dict[str, Any]] = None
    education: Optional[List[Dict[str, Any]]] = None
    experience: Optional[List[Dict[str, Any]]] = None
    projects: Optional[List[Dict[str, Any]]] = None
    skills: Optional[List[str]] = None
    certifications: Optional[List[Dict[str, Any]]] = None
    achievements: Optional[List[Dict[str, Any]]] = None


class ATSScoreRequest(BaseModel):
    """Request for ATS score calculation"""
    resume_data: ResumeData
    job_description: Optional[str] = None
    target_role: Optional[str] = None


class ATSScoreResponse(BaseModel):
    """ATS score response"""
    score: int = Field(..., ge=0, le=100)
    breakdown: Dict[str, int]
    recommendations: List[str]
    missing_keywords: List[str]
    strengths: List[str]


class CoverLetterRequest(BaseModel):
    """Request for cover letter generation"""
    resume_data: ResumeData
    job_description: str
    company_name: Optional[str] = None
    role: Optional[str] = None


class CoverLetterResponse(BaseModel):
    """Cover letter response"""
    cover_letter: str
    personalized: bool = True


def calculate_ats_score(resume_data: ResumeData, job_description: Optional[str] = None) -> ATSScoreResponse:
    """Calculate ATS score for a resume"""
    score = 0
    breakdown = {}
    recommendations = []
    missing_keywords = []
    strengths = []
    
    # 1. Personal Information (10 points)
    personal_score = 0
    if resume_data.personal_info:
        if resume_data.personal_info.get('full_name'):
            personal_score += 2
        if resume_data.personal_info.get('email'):
            personal_score += 2
        if resume_data.personal_info.get('phone_number'):
            personal_score += 2
        if resume_data.personal_info.get('address'):
            personal_score += 2
        if resume_data.personal_info.get('linkedin') or resume_data.personal_info.get('github'):
            personal_score += 2
    breakdown['personal_info'] = personal_score
    score += personal_score
    
    if personal_score < 8:
        recommendations.append("Complete your personal information section")
    
    # 2. Education (15 points)
    education_score = 0
    if resume_data.education and len(resume_data.education) > 0:
        education_score += 10  # Has education entries
        # Check for degree, institution, dates
        for edu in resume_data.education:
            if edu.get('degree') or edu.get('field_of_study'):
                education_score += 2
            if edu.get('institution'):
                education_score += 2
            if edu.get('start_date') or edu.get('end_date'):
                education_score += 1
        education_score = min(education_score, 15)
    breakdown['education'] = education_score
    score += education_score
    
    if education_score < 10:
        recommendations.append("Add at least one education entry with degree and institution")
    else:
        strengths.append("Education section is well-documented")
    
    # 3. Experience/Projects (25 points)
    experience_score = 0
    has_experience = resume_data.experience and len(resume_data.experience) > 0
    has_projects = resume_data.projects and len(resume_data.projects) > 0
    
    if has_experience:
        experience_score += 15
        for exp in resume_data.experience:
            if exp.get('description'):
                experience_score += 2
            if exp.get('technologies') or exp.get('skills'):
                experience_score += 2
        experience_score = min(experience_score, 20)
    elif has_projects:
        experience_score += 15
        for proj in resume_data.projects:
            if proj.get('description'):
                experience_score += 2
            if proj.get('technologies_used'):
                experience_score += 2
        experience_score = min(experience_score, 20)
    
    breakdown['experience'] = experience_score
    score += experience_score
    
    if experience_score < 15:
        recommendations.append("Add work experience or projects with detailed descriptions")
    else:
        strengths.append("Strong experience/project portfolio")
    
    # 4. Skills (20 points)
    skills_score = 0
    if resume_data.skills and len(resume_data.skills) > 0:
        skills_count = len(resume_data.skills)
        skills_score = min(15 + (skills_count // 3), 20)  # 15 base + up to 5 for more skills
    breakdown['skills'] = skills_score
    score += skills_score
    
    if skills_score < 15:
        recommendations.append("Add more relevant skills to your resume")
    else:
        strengths.append("Good skill diversity")
    
    # 5. Certifications & Achievements (10 points)
    cert_score = 0
    if resume_data.certifications and len(resume_data.certifications) > 0:
        cert_score += 5
    if resume_data.achievements and len(resume_data.achievements) > 0:
        cert_score += 5
    breakdown['certifications_achievements'] = cert_score
    score += cert_score
    
    # 6. Keywords Matching (20 points) - if job description provided
    keyword_score = 0
    if job_description:
        job_keywords = extract_keywords(job_description.lower())
        resume_text = extract_resume_text(resume_data).lower()
        
        matched_keywords = []
        for keyword in job_keywords:
            if keyword in resume_text:
                matched_keywords.append(keyword)
            else:
                missing_keywords.append(keyword)
        
        if len(job_keywords) > 0:
            keyword_score = int((len(matched_keywords) / len(job_keywords)) * 20)
        
        breakdown['keyword_matching'] = keyword_score
        score += keyword_score
        
        if keyword_score < 15:
            recommendations.append(f"Incorporate more keywords from the job description: {', '.join(missing_keywords[:5])}")
        else:
            strengths.append("Good keyword alignment with job description")
    
    # Final score (max 100)
    score = min(score, 100)
    
    # Additional recommendations based on score
    if score < 60:
        recommendations.append("Resume needs significant improvement. Focus on completing all sections.")
    elif score < 80:
        recommendations.append("Resume is good but can be enhanced. Add more details and keywords.")
    else:
        strengths.append("Resume is well-optimized for ATS systems")
    
    return ATSScoreResponse(
        score=score,
        breakdown=breakdown,
        recommendations=recommendations[:10],  # Limit to 10 recommendations
        missing_keywords=missing_keywords[:10],  # Limit to 10 missing keywords
        strengths=strengths
    )


def extract_keywords(text: str) -> List[str]:
    """Extract important keywords from job description"""
    # Common technical keywords
    tech_keywords = [
        'python', 'java', 'javascript', 'react', 'node.js', 'sql', 'mongodb',
        'aws', 'docker', 'kubernetes', 'git', 'agile', 'scrum', 'api',
        'machine learning', 'data science', 'frontend', 'backend', 'full stack',
        'devops', 'ci/cd', 'rest', 'graphql', 'typescript', 'angular', 'vue'
    ]
    
    # Extract words (simplified)
    words = re.findall(r'\b\w+\b', text.lower())
    
    # Filter for relevant keywords
    keywords = []
    for word in words:
        if len(word) > 3 and word in tech_keywords:
            keywords.append(word)
        elif len(word) > 5:  # Longer words are often important
            keywords.append(word)
    
    # Remove duplicates and return
    return list(set(keywords))[:20]  # Limit to 20 keywords


def extract_resume_text(resume_data: ResumeData) -> str:
    """Extract all text from resume data"""
    text_parts = []
    
    if resume_data.personal_info:
        text_parts.append(str(resume_data.personal_info))
    
    if resume_data.education:
        for edu in resume_data.education:
            text_parts.append(str(edu))
    
    if resume_data.experience:
        for exp in resume_data.experience:
            text_parts.append(str(exp))
    
    if resume_data.projects:
        for proj in resume_data.projects:
            text_parts.append(str(proj))
    
    if resume_data.skills:
        text_parts.append(' '.join([str(s) for s in resume_data.skills]))
    
    if resume_data.certifications:
        for cert in resume_data.certifications:
            text_parts.append(str(cert))
    
    return ' '.join(text_parts)


def generate_cover_letter(resume_data: ResumeData, job_description: str, 
                         company_name: Optional[str] = None, role: Optional[str] = None) -> str:
    """Generate a personalized cover letter"""
    name = resume_data.personal_info.get('full_name', 'Candidate') if resume_data.personal_info else 'Candidate'
    email = resume_data.personal_info.get('email', '') if resume_data.personal_info else ''
    
    # Extract key skills from resume
    skills = []
    if resume_data.skills:
        skills = resume_data.skills[:5]  # Top 5 skills
    
    # Extract experience highlights
    experience_highlights = []
    if resume_data.experience:
        for exp in resume_data.experience[:2]:  # Top 2 experiences
            if exp.get('title'):
                experience_highlights.append(exp.get('title'))
    elif resume_data.projects:
        for proj in resume_data.projects[:2]:  # Top 2 projects
            if proj.get('project_title'):
                experience_highlights.append(proj.get('project_title'))
    
    # Generate cover letter
    cover_letter = f"""Dear Hiring Manager,

I am writing to express my strong interest in the {role or 'position'} at {company_name or 'your organization'}. With my background in {', '.join(skills[:3]) if skills else 'technology'}, I am confident that I would be a valuable addition to your team.

"""
    
    if experience_highlights:
        cover_letter += f"""My experience includes {', '.join(experience_highlights)}, which has equipped me with the skills and knowledge necessary to excel in this role. """
    
    cover_letter += f"""
I am particularly drawn to this opportunity because it aligns perfectly with my career goals and allows me to contribute to {company_name or 'your organization'}'s mission. I am excited about the possibility of bringing my expertise in {', '.join(skills[:2]) if skills else 'software development'} to your team.

I would welcome the opportunity to discuss how my skills and experience can contribute to your organization's success. Thank you for considering my application.

Sincerely,
{name}
{email}
"""
    
    return cover_letter


@router.post("/ats-score", response_model=ATSScoreResponse)
async def calculate_ats_score_endpoint(
    request: ATSScoreRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Calculate ATS score for a resume"""
    try:
        result = calculate_ats_score(request.resume_data, request.job_description)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error calculating ATS score: {str(e)}"
        )


@router.post("/cover-letter", response_model=CoverLetterResponse)
async def generate_cover_letter_endpoint(
    request: CoverLetterRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate a personalized cover letter"""
    try:
        cover_letter = generate_cover_letter(
            request.resume_data,
            request.job_description,
            request.company_name,
            request.role
        )
        return CoverLetterResponse(
            cover_letter=cover_letter,
            personalized=True
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating cover letter: {str(e)}"
        )

