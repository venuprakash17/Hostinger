"""OpenAI Service for Resume Optimization"""
import os
import json
from typing import Dict, Any, Optional, List
import logging

logger = logging.getLogger(__name__)

# Initialize OpenAI client with graceful fallback
client = None
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

try:
    from openai import OpenAI
    if OPENAI_API_KEY:
        client = OpenAI(api_key=OPENAI_API_KEY)
    else:
        logger.warning("OPENAI_API_KEY not found in environment variables")
except ImportError as e:
    logger.warning(f"OpenAI library not available or incompatible version: {str(e)}")
    logger.warning("Install/update with: pip install 'openai>=1.51.0' 'httpx>=0.27.0'")
except Exception as e:
    logger.warning(f"Error initializing OpenAI client: {str(e)}")


def optimize_resume_for_fresher(
    resume_data: Dict[str, Any],
    target_role: Optional[str] = None,
    job_description: Optional[str] = None
) -> Dict[str, Any]:
    """
    Optimize resume for freshers using OpenAI
    Returns optimized resume data in the same structure
    """
    if not client:
        raise ValueError("OpenAI API key not configured")
    
    # Load optimization prompt
    prompt_path = os.path.join(
        os.path.dirname(__file__),
        "..",
        "prompts",
        "fresherResumeOptimize.prompt.txt"
    )
    
    try:
        with open(prompt_path, "r", encoding="utf-8") as f:
            system_prompt = f.read()
    except FileNotFoundError:
        # Fallback prompt if file doesn't exist
        system_prompt = """You are an expert resume writer specializing in fresher resumes (0-2 years experience).
Your task is to optimize resume content while maintaining 100% truthfulness.

Rules:
1. NEVER fabricate experiences, skills, or achievements
2. Rewrite bullets using strong action verbs (Led, Developed, Implemented, Analyzed)
3. Quantify achievements when numbers are provided
4. Improve clarity for freshers (academic projects → professional language)
5. Optimize keywords for ATS without changing meaning
6. Keep original structure and data types
7. Return ONLY valid JSON matching the input structure

Return the optimized resume data as JSON."""
    
    # Prepare user message
    user_message_parts = [
        f"Resume Data:\n{json.dumps(resume_data, indent=2)}"
    ]
    
    if target_role:
        user_message_parts.append(f"\nTarget Role: {target_role}")
    
    if job_description:
        # Truncate job description to avoid token limits
        job_desc = job_description[:2000] if len(job_description) > 2000 else job_description
        user_message_parts.append(f"\nJob Description:\n{job_desc}")
    
    user_message = "\n".join(user_message_parts)
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            response_format={"type": "json_object"},
            temperature=0.8,  # Increased for more creative optimization
            max_tokens=4000,  # Allow longer, more detailed responses
        )
        
        content = response.choices[0].message.content
        if not content:
            raise ValueError("Empty response from OpenAI")
        
        # Parse JSON response
        optimized_data = json.loads(content)
        
        # Ensure we return the same structure
        return optimized_data
        
    except Exception as e:
        logger.error(f"Error optimizing resume with OpenAI: {str(e)}")
        raise


def calculate_ats_score_ai(
    resume_data: Dict[str, Any],
    job_description: Optional[str] = None
) -> Dict[str, Any]:
    """
    Calculate ATS score using AI analysis
    Returns comprehensive ATS feedback
    """
    if not client:
        raise ValueError("OpenAI API key not configured")
    
    # Load ATS scoring prompt
    prompt_path = os.path.join(
        os.path.dirname(__file__),
        "..",
        "prompts",
        "atsScore.prompt.txt"
    )
    
    try:
        with open(prompt_path, "r", encoding="utf-8") as f:
            system_prompt = f.read()
    except FileNotFoundError:
        # Fallback prompt
        system_prompt = """You are an expert ATS (Applicant Tracking System) analyst specializing in fresher resumes.
Analyze the resume and provide a comprehensive ATS score (0-100) with detailed feedback.

Focus on:
1. Keyword optimization (matching job description if provided)
2. Section completeness
3. ATS-friendly formatting indicators
4. Fresher-specific improvements (academic projects, internships, skills)
5. Missing critical information
6. Strengths to highlight

Return JSON with:
- score (0-100)
- breakdown (section-wise scores)
- recommendations (list of strings)
- missing_keywords (list if job description provided)
- strengths (list of strings)
- improvements (list of strings)
- section_feedback (object with section names as keys)"""
    
    # Prepare user message
    user_message_parts = [
        f"Resume Data:\n{json.dumps(resume_data, indent=2)}"
    ]
    
    if job_description:
        job_desc = job_description[:2000] if len(job_description) > 2000 else job_description
        user_message_parts.append(f"\nJob Description:\n{job_desc}")
    
    user_message = "\n".join(user_message_parts)
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            response_format={"type": "json_object"},
            temperature=0.4,  # Slightly higher for more nuanced scoring
            max_tokens=3000,  # Allow detailed feedback
        )
        
        content = response.choices[0].message.content
        if not content:
            raise ValueError("Empty response from OpenAI")
        
        # Parse JSON response
        ats_result = json.loads(content)
        
        # Ensure all required fields exist
        result = {
            "score": ats_result.get("score", 0),
            "breakdown": ats_result.get("breakdown", {}),
            "recommendations": ats_result.get("recommendations", []),
            "missing_keywords": ats_result.get("missing_keywords", []),
            "strengths": ats_result.get("strengths", []),
            "improvements": ats_result.get("improvements", []),
            "section_feedback": ats_result.get("section_feedback", {})
        }
        
        return result
        
    except Exception as e:
        logger.error(f"Error calculating ATS score with AI: {str(e)}")
        raise

