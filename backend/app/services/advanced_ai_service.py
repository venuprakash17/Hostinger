"""
Advanced AI-Powered Resume Optimization Service
Enterprise-grade resume enhancement using Ollama (Free & Open-Source)
Supports multiple models, industry detection, skill gap analysis, and more
"""

import os
import json
import requests
from typing import Dict, Any, Optional, List, Tuple
import logging
from enum import Enum
from concurrent.futures import ThreadPoolExecutor, as_completed, TimeoutError as FuturesTimeoutError
from functools import lru_cache
import hashlib

logger = logging.getLogger(__name__)

# Ollama Configuration
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_TIMEOUT = int(os.getenv("OLLAMA_TIMEOUT", "180"))  # 3 minutes for complex operations

# Model priorities (best quality to fastest)
AVAILABLE_MODELS = [
    "llama3.1:8b",      # Best quality, balanced speed
    "mistral:7b",       # Fast, good quality
    "llama3.2:3b",      # Fastest, decent quality
    "llama3.2:1b",      # Ultra-fast, basic quality
]

class OptimizationLevel(str, Enum):
    """Optimization intensity levels"""
    BASIC = "basic"          # Quick enhancements
    STANDARD = "standard"    # Balanced optimization
    ADVANCED = "advanced"    # Comprehensive enhancement
    PREMIUM = "premium"      # Maximum optimization with analysis

class Industry(str, Enum):
    """Supported industries for specialization"""
    SOFTWARE_ENGINEERING = "software_engineering"
    DATA_SCIENCE = "data_science"
    WEB_DEVELOPMENT = "web_development"
    MOBILE_DEVELOPMENT = "mobile_development"
    DEVOPS = "devops"
    CYBERSECURITY = "cybersecurity"
    AI_ML = "ai_ml"
    PRODUCT_MANAGEMENT = "product_management"
    BUSINESS_ANALYST = "business_analyst"
    FINANCE = "finance"
    MARKETING = "marketing"
    GENERAL = "general"


def _find_best_available_model() -> str:
    """Find the best available Ollama model"""
    try:
        response = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
        if response.status_code == 200:
            models = response.json().get("models", [])
            available_names = [m.get("name", "") for m in models]
            
            for model in AVAILABLE_MODELS:
                if model in available_names:
                    logger.info(f"Using Ollama model: {model}")
                    return model
            
            # Fallback to first available model
            if available_names:
                logger.info(f"Using available model: {available_names[0]}")
                return available_names[0]
    except Exception as e:
        logger.warning(f"Could not check available models: {e}")
    
    # Default fallback
    default = AVAILABLE_MODELS[0]
    logger.info(f"Using default model: {default}")
    return default


