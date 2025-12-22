"""Resume API endpoints - ATS Score, Cover Letter Generation, Optimization, PDF Generation"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from app.core.database import get_db
from app.models.user import User
from app.api.auth import get_current_user
from app.services.openai_service import optimize_resume_for_fresher, calculate_ats_score_ai
from app.services.ollama_service import (
    optimize_resume_for_fresher_ollama,
    calculate_ats_score_ollama,
    check_ollama_availability
)
from app.services.advanced_ai_service import (
    optimize_resume_premium,
    analyze_skill_gaps,
    generate_career_insights,
    extract_keywords_intelligent,
    detect_industry,
    analyze_project_relevance,
    rank_best_projects,
    rewrite_project_descriptions,
    OptimizationLevel,
    Industry,
    check_ollama_availability as check_advanced_ollama
)
from app.services.pdf_service import generate_resume_pdf
from pydantic import BaseModel, Field
import re
import logging

logger = logging.getLogger(__name__)

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


# ==================== NEW ENDPOINTS ====================

class ResumeOptimizeRequest(BaseModel):
    """Request for resume optimization"""
    resume_data: Dict[str, Any] = Field(..., description="Complete resume data as JSON")
    target_role: Optional[str] = Field(None, description="Target job role")
    job_description: Optional[str] = Field(None, description="Job description (optional)")


class ResumeOptimizeResponse(BaseModel):
    """Optimized resume response"""
    optimized_resume: Dict[str, Any] = Field(..., description="Optimized resume data")
    improvements_made: List[str] = Field(default_factory=list, description="List of improvements applied")


@router.post("/optimize", response_model=ResumeOptimizeResponse)
async def optimize_resume_endpoint(
    request: ResumeOptimizeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Optimize resume using AI for freshers - Ollama first, then OpenAI, then return original"""
    try:
        optimized_data = None
        ai_provider = None
        
        # Try Advanced AI Service (Premium Ollama) first
        try:
            is_available, model = check_advanced_ollama()
            if is_available:
                logger.info(f"Using Advanced AI Service with model: {model}")
                industry = detect_industry(request.resume_data, request.job_description)
                optimized_data = optimize_resume_premium(
                    request.resume_data,
                    request.target_role,
                    request.job_description,
                    optimization_level=OptimizationLevel.ADVANCED,
                    industry=industry
                )
                ai_provider = "advanced_ollama"
        except Exception as advanced_error:
            logger.warning(f"Advanced AI optimization failed: {str(advanced_error)}")

        # Fallback to standard Ollama
        if optimized_data is None or optimized_data == request.resume_data:
            try:
                if check_ollama_availability():
                    logger.info("Falling back to standard Ollama")
                    optimized_data = optimize_resume_for_fresher_ollama(
                        request.resume_data,
                        request.target_role,
                        request.job_description
                    )
                    ai_provider = "ollama"
            except Exception as ollama_error:
                logger.warning(f"Standard Ollama optimization failed: {str(ollama_error)}")
        
        # Fallback to OpenAI if both Ollama variants failed
        if optimized_data is None or optimized_data == request.resume_data:
            try:
                logger.info("Falling back to OpenAI for resume optimization")
                optimized_data = optimize_resume_for_fresher(
                    request.resume_data,
                    request.target_role,
                    request.job_description
                )
                ai_provider = "openai"
            except ValueError as openai_error:
                logger.warning(f"OpenAI optimization failed: {str(openai_error)}")
                # Return original data if both fail
                optimized_data = request.resume_data
                ai_provider = "none"
        
        improvements = [
            "Enhanced action verbs in descriptions",
            "Improved clarity and impact",
            "Optimized keywords for ATS",
            "Strengthened fresher-specific language"
        ]
        
        if ai_provider == "none":
            improvements = ["AI optimization unavailable. Using original resume data."]
        elif ai_provider == "ollama":
            improvements.insert(0, "Optimized using Ollama AI (free, local)")
        elif ai_provider == "openai":
            improvements.insert(0, "Optimized using OpenAI GPT")
        
        return ResumeOptimizeResponse(
            optimized_resume=optimized_data,
            improvements_made=improvements
        )
    except Exception as e:
        logger.error(f"Error optimizing resume: {str(e)}")
        # Return original data on error
        return ResumeOptimizeResponse(
            optimized_resume=request.resume_data,
            improvements_made=[f"Optimization failed: {str(e)}. Using original data."]
        )


