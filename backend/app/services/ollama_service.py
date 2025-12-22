"""Ollama Service for Resume Optimization (Free Alternative to OpenAI)"""
import os
import json
import requests
from typing import Dict, Any, Optional, List
import logging

logger = logging.getLogger(__name__)

# Ollama configuration
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")  # or "mistral", "codellama", etc.
OLLAMA_TIMEOUT = int(os.getenv("OLLAMA_TIMEOUT", "120"))  # 2 minutes timeout

def _call_ollama_api(prompt: str, system_prompt: Optional[str] = None, temperature: float = 0.7) -> Dict[str, Any]:
    """
    Call Ollama API with the given prompt
    Returns parsed JSON response
    """
    try:
        url = f"{OLLAMA_BASE_URL}/api/generate"
        
        messages = []
        if system_prompt:
            # Combine system prompt with user prompt
            full_prompt = f"{system_prompt}\n\n{prompt}"
        else:
            full_prompt = prompt
        
        payload = {
            "model": OLLAMA_MODEL,
            "prompt": full_prompt,
            "stream": False,
            "options": {
                "temperature": temperature,
                "top_p": 0.95,  # Increased for better quality
                "top_k": 40,  # Focus on top responses
                "num_predict": 6000,  # Increased for detailed responses
                "repeat_penalty": 1.1,  # Reduce repetition
            },
            "format": "json"  # Request JSON format
        }
        
        logger.info(f"Calling Ollama API: {url} with model: {OLLAMA_MODEL}")
        response = requests.post(url, json=payload, timeout=OLLAMA_TIMEOUT)
        
        if response.status_code != 200:
            logger.error(f"Ollama API error: {response.status_code} - {response.text}")
            raise ValueError(f"Ollama API returned status {response.status_code}: {response.text}")
        
        result = response.json()
        
        if "response" not in result:
            raise ValueError(f"Unexpected Ollama response format: {result}")
        
        # Parse JSON from response
        response_text = result["response"]
        try:
            # Try to extract JSON from the response if it's wrapped
            if "```json" in response_text:
                start = response_text.find("```json") + 7
                end = response_text.find("```", start)
                response_text = response_text[start:end].strip()
            elif "```" in response_text:
                start = response_text.find("```") + 3
                end = response_text.find("```", start)
                response_text = response_text[start:end].strip()
            
            return json.loads(response_text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Ollama JSON response: {response_text[:500]}")
            # Try to return the raw response as a fallback
            return {"error": "Failed to parse JSON response", "raw_response": response_text}
            
    except requests.exceptions.RequestException as e:
        logger.error(f"Ollama API request failed: {str(e)}")
        raise ValueError(f"Ollama API request failed: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error calling Ollama: {str(e)}")
        raise


def optimize_resume_for_fresher_ollama(
    resume_data: Dict[str, Any],
    target_role: Optional[str] = None,
    job_description: Optional[str] = None
) -> Dict[str, Any]:
    """
    Optimize resume for freshers using Ollama
    Returns optimized resume data in the same structure
    """
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
        optimized_data = _call_ollama_api(
            prompt=user_message,
            system_prompt=system_prompt,
            temperature=0.7
        )
        
        # Handle error response
        if "error" in optimized_data:
            logger.error(f"Ollama returned error: {optimized_data}")
            # Return original data as fallback
            return resume_data
        
        # Ensure we return the same structure
        return optimized_data
        
    except Exception as e:
        logger.error(f"Error optimizing resume with Ollama: {str(e)}")
        # Return original data as fallback
        logger.warning("Returning original resume data due to Ollama error")
        return resume_data


def calculate_ats_score_ollama(
    resume_data: Dict[str, Any],
    job_description: Optional[str] = None
) -> Dict[str, Any]:
    """
    Calculate ATS score using Ollama AI analysis
    Returns comprehensive ATS feedback
    """
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
        ats_result = _call_ollama_api(
            prompt=user_message,
            system_prompt=system_prompt,
            temperature=0.3  # Lower temperature for consistent scoring
        )
        
        # Handle error response
        if "error" in ats_result:
            logger.error(f"Ollama returned error: {ats_result}")
            # Return default structure
            return {
                "score": 50,
                "breakdown": {},
                "recommendations": ["Unable to analyze resume. Please check Ollama configuration."],
                "missing_keywords": [],
                "strengths": [],
                "improvements": [],
                "section_feedback": {}
            }
        
        # Ensure all required fields exist
        result = {
            "score": ats_result.get("score", 50),
            "breakdown": ats_result.get("breakdown", {}),
            "recommendations": ats_result.get("recommendations", []),
            "missing_keywords": ats_result.get("missing_keywords", []),
            "strengths": ats_result.get("strengths", []),
            "improvements": ats_result.get("improvements", []),
            "section_feedback": ats_result.get("section_feedback", {})
        }
        
        return result
        
    except Exception as e:
        logger.error(f"Error calculating ATS score with Ollama: {str(e)}")
        # Return default structure on error
        return {
            "score": 50,
            "breakdown": {},
            "recommendations": [f"ATS analysis failed: {str(e)}"],
            "missing_keywords": [],
            "strengths": [],
            "improvements": [],
            "section_feedback": {}
        }


def check_ollama_availability() -> bool:
    """
    Check if Ollama is available and configured
    Returns True if Ollama is accessible
    """
    try:
        url = f"{OLLAMA_BASE_URL}/api/tags"
        response = requests.get(url, timeout=5)
        return response.status_code == 200
    except Exception as e:
        logger.debug(f"Ollama not available: {str(e)}")
        return False