def _call_ollama_advanced(
    prompt: str,
    system_prompt: Optional[str] = None,
    temperature: float = 0.7,
    max_tokens: int = 8000,
    model: Optional[str] = None
) -> Dict[str, Any]:
    """
    Advanced Ollama API call with better error handling and JSON parsing
    Uses /api/chat for better results with modern models
    """
    model = model or _find_best_available_model()
    
    try:
        # Try chat API first (better for modern models)
        url = f"{OLLAMA_BASE_URL}/api/chat"
        
        # Build messages array
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        payload = {
            "model": model,
            "messages": messages,
            "stream": False,
            "format": "json",
            "options": {
                "temperature": temperature,
                "top_p": 0.95,
                "top_k": 40,
                "num_predict": max_tokens,
                "repeat_penalty": 1.15,
            }
        }
        
        logger.info(f"Calling Ollama Chat API with model: {model}")
        response = requests.post(url, json=payload, timeout=OLLAMA_TIMEOUT)
        
        if response.status_code != 200:
            # Fallback to /api/generate if chat API not available
            logger.warning(f"Chat API failed, falling back to /api/generate")
            url = f"{OLLAMA_BASE_URL}/api/generate"
            full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
            payload = {
                "model": model,
                "prompt": full_prompt,
                "stream": False,
                "format": "json",
                "options": {
                    "temperature": temperature,
                    "top_p": 0.95,
                    "top_k": 40,
                    "num_predict": max_tokens,
                    "repeat_penalty": 1.15,
                }
            }
            response = requests.post(url, json=payload, timeout=OLLAMA_TIMEOUT)
        
        if response.status_code != 200:
            error_msg = f"Ollama API error: {response.status_code} - {response.text}"
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        result = response.json()
        
        # Handle both chat and generate API formats
        if "message" in result:
            response_text = result["message"].get("content", "")
        elif "response" in result:
            response_text = result["response"]
        else:
            raise ValueError(f"Unexpected Ollama response format: {result}")
        
        # Clean JSON response
        response_text = response_text.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        try:
            return json.loads(response_text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON: {response_text[:500]}")
            # Try to extract JSON object manually
            start = response_text.find("{")
            end = response_text.rfind("}") + 1
            if start >= 0 and end > start:
                return json.loads(response_text[start:end])
            raise ValueError(f"Could not parse JSON response: {e}")
            
    except requests.exceptions.RequestException as e:
        logger.error(f"Ollama API request failed: {str(e)}")
        raise ValueError(f"Ollama API unavailable: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error calling Ollama: {str(e)}")
        raise


def detect_industry(resume_data: Dict[str, Any], job_description: Optional[str] = None) -> Industry:
    """
    Intelligently detect the target industry from resume and job description
    """
    system_prompt = """You are an expert at analyzing resumes and job descriptions to determine the target industry.
Analyze the provided information and return ONLY a JSON object with the industry field.

Available industries:
- software_engineering
- data_science
- web_development
- mobile_development
- devops
- cybersecurity
- ai_ml
- product_management
- business_analyst
- finance
- marketing
- general

Return format: {"industry": "industry_name"}"""
    
    user_prompt_parts = [f"Resume Data:\n{json.dumps(resume_data, indent=2)}"]
    if job_description:
        user_prompt_parts.append(f"\nJob Description:\n{job_description[:1000]}")
    
    try:
        result = _call_ollama_advanced(
            prompt="\n".join(user_prompt_parts),
            system_prompt=system_prompt,
            temperature=0.3,
            max_tokens=500
        )
        industry_str = result.get("industry", "general")
        return Industry(industry_str) if industry_str in [e.value for e in Industry] else Industry.GENERAL
    except Exception as e:
        logger.warning(f"Industry detection failed: {e}, defaulting to general")
        return Industry.GENERAL


def analyze_skill_gaps(
    resume_data: Dict[str, Any],
    target_role: str,
    job_description: Optional[str] = None
) -> Dict[str, Any]:
    """
    Analyze skill gaps and provide recommendations
    """
    system_prompt = """You are a career advisor and skills analyst specializing in tech careers.
Analyze the resume against the target role and job description to identify skill gaps.

Return JSON format:
{
  "missing_critical_skills": ["skill1", "skill2"],
  "recommended_skills": ["skill1", "skill2"],
  "skill_gap_score": 0-100,
  "recommendations": [
    "Specific actionable recommendation 1",
    "Specific actionable recommendation 2"
  ],
  "learning_resources": [
    {"skill": "skill_name", "resource_type": "course/certification/book", "description": "..."}
  ]
}"""
    
    user_prompt = f"""Target Role: {target_role}
Resume Data: {json.dumps(resume_data, indent=2)}
{"Job Description: " + job_description[:1500] if job_description else ""}

Analyze skill gaps and provide actionable recommendations."""
    
    try:
        return _call_ollama_advanced(
            prompt=user_prompt,
            system_prompt=system_prompt,
            temperature=0.5,
            max_tokens=3000
        )
    except Exception as e:
        logger.error(f"Skill gap analysis failed: {e}")
        return {
            "missing_critical_skills": [],
            "recommended_skills": [],
            "skill_gap_score": 50,
            "recommendations": ["Unable to analyze skill gaps. Please check Ollama configuration."],
            "learning_resources": []
        }


def optimize_resume_premium(
    resume_data: Dict[str, Any],
    target_role: Optional[str] = None,
    job_description: Optional[str] = None,
    optimization_level: OptimizationLevel = OptimizationLevel.ADVANCED,
    industry: Optional[Industry] = None
) -> Dict[str, Any]:
    """
    Premium resume optimization with industry-specific enhancements
    """
    # Load advanced optimization prompt
    prompt_path = os.path.join(
        os.path.dirname(__file__),
        "..",
        "prompts",
        "premiumResumeOptimize.prompt.txt"
    )
    
    try:
        with open(prompt_path, "r", encoding="utf-8") as f:
            base_system_prompt = f.read()
    except FileNotFoundError:
        # Fallback to basic prompt
        base_system_prompt = """You are a WORLD-CLASS resume writer with 20+ years of experience.
Transform this resume into an INTERVIEW-WINNING, ATS-OPTIMIZED masterpiece.
NEVER fabricate experiences. Only enhance language, add metrics, and optimize structure."""
    
    # Detect industry if not provided
    detected_industry = industry or detect_industry(resume_data, job_description)
    
    # Enhance system prompt with industry-specific guidance
    industry_guidance = f"""
INDUSTRY-SPECIFIC OPTIMIZATION:
Target Industry: {detected_industry.value}
"""
    
    if detected_industry == Industry.SOFTWARE_ENGINEERING:
        industry_guidance += """
- Emphasize: System design, algorithms, clean code, testing, architecture
- Keywords: scalable, distributed systems, design patterns, code quality, CI/CD
- Metrics: performance improvements, scalability achievements, code coverage
"""
    elif detected_industry == Industry.DATA_SCIENCE:
        industry_guidance += """
- Emphasize: Data analysis, ML models, statistical methods, data pipelines
- Keywords: predictive modeling, data visualization, feature engineering, ETL
- Metrics: model accuracy, data processing volume, insights generated
"""
    elif detected_industry == Industry.WEB_DEVELOPMENT:
        industry_guidance += """
- Emphasize: Frontend/backend skills, responsive design, API development
- Keywords: responsive, RESTful APIs, user experience, performance optimization
- Metrics: page load times, user engagement, API response times
"""
    
    system_prompt = base_system_prompt + "\n" + industry_guidance
    
    # Prepare user message
    user_prompt_parts = [
        f"Resume Data:\n{json.dumps(resume_data, indent=2)}"
    ]
    
    if target_role:
        user_prompt_parts.append(f"\nTarget Role: {target_role}")
    
    if job_description:
        job_desc = job_description[:3000] if len(job_description) > 3000 else job_description
        user_prompt_parts.append(f"\nJob Description:\n{job_desc}")
    
    user_prompt_parts.append(f"\nOptimization Level: {optimization_level.value}")
    user_prompt = "\n".join(user_prompt_parts)
    
    # Adjust temperature based on optimization level
    temperature_map = {
        OptimizationLevel.BASIC: 0.5,
        OptimizationLevel.STANDARD: 0.7,
        OptimizationLevel.ADVANCED: 0.8,
        OptimizationLevel.PREMIUM: 0.9
    }
    
    max_tokens_map = {
        OptimizationLevel.BASIC: 4000,
        OptimizationLevel.STANDARD: 6000,
        OptimizationLevel.ADVANCED: 8000,
        OptimizationLevel.PREMIUM: 10000
    }
    
    try:
        optimized_data = _call_ollama_advanced(
            prompt=user_prompt,
            system_prompt=system_prompt,
            temperature=temperature_map[optimization_level],
            max_tokens=max_tokens_map[optimization_level]
        )
        
        if "error" in optimized_data:
            logger.error(f"Ollama returned error: {optimized_data}")
            return resume_data
        
        # Add metadata
        optimized_data["_optimization_metadata"] = {
            "level": optimization_level.value,
            "industry": detected_industry.value,
            "optimized": True
        }
        
        return optimized_data
        
    except Exception as e:
        logger.error(f"Premium optimization failed: {str(e)}")
        return resume_data


def generate_career_insights(
    resume_data: Dict[str, Any],
    target_role: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generate career insights and path recommendations
    """
    system_prompt = """You are a career coach and industry expert.
Analyze the resume and provide career insights, growth paths, and recommendations.

Return JSON format:
{
  "career_level": "entry/junior/mid",
  "recommended_roles": ["role1", "role2"],
  "career_path": {
    "next_step": "role_name",
    "required_skills": ["skill1", "skill2"],
    "timeline": "X-Y months"
  },
  "strengths": ["strength1", "strength2"],
  "growth_areas": ["area1", "area2"],
  "market_value_estimate": "low/medium/high",
  "recommendations": ["recommendation1", "recommendation2"]
}"""
    
    user_prompt = f"""Resume Data: {json.dumps(resume_data, indent=2)}
{"Target Role: " + target_role if target_role else ""}

Provide comprehensive career insights and growth recommendations."""
    
    try:
        return _call_ollama_advanced(
            prompt=user_prompt,
            system_prompt=system_prompt,
            temperature=0.6,
            max_tokens=4000
        )
    except Exception as e:
        logger.error(f"Career insights generation failed: {e}")
        return {
            "career_level": "entry",
            "recommended_roles": [],
            "career_path": {},
            "strengths": [],
            "growth_areas": [],
            "market_value_estimate": "medium",
            "recommendations": ["Unable to generate insights. Please check Ollama configuration."]
        }


def extract_keywords_intelligent(
    job_description: str,
    resume_data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Intelligently extract and categorize keywords from job description
    """
    system_prompt = """You are an expert at keyword extraction and ATS optimization.
Extract and categorize keywords from the job description.

Return JSON format:
{
  "must_have_skills": ["skill1", "skill2"],
  "nice_to_have_skills": ["skill1", "skill2"],
  "technologies": ["tech1", "tech2"],
  "soft_skills": ["skill1", "skill2"],
  "certifications": ["cert1", "cert2"],
  "keywords_found_in_resume": ["keyword1"],
  "keywords_missing": ["keyword1", "keyword2"],
  "priority_keywords": ["keyword1", "keyword2"]
}"""
    
    user_prompt = f"Job Description:\n{job_description}"
    if resume_data:
        user_prompt += f"\n\nCurrent Resume Skills:\n{json.dumps(resume_data.get('skills', {}), indent=2)}"
    
    try:
        return _call_ollama_advanced(
            prompt=user_prompt,
            system_prompt=system_prompt,
            temperature=0.4,
            max_tokens=2000
        )
    except Exception as e:
        logger.error(f"Keyword extraction failed: {e}")
        return {
            "must_have_skills": [],
            "nice_to_have_skills": [],
            "technologies": [],
            "soft_skills": [],
            "certifications": [],
            "keywords_found_in_resume": [],
            "keywords_missing": [],
            "priority_keywords": []
        }


def analyze_project_relevance(
    project: Dict[str, Any],
    target_role: str,
    job_description: Optional[str] = None
) -> Dict[str, Any]:
    """
    Analyze if a project is relevant for a target role using AI
    Returns: project_title, relevant (bool), relevance_score (0-100), reason, suggestion
    """
    try:
        # Read the prompt template
        prompt_file = os.path.join(os.path.dirname(__file__), "..", "prompts", "projectRelevanceAnalysis.prompt.txt")
        system_prompt = "You are an expert career advisor analyzing project relevance for job applications. Be fair and realistic."
        
        if os.path.exists(prompt_file):
            with open(prompt_file, 'r', encoding='utf-8') as f:
                system_prompt = f.read()
        
        project_title = project.get('project_title', 'Untitled Project')
        project_description = project.get('description', '')
        technologies = project.get('technologies_used', [])
        contributions = project.get('contributions', [])
        
        user_prompt = f"""Target Role: {target_role}

Project to Analyze:
- Title: {project_title}
- Description: {project_description}
- Technologies: {', '.join(technologies) if technologies else 'Not specified'}
- Contributions: {', '.join(contributions[:3]) if contributions else 'Not specified'}

{f'Job Description (first 1000 chars): {job_description[:1000]}' if job_description else 'No job description provided'}

Analyze if this project is relevant for the {target_role} role. Be FAIR - a project is relevant if it demonstrates ANY useful skills or technologies for the role, even if not a perfect match.

Return JSON only (no markdown, no code blocks):
{{
  "project_title": "{project_title}",
  "relevant": true/false,
  "relevance_score": 0-100,
  "reason": "detailed explanation",
  "suggestion": "actionable advice"
}}"""

        result = _call_ollama_advanced(
            prompt=user_prompt,
            system_prompt=system_prompt,
            temperature=0.5,  # Lower temperature for more consistent analysis
            max_tokens=1000
        )
        
        # Ensure result is a dict (should be after _call_ollama_advanced)
        if not isinstance(result, dict):
            logger.warning(f"Unexpected result type: {type(result)}, defaulting to relevant")
            result = {}
        
        # Ensure all required fields exist with safe defaults (defaulting to relevant)
        analysis = {
            "project_title": project_title,
            "relevant": result.get("relevant", True),  # Default to relevant if unclear
            "relevance_score": result.get("relevance_score", 75),
            "reason": result.get("reason", "Project demonstrates relevant skills"),
            "suggestion": result.get("suggestion", "This project strengthens your resume")
        }
        
        # If score is >= 40, mark as relevant (lenient threshold)
        # This ensures AI-suggested projects (which typically score 80-100) are always marked relevant
        if analysis["relevance_score"] >= 40:
            analysis["relevant"] = True
        
        # Ensure boolean type
        analysis["relevant"] = bool(analysis["relevant"])
        
        return analysis
        
    except Exception as e:
        logger.error(f"Project relevance analysis failed: {e}")
        # Default to relevant if analysis fails (benefit of the doubt)
        return {
            "project_title": project.get('project_title', 'Untitled Project'),
            "relevant": True,
            "relevance_score": 70,
            "reason": "Unable to analyze - assumed relevant",
            "suggestion": "Review manually to ensure relevance"
        }


def rank_best_projects(
    projects: List[Dict[str, Any]],
    target_role: str,
    job_description: Optional[str] = None,
    top_n: int = 3
) -> Dict[str, Any]:
    """
    Use AI to rank and select the best projects for a resume
    Returns ranked projects with scores and recommendations
    """
    try:
        if not projects or len(projects) <= top_n:
            # No need to rank if we have fewer projects than needed
            return {
                "ranked_projects": [
                    {
                        "project_title": proj.get("project_title", "Untitled"),
                        "rank": idx + 1,
                        "relevance_score": 80,
                        "impact_score": 75,
                        "overall_score": 77,
                        "reason": "All projects included (within limit)",
                        "should_include": True
                    }
                    for idx, proj in enumerate(projects)
                ],
                "projects_to_keep": [proj.get("project_title", "") for proj in projects],
                "projects_to_hide": [],
                "summary": f"All {len(projects)} project(s) fit within the {top_n} project limit."
            }
        
        # Read the prompt template
        prompt_file = os.path.join(os.path.dirname(__file__), "..", "prompts", "rankBestProjects.prompt.txt")
        system_prompt = "You are an expert resume advisor helping select the best projects for a job application."
        
        if os.path.exists(prompt_file):
            with open(prompt_file, 'r', encoding='utf-8') as f:
                system_prompt = f.read()
        
        # Format projects for analysis
        projects_text = "\n\n".join([
            f"Project {idx + 1}: {proj.get('project_title', 'Untitled')}\n"
            f"Description: {proj.get('description', 'No description')}\n"
            f"Technologies: {', '.join(proj.get('technologies_used', []))}\n"
            f"Contributions: {'; '.join(proj.get('contributions', [])[:3])}"
            for idx, proj in enumerate(projects)
        ])
        
        user_prompt = f"""Target Role: {target_role}

{f'Job Description (first 2000 chars): {job_description[:2000]}' if job_description else 'No job description provided'}

Projects to Rank (Total: {len(projects)}, Select Top {top_n}):
{projects_text}

Analyze each project and rank them by relevance and impact for the {target_role} role. Select the top {top_n} projects that best demonstrate skills needed for this role.

Return JSON only (no markdown, no code blocks):
{{
  "ranked_projects": [
    {{
      "project_title": "exact title",
      "rank": 1,
      "relevance_score": 0-100,
      "impact_score": 0-100,
      "overall_score": 0-100,
      "reason": "why selected",
      "should_include": true/false
    }}
  ],
  "projects_to_keep": ["title1", "title2"],
  "projects_to_hide": ["title3", "title4"],
  "summary": "selection strategy"
}}"""

        result = _call_ollama_advanced(
            prompt=user_prompt,
            system_prompt=system_prompt.format(
                target_role=target_role,
                job_description=job_description[:1000] if job_description else "Not provided",
                total_projects=len(projects),
                top_n=top_n
            ),
            temperature=0.6,
            max_tokens=3000
        )
        
        # Ensure result is a dict
        if not isinstance(result, dict):
            logger.warning(f"Unexpected result type for project ranking: {type(result)}")
            result = {}
        
        # Validate and structure the response
        ranked_projects = result.get("ranked_projects", [])
        projects_to_keep = result.get("projects_to_keep", [])
        projects_to_hide = result.get("projects_to_hide", [])
        summary = result.get("summary", "Selected top projects based on relevance and impact")
        
        # Fallback: if AI didn't provide proper ranking, do basic ranking
        if not ranked_projects or len(ranked_projects) == 0:
            # Simple fallback: use first top_n projects
            ranked_projects = [
                {
                    "project_title": proj.get("project_title", f"Project {idx + 1}"),
                    "rank": idx + 1,
                    "relevance_score": 75,
                    "impact_score": 70,
                    "overall_score": 72,
                    "reason": f"Selected as one of the top {top_n} projects",
                    "should_include": idx < top_n
                }
                for idx, proj in enumerate(projects[:top_n])
            ]
            projects_to_keep = [proj.get("project_title", "") for proj in projects[:top_n]]
            projects_to_hide = [proj.get("project_title", "") for proj in projects[top_n:]]
        
        return {
            "ranked_projects": ranked_projects,
            "projects_to_keep": projects_to_keep,
            "projects_to_hide": projects_to_hide,
            "summary": summary
        }
        
    except Exception as e:
        logger.error(f"Project ranking failed: {e}")
        # Fallback: return first top_n projects
        return {
            "ranked_projects": [
                {
                    "project_title": proj.get("project_title", f"Project {idx + 1}"),
                    "rank": idx + 1,
                    "relevance_score": 70,
                    "impact_score": 65,
                    "overall_score": 67,
                    "reason": "Selected due to ranking analysis unavailability",
                    "should_include": idx < top_n
                }
                for idx, proj in enumerate(projects[:top_n])
            ],
            "projects_to_keep": [proj.get("project_title", "") for proj in projects[:top_n]],
            "projects_to_hide": [proj.get("project_title", "") for proj in projects[top_n:]],
            "summary": f"Selected top {top_n} projects (AI ranking unavailable)"
        }


# Simple in-memory cache for project descriptions (keyed by content hash)
_project_cache: Dict[str, Dict[str, Any]] = {}
_cache_max_size = 100  # Limit cache size

def _get_cache_key(project: Dict[str, Any], target_role: Optional[str]) -> str:
    """Generate cache key for a project"""
    key_data = {
        'title': project.get('project_title') or project.get('title', ''),
        'desc': project.get('description', ''),
        'tech': sorted(project.get('technologies_used', [])),
        'role': target_role or ''
    }
    key_str = json.dumps(key_data, sort_keys=True)
    return hashlib.md5(key_str.encode()).hexdigest()

def rewrite_project_descriptions(
    projects: List[Dict[str, Any]],
    target_role: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Rewrite project descriptions to be consistent, professional, and impactful (3 sentences)
    Uses parallel processing and caching for maximum speed
    """
    try:
        if not projects:
            return []
        
        # Read the prompt template once (cached by Python's import system)
        prompt_file = os.path.join(os.path.dirname(__file__), "..", "prompts", "rewriteProjectDescription.prompt.txt")
        system_prompt = "You are an expert resume writer creating consistent, professional project descriptions."
        
        if os.path.exists(prompt_file):
            with open(prompt_file, 'r', encoding='utf-8') as f:
                system_prompt = f.read()
        
        # Check cache first - HUGE speed boost for repeated requests
        cached_results = {}
        projects_to_process = []
        cache_order = []
        
        for project in projects:
            cache_key = _get_cache_key(project, target_role)
            cache_order.append(cache_key)
            if cache_key in _project_cache:
                cached_results[cache_key] = _project_cache[cache_key]
            else:
                projects_to_process.append((project, cache_key))
        
        # If all cached, return immediately
        if not projects_to_process:
            return [cached_results[key] for key in cache_order]
        
        # Process remaining projects in parallel for speed
        def rewrite_single_project(project_data: Tuple[Dict[str, Any], str]) -> Tuple[str, Dict[str, Any]]:
            """Rewrite a single project with timeout protection"""
            project, cache_key = project_data
            try:
                project_title = project.get('project_title') or project.get('title', 'Untitled Project')
                current_description = project.get('description', '')
                technologies = project.get('technologies_used', [])
                contributions = project.get('contributions', [])
                duration_start = project.get('duration_start')
                duration_end = project.get('duration_end')
                
                user_prompt = f"""Rewrite this project description to be consistent, professional, and EXACTLY 3 sentences (not more, not less).

Project Title: {project_title}
Current Description: {current_description}
Technologies: {', '.join(technologies) if technologies else 'Not specified'}
Key Contributions: {'; '.join(contributions[:3]) if contributions else 'Not specified'}
{f'Duration: {duration_start} to {duration_end}' if duration_start else 'No duration specified'}

{f'Target Role: {target_role}' if target_role else ''}

Create a professional description with EXACTLY 3 sentences (count carefully - this is critical):
1. Sentence 1: Explains what the project does and its purpose
2. Sentence 2: Highlights technologies used and key features/functionality
3. Sentence 3: Mentions quantifiable impact, scale, or notable achievements (MANDATORY - always include something impactful)

CRITICAL: The description must have exactly 3 sentences separated by periods. No more, no less.

Return JSON only:
{{
  "project_title": "{project_title}",
  "description": "EXACTLY 3 sentences separated by periods",
  "duration_start": "{duration_start or ''}",
  "duration_end": "{duration_end or ''}"
}}"""

                # Use best available model for better quality
                best_model = _find_best_available_model()
                
                # Use faster model for speed (prioritize speed over quality for this use case)
                # Try smaller models first for faster response
                fast_models = ['llama3.2:3b', 'llama3.2:1b', 'mistral:7b', 'llama3.1:8b']
                model_to_use = best_model
                try:
                    response = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=2)
                    if response.status_code == 200:
                        available_names = [m.get("name", "") for m in response.json().get("models", [])]
                        for model_name in fast_models:
                            if model_name in available_names:
                                model_to_use = model_name
                                break
                except:
                    pass  # Use best_model if check fails
                
                result = _call_ollama_advanced(
                    prompt=user_prompt,
                    system_prompt=system_prompt,
                    temperature=0.5,  # Lower temperature for more consistent, professional output
                    max_tokens=400,   # Reduced for faster generation (3 sentences don't need 600 tokens)
                    model=model_to_use  # Use fastest available model
                )
                
                # Ensure result is a dict
                if not isinstance(result, dict):
                    logger.warning(f"Unexpected result type for project rewrite: {type(result)}")
                    result = {}
                
                # Extract and validate description
                new_description = result.get("description", current_description)
                
                # Validate and enforce exactly 3 sentences
                if new_description:
                    # Split by periods and clean up
                    # Clean bullet points and list formatting
                    new_description = new_description.replace('•', '').replace('- ', '').replace('* ', '')
                    new_description = new_description.replace('\n', ' ').replace('\r', ' ')
                    # Remove multiple spaces
                    new_description = ' '.join(new_description.split())
                    
                    sentences = [s.strip() for s in new_description.replace('!', '.').replace('?', '.').split('.') if s.strip()]
                    
                    # Remove empty sentences and filter out bullet-like patterns
                    sentences = [s for s in sentences if len(s) > 10 and not s.strip().startswith(('-', '•', '*', '1.', '2.', '3.'))]  # Minimum 10 chars per sentence
                    
                    if len(sentences) != 3:
                        logger.warning(f"Project {project_title}: Expected 3 sentences, got {len(sentences)}. Fixing...")
                        
                        # Fix sentence count
                        if len(sentences) < 3:
                            # Add generic impactful sentences if needed
                            while len(sentences) < 3:
                                if len(sentences) == 0:
                                    sentences.append(f"Developed {project_title} to address critical business needs and deliver measurable value.")
                                elif len(sentences) == 1:
                                    sentences.append(f"Implemented using modern technologies and best practices to ensure scalability and performance.")
                                else:
                                    sentences.append(f"Achieved significant impact with measurable improvements in efficiency and user satisfaction.")
                        elif len(sentences) > 3:
                            # Combine extra sentences intelligently
                            # Keep first 2 sentences, combine rest into third
                            first_two = sentences[:2]
                            remaining = '. '.join(sentences[2:])
                            sentences = first_two + [remaining]
                        
                        # Ensure we have exactly 3
                        sentences = sentences[:3]
                        while len(sentences) < 3:
                            sentences.append("Delivered measurable results and improved overall system performance.")
                        
                        new_description = '. '.join(sentences) + '.'
                    
                    # Final validation - ensure exactly 3 sentences
                    final_sentences = [s.strip() for s in new_description.split('.') if s.strip() and len(s.strip()) > 10]
                    if len(final_sentences) != 3:
                        logger.error(f"Project {project_title}: Still not 3 sentences after fix ({len(final_sentences)}). Using fallback.")
                        # Fallback: create 3 sentences from original description
                        if current_description:
                            words = current_description.split()[:50]  # First 50 words
                            chunk_size = len(words) // 3
                            new_description = '. '.join([
                                ' '.join(words[:chunk_size]) + '.',
                                ' '.join(words[chunk_size:chunk_size*2]) + '.',
                                ' '.join(words[chunk_size*2:]) + ' Achieved significant impact and improved system performance.'
                            ])
                        else:
                            new_description = f"Developed {project_title} to address business requirements. Implemented using modern technologies and best practices. Achieved significant impact with measurable improvements in performance and user satisfaction."
                
                # Final cleanup: ensure no bullet points or list formatting
                final_description = (new_description or current_description or '').strip()
                # Remove any remaining bullet points or list markers (Python string operations)
                final_description = final_description.replace('•', '').replace('- ', '').replace('* ', '')
                final_description = final_description.replace('\n', ' ').replace('\r', ' ')
                # Remove multiple spaces
                final_description = ' '.join(final_description.split()).strip()
                
                rewritten_project = {
                    **project,  # Keep all original fields
                    "description": final_description,
                    "duration_start": result.get("duration_start") or duration_start,
                    "duration_end": result.get("duration_end") or duration_end,
                }
                
                # Cache the result
                if len(_project_cache) >= _cache_max_size:
                    # Remove oldest entry (simple FIFO)
                    oldest_key = next(iter(_project_cache))
                    del _project_cache[oldest_key]
                _project_cache[cache_key] = rewritten_project
                
                return (cache_key, rewritten_project)
                
            except Exception as e:
                logger.warning(f"Failed to rewrite project {project.get('project_title', 'unknown')}: {e}")
                # Keep original project if rewrite fails, but try to ensure 3 sentences
                fallback_project = {**project}
                if project.get('description'):
                    desc = project.get('description', '')
                    sentences = [s.strip() for s in desc.replace('!', '.').replace('?', '.').split('.') if s.strip() and len(s.strip()) > 10]
                    if len(sentences) != 3 and len(sentences) > 0:
                        # Quick fix: ensure 3 sentences
                        while len(sentences) < 3:
                            sentences.append("Achieved significant impact and improved system performance.")
                        if len(sentences) > 3:
                            sentences = sentences[:2] + ['. '.join(sentences[2:])]
                        fallback_project['description'] = '. '.join(sentences[:3]) + '.'
                return (cache_key, fallback_project)
        
        # Process projects in parallel with timeout
        processed_results = {}
        max_workers = min(4, len(projects_to_process))  # Limit concurrent requests
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all tasks
            future_to_key = {
                executor.submit(rewrite_single_project, project_data): project_data[1]
                for project_data in projects_to_process
            }
            
            # Collect results with timeout
            for future in as_completed(future_to_key, timeout=60):  # 60 second overall timeout
                try:
                    cache_key, rewritten_project = future.result(timeout=15)  # 15 sec per project
                    processed_results[cache_key] = rewritten_project
                except FuturesTimeoutError:
                    cache_key = future_to_key[future]
                    logger.warning(f"Project rewrite timed out for {cache_key}, using original")
                    # Find original project
                    original_project = next((p[0] for p in projects_to_process if p[1] == cache_key), None)
                    if original_project:
                        processed_results[cache_key] = original_project
                except Exception as e:
                    cache_key = future_to_key[future]
                    logger.error(f"Error processing project {cache_key}: {e}")
                    original_project = next((p[0] for p in projects_to_process if p[1] == cache_key), None)
                    if original_project:
                        processed_results[cache_key] = original_project
        
        # Combine cached and processed results in original order
        rewritten_projects = []
        for key in cache_order:
            if key in cached_results:
                rewritten_projects.append(cached_results[key])
            elif key in processed_results:
                rewritten_projects.append(processed_results[key])
            else:
                # Fallback: find original project
                original = next((p[0] for p in projects_to_process if p[1] == key), None)
                if original:
                    rewritten_projects.append(original)
        
        logger.info(f"Completed rewriting {len(rewritten_projects)}/{len(projects)} projects (cached: {len(cached_results)}, processed: {len(processed_results)})")
        return rewritten_projects
        
    except Exception as e:
        logger.error(f"Project description rewriting failed: {e}")
        # Return original projects if rewriting fails
        return projects


def check_ollama_availability() -> Tuple[bool, Optional[str]]:
    """
    Check Ollama availability and return (is_available, model_name)
    """
    try:
        response = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
        if response.status_code == 200:
            models = response.json().get("models", [])
            if models:
                best_model = _find_best_available_model()
                return True, best_model
            return False, None
        return False, None
    except Exception as e:
        logger.debug(f"Ollama not available: {str(e)}")
        return False, None