class ATSScoreAIRequest(BaseModel):
    """Request for AI-powered ATS score calculation"""
    resume_data: Dict[str, Any] = Field(..., description="Complete resume data as JSON")
    job_description: Optional[str] = Field(None, description="Job description (optional)")


class ATSScoreAIResponse(BaseModel):
    """AI-powered ATS score response"""
    score: int = Field(..., ge=0, le=100, description="ATS score (0-100)")
    breakdown: Dict[str, int] = Field(default_factory=dict, description="Section-wise scores")
    recommendations: List[str] = Field(default_factory=list, description="Improvement recommendations")
    missing_keywords: List[str] = Field(default_factory=list, description="Missing keywords from JD")
    strengths: List[str] = Field(default_factory=list, description="Resume strengths")
    improvements: List[str] = Field(default_factory=list, description="Specific improvements needed")
    section_feedback: Dict[str, str] = Field(default_factory=dict, description="Section-specific feedback")


@router.post("/ats-score-ai", response_model=ATSScoreAIResponse)
async def calculate_ats_score_ai_endpoint(
    request: ATSScoreAIRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Calculate ATS score using AI analysis - Ollama first, then OpenAI, then rule-based"""
    try:
        result = None
        ai_provider = None
        
        # Try Ollama first (free)
        try:
            if check_ollama_availability():
                logger.info("Using Ollama for ATS scoring")
                result = calculate_ats_score_ollama(
                    request.resume_data,
                    request.job_description
                )
                ai_provider = "ollama"
        except Exception as ollama_error:
            logger.warning(f"Ollama ATS scoring failed: {str(ollama_error)}")
        
        # Fallback to OpenAI if Ollama failed
        if result is None:
            try:
                logger.info("Falling back to OpenAI for ATS scoring")
                result = calculate_ats_score_ai(
                    request.resume_data,
                    request.job_description
                )
                ai_provider = "openai"
                return ATSScoreAIResponse(**result)
            except ValueError as ve:
                logger.info(f"OpenAI not configured, falling back to rule-based scoring: {str(ve)}")
                ai_provider = "rule-based"
        
        # Final fallback to rule-based scoring
        if result is None or ai_provider == "rule-based":
            try:
                # Normalize resume data - convert skills dict to list if needed
                normalized_data = request.resume_data.copy()
                if normalized_data.get("skills"):
                    skills = normalized_data["skills"]
                    # If skills is a dict, convert to flat list
                    if isinstance(skills, dict):
                        flat_skills = []
                        for category_skills in skills.values():
                            if isinstance(category_skills, list):
                                flat_skills.extend(category_skills)
                        normalized_data["skills"] = flat_skills
                
                resume_data_obj = ResumeData(**normalized_data)
                rule_result = calculate_ats_score(resume_data_obj, request.job_description)
                result = {
                    "score": rule_result.score,
                    "breakdown": rule_result.breakdown,
                    "recommendations": rule_result.recommendations,
                    "missing_keywords": rule_result.missing_keywords,
                    "strengths": rule_result.strengths,
                    "improvements": [],
                    "section_feedback": {}
                }
            except Exception as e2:
                logger.error(f"Error in rule-based ATS scoring: {str(e2)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"ATS scoring failed: {str(e2)}"
                )
        
        return ATSScoreAIResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating ATS score: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error calculating ATS score: {str(e)}"
        )


class GeneratePDFRequest(BaseModel):
    """Request for PDF generation"""
    resume_data: Dict[str, Any] = Field(..., description="Complete resume data as JSON")
    template: str = Field(default="fresher_classic", description="Template ID")
    filename: Optional[str] = Field(None, description="Output filename")


@router.post("/generate-pdf")
async def generate_pdf_endpoint(
    request: GeneratePDFRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate PDF from resume data using selected template"""
    try:
        pdf_bytes = generate_resume_pdf(
            request.resume_data,
            request.template
        )
        
        filename = request.filename or f"resume_{current_user.id}.pdf"
        if not filename.endswith(".pdf"):
            filename += ".pdf"
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
    except Exception as e:
        logger.error(f"Error generating PDF: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating PDF: {str(e)}"
        )


# ==================== ADVANCED AI ENDPOINTS ====================

@router.post("/skill-gap-analysis")
async def skill_gap_analysis_endpoint(
    request: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Analyze skill gaps and provide recommendations"""
    try:
        resume_data = request.get("resume_data", {})
        target_role = request.get("target_role", "")
        job_description = request.get("job_description")
        
        if not target_role:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Target role is required for skill gap analysis"
            )
        
        analysis = analyze_skill_gaps(
            resume_data,
            target_role,
            job_description
        )
        
        return analysis
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing skill gaps: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error analyzing skill gaps: {str(e)}"
        )


@router.post("/career-insights")
async def career_insights_endpoint(
    request: ResumeOptimizeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate career insights and path recommendations"""
    try:
        insights = generate_career_insights(
            request.resume_data,
            request.target_role
        )
        
        return insights
    except Exception as e:
        logger.error(f"Error generating career insights: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating career insights: {str(e)}"
        )


@router.post("/suggest-projects")
async def suggest_projects_endpoint(
    request: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Suggest relevant projects based on target role and job description"""
    try:
        target_role = request.get("target_role", "")
        job_description = request.get("job_description", "")
        company_name = request.get("company_name", "")
        current_projects_count = request.get("current_projects_count", 0)

        if not target_role:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Target role is required for project suggestions"
            )

        # Use Ollama to generate project suggestions
        suggestions = []
        try:
            is_available, model = check_advanced_ollama()
            if is_available:
                from app.services.advanced_ai_service import _call_ollama_advanced
                
                prompt = f"""You are a career advisor helping a student/fresher prepare their resume for a {target_role} role{f" at {company_name}" if company_name else ""}.

The student currently has {current_projects_count} project(s) in their resume.

Job Description:
{job_description if job_description else "No job description provided"}

Suggest 2-3 specific, realistic projects that would strengthen their resume for this role. Each project should:
1. Be relevant to the {target_role} role
2. Use technologies commonly required for this role
3. Have clear, measurable outcomes
4. Be achievable by a student/fresher
5. Include specific contributions/achievements

For each project, provide:
- project_title: Clear, professional project name
- description: 2-3 sentence description of what the project does and its purpose
- technologies_used: Array of 4-6 relevant technologies
- suggested_contributions: Array of 5-7 bullet points with specific achievements (use action verbs, include metrics where possible)
- relevance_score: Score 80-100 indicating how relevant this project is
- reason: Brief explanation of why this project helps for this role

Return JSON format:
{{
  "suggestions": [
    {{
      "project_title": "...",
      "description": "...",
      "technologies_used": ["tech1", "tech2", ...],
      "suggested_contributions": ["bullet1", "bullet2", ...],
      "relevance_score": 95,
      "reason": "..."
    }}
  ]
}}"""

                result = _call_ollama_advanced(
                    prompt=prompt,
                    system_prompt="You are an expert career advisor specializing in resume optimization for students and freshers. Provide practical, actionable project suggestions.",
                    temperature=0.8,
                    max_tokens=3000
                )
                suggestions = result.get("suggestions", [])
        except Exception as e:
            logger.warning(f"AI project suggestion failed: {str(e)}")
            # Return empty suggestions - frontend will use fallback

        return {"suggestions": suggestions}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error suggesting projects: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error suggesting projects: {str(e)}"
        )


@router.post("/analyze-project-relevance")
async def analyze_project_relevance_endpoint(
    request: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Analyze project relevance for a target role using AI"""
    try:
        project = request.get("project", {})
        target_role = request.get("target_role", "")
        job_description = request.get("job_description")
        
        if not target_role:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Target role is required for project relevance analysis"
            )
        
        if not project:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Project data is required"
            )
        
        analysis = analyze_project_relevance(
            project,
            target_role,
            job_description
        )
        
        return analysis
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing project relevance: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error analyzing project relevance: {str(e)}"
        )


@router.post("/analyze-all-projects-relevance")
async def analyze_all_projects_relevance_endpoint(
    request: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Analyze relevance of all projects for a target role using AI"""
    try:
        projects = request.get("projects", [])
        target_role = request.get("target_role", "")
        job_description = request.get("job_description")
        
        if not target_role:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Target role is required for project relevance analysis"
            )
        
        if not projects or len(projects) == 0:
            return {
                "project_analyses": [],
                "needs_more_projects": True,
                "recommended_project_count": 3
            }
        
        # Analyze each project
        analyses = []
        for project in projects:
            try:
                analysis = analyze_project_relevance(
                    project,
                    target_role,
                    job_description
                )
                analyses.append(analysis)
            except Exception as e:
                logger.warning(f"Failed to analyze project {project.get('project_title', 'unknown')}: {e}")
                # Default to relevant if analysis fails
                analyses.append({
                    "project_title": project.get('project_title', 'Untitled Project'),
                    "relevant": True,
                    "relevance_score": 70,
                    "reason": "Analysis unavailable - assumed relevant",
                    "suggestion": "Review manually"
                })
        
        return {
            "project_analyses": analyses,
            "needs_more_projects": len(projects) < 3,
            "recommended_project_count": 3
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing projects relevance: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error analyzing projects relevance: {str(e)}"
        )


@router.post("/rank-best-projects")
async def rank_best_projects_endpoint(
    request: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Rank projects and select the top N most relevant for a target role using AI"""
    try:
        projects = request.get("projects", [])
        target_role = request.get("target_role", "")
        job_description = request.get("job_description")
        top_n = request.get("top_n", 3)

        if not target_role:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Target role is required for project ranking"
            )
        
        if not projects or len(projects) == 0:
            return {
                "summary": "No projects to rank.",
                "ranked_projects": [],
                "projects_to_keep": []
            }

        ranking_result = rank_best_projects(
            projects,
            target_role,
            job_description,
            top_n
        )
        return ranking_result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error ranking projects: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error ranking projects: {str(e)}"
        )


@router.post("/extract-keywords")
async def extract_keywords_endpoint(
    request: ResumeOptimizeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Intelligently extract and categorize keywords from job description"""
    try:
        if not request.job_description:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Job description is required for keyword extraction"
            )
        
        keywords = extract_keywords_intelligent(
            request.job_description,
            request.resume_data
        )
        
        return keywords
    except Exception as e:
        logger.error(f"Error extracting keywords: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error extracting keywords: {str(e)}"
        )


@router.post("/rewrite-project-descriptions")
async def rewrite_project_descriptions_endpoint(
    request: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Rewrite project descriptions to be consistent and professional (2-3 sentences)"""
    try:
        projects = request.get("projects", [])
        target_role = request.get("target_role")
        
        if not projects or len(projects) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Projects list is required"
            )
        
        rewritten_projects = rewrite_project_descriptions(
            projects,
            target_role
        )
        
        return {
            "rewritten_projects": rewritten_projects,
            "count": len(rewritten_projects)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rewriting project descriptions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error rewriting project descriptions: {str(e)}"
        )


@router.post("/detect-industry")
async def detect_industry_endpoint(
    request: ResumeOptimizeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Detect target industry from resume and job description"""
    try:
        industry = detect_industry(request.resume_data, request.job_description)
        
        return {"industry": industry.value, "industry_display": industry.value.replace("_", " ").title()}
    except Exception as e:
        logger.error(f"Error detecting industry: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error detecting industry: {str(e)}"
        )

