"""
AI Mock Interview API endpoints
100% FREE - Uses Ollama for LLM and Whisper for STT
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any, List
from pydantic import BaseModel
from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.user import User
from app.services.advanced_ai_service import check_ollama_availability, _call_ollama_advanced
import logging
import base64
import io

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/mock-interview-ai", tags=["mock-interview-ai"])


class InterviewStartRequest(BaseModel):
    """Request to start AI mock interview"""
    job_role: str
    company_name: Optional[str] = None
    job_description: Optional[str] = None
    experience_level: Optional[str] = "fresher"  # fresher, 1-2 years, 3-5 years
    resume_data: Optional[Dict[str, Any]] = None


class InterviewQuestionResponse(BaseModel):
    """Response with AI-generated question"""
    question: str
    question_type: str  # technical, behavioral, scenario
    question_number: int
    total_questions: int


class AnswerAnalysisRequest(BaseModel):
    """Request to analyze user's answer"""
    question: str
    answer: str
    question_number: int
    resume_data: Optional[Dict[str, Any]] = None
    job_description: Optional[str] = None


class AnswerAnalysisResponse(BaseModel):
    """Response with answer analysis"""
    score: float  # 0-5
    strengths: List[str]
    weaknesses: List[str]
    missing_points: List[str]
    improved_answer: str
    communication_tips: List[str]
    next_question: Optional[str] = None


class InterviewFinishRequest(BaseModel):
    """Request to finish interview and get final report"""
    all_answers: List[Dict[str, Any]]  # List of {question, answer, analysis}
    resume_data: Optional[Dict[str, Any]] = None
    job_description: Optional[str] = None


class InterviewFinishResponse(BaseModel):
    """Final interview report"""
    overall_score: float  # 0-10
    technical_readiness: str  # Excellent, Good, Average, Needs Improvement
    communication_rating: str  # Excellent, Good, Average, Needs Improvement
    strong_areas: List[str]
    weak_areas: List[str]
    improvement_roadmap: List[Dict[str, str]]  # [{day: "Day 1", tasks: "..."}]


# System prompt for AI interviewer
INTERVIEWER_SYSTEM_PROMPT = """You are a professional interviewer with 15+ years of experience conducting technical and behavioral interviews.

Your role:
- Conduct a realistic mock interview
- Ask one question at a time
- Start with easy questions, gradually increase difficulty
- Mix technical, behavioral, and scenario-based questions
- Maintain professional interview tone
- Simulate real interview pressure
- Do NOT give answers - only ask questions

Interview Guidelines:
1. For freshers: Focus on fundamentals, basic projects, learning attitude
2. For 1-2 years: Focus on experience, problem-solving, growth
3. For 3-5 years: Focus on architecture, leadership, complex scenarios

Question Types:
- Technical: Language basics, algorithms, system design, tools
- Behavioral: STAR method, teamwork, problem-solving
- Scenario-based: Real-world problems, edge cases

Keep questions relevant to the job role and candidate's experience level."""


ANSWER_ANALYSIS_PROMPT = """You are an expert interview feedback provider. Analyze the candidate's answer to an interview question.

Question: {question}

Candidate Answer: {answer}

Job Role: {job_role}
Experience Level: {experience_level}

Evaluate based on:
1. Relevance: Does it answer the question?
2. Correctness: Is the information accurate?
3. Clarity: Is it well-structured and easy to understand?
4. Depth: Does it show sufficient knowledge/experience?
5. Communication: Is it professional and confident?

Return ONLY valid JSON (no markdown, no code blocks) with this structure:
{{
    "score": 0.0-5.0,
    "strengths": ["strength1", "strength2"],
    "weaknesses": ["weakness1", "weakness2"],
    "missing_points": ["missing1", "missing2"],
    "improved_answer": "A better way to answer this question would be...",
    "communication_tips": ["tip1", "tip2"]
}}"""


FINAL_REPORT_PROMPT = """You are an expert career counselor. Analyze the complete mock interview performance.

Job Role: {job_role}
Experience Level: {experience_level}

Interview Answers and Analysis:
{all_analyses}

Generate a comprehensive final report with:
1. Overall Score (0-10)
2. Technical Readiness (Excellent/Good/Average/Needs Improvement)
3. Communication Rating (Excellent/Good/Average/Needs Improvement)
4. Strong Areas (list)
5. Weak Areas (list)
6. 7-Day Improvement Roadmap (daily tasks)

Return ONLY valid JSON (no markdown, no code blocks):
{{
    "overall_score": 0.0-10.0,
    "technical_readiness": "Excellent/Good/Average/Needs Improvement",
    "communication_rating": "Excellent/Good/Average/Needs Improvement",
    "strong_areas": ["area1", "area2"],
    "weak_areas": ["area1", "area2"],
    "improvement_roadmap": [
        {{"day": "Day 1", "tasks": "Task description"}},
        {{"day": "Day 2", "tasks": "Task description"}}
    ]
}}"""


@router.post("/start")
async def start_interview(
    request: InterviewStartRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Initialize AI mock interview - Generate first question"""
    try:
        # Check Ollama availability
        if not check_ollama_availability():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Ollama is not running. Please install and start Ollama:\n1. Install: https://ollama.ai\n2. Start: ollama serve (or it starts automatically)\n3. Pull model: ollama pull llama3.2:3b\nThen refresh this page."
            )
        
        # Generate first question based on role and experience
        resume_context = ""
        if request.resume_data:
            resume_context = f"\nResume Summary: {str(request.resume_data)[:500]}"
        
        prompt = f"""Generate the FIRST interview question for a {request.experience_level} candidate applying for {request.job_role} role.

{resume_context}

Job Description: {request.job_description or 'General role'}

Generate ONE question that:
- Is appropriate for the first question (warm-up, introduction, or basic technical)
- Matches the experience level ({request.experience_level})
- Is relevant to {request.job_role}

Return ONLY valid JSON (no markdown, no code blocks):
{{
    "question": "The actual question text",
    "question_type": "technical/behavioral/scenario",
    "question_number": 1,
    "total_questions": 8
}}"""
        
        response = _call_ollama_advanced(
            prompt=prompt,
            system_prompt=INTERVIEWER_SYSTEM_PROMPT,
            model="llama3.2:3b"
        )
        
        return response
    except Exception as e:
        logger.error(f"Error starting interview: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start interview: {str(e)}"
        )


@router.post("/generate-question")
async def generate_next_question(
    question_number: int = Form(...),
    previous_answers: str = Form(...),  # JSON string of previous Q&A
    job_role: str = Form(...),
    experience_level: str = Form("fresher"),
    resume_data: Optional[str] = Form(None),  # JSON string
    job_description: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate next interview question based on previous answers"""
    try:
        if not check_ollama_availability():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="AI service (Ollama) is not available"
            )
        
        prompt = f"""Generate question #{question_number + 1} for a {experience_level} candidate applying for {job_role}.

Previous questions and answers: {previous_answers[:1000]}

Generate a NEW question that:
- Progresses in difficulty (question {question_number + 1} should be harder than previous)
- Is different from previous questions
- Matches experience level ({experience_level})
- Is relevant to {job_role}

Return ONLY valid JSON:
{{
    "question": "The question text",
    "question_type": "technical/behavioral/scenario",
    "question_number": {question_number + 1},
    "total_questions": 8
}}"""
        
        response = _call_ollama_advanced(
            prompt=prompt,
            system_prompt=INTERVIEWER_SYSTEM_PROMPT,
            model="llama3.2:3b"
        )
        
        return response
    except Exception as e:
        logger.error(f"Error generating question: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate question: {str(e)}"
        )


@router.post("/analyze-answer", response_model=AnswerAnalysisResponse)
async def analyze_answer(
    request: AnswerAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Analyze user's answer and provide feedback"""
    try:
        if not check_ollama_availability():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="AI service (Ollama) is not available"
            )
        
        # Extract job role and experience from resume or use defaults
        job_role = "Software Developer"
        experience_level = "fresher"
        if request.resume_data:
            job_role = request.resume_data.get("target_role", job_role)
            experience_level = request.resume_data.get("experience_level", experience_level)
        
        prompt = ANSWER_ANALYSIS_PROMPT.format(
            question=request.question,
            answer=request.answer,
            job_role=job_role,
            experience_level=experience_level
        )
        
        response = _call_ollama_advanced(
            prompt=prompt,
            system_prompt="You are an expert interview feedback provider. Be constructive, honest, and encouraging.",
            model="llama3.2:3b"
        )
        
        # Parse response
        if isinstance(response, dict):
            return AnswerAnalysisResponse(**response)
        else:
            raise ValueError("Invalid response format")
            
    except Exception as e:
        logger.error(f"Error analyzing answer: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze answer: {str(e)}"
        )


@router.post("/finish", response_model=InterviewFinishResponse)
async def finish_interview(
    request: InterviewFinishRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate final interview report"""
    try:
        if not check_ollama_availability():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="AI service (Ollama) is not available"
            )
        
        # Extract job role and experience
        job_role = "Software Developer"
        experience_level = "fresher"
        if request.resume_data:
            job_role = request.resume_data.get("target_role", job_role)
            experience_level = request.resume_data.get("experience_level", experience_level)
        
        # Format all analyses
        analyses_text = "\n".join([
            f"Q{i+1}: {ans.get('question', '')}\nAnswer: {ans.get('answer', '')}\nScore: {ans.get('analysis', {}).get('score', 0)}/5\n"
            for i, ans in enumerate(request.all_answers)
        ])
        
        prompt = FINAL_REPORT_PROMPT.format(
            job_role=job_role,
            experience_level=experience_level,
            all_analyses=analyses_text
        )
        
        response = _call_ollama_advanced(
            prompt=prompt,
            system_prompt="You are an expert career counselor. Provide actionable, encouraging feedback.",
            model="llama3.2:3b"
        )
        
        if isinstance(response, dict):
            return InterviewFinishResponse(**response)
        else:
            raise ValueError("Invalid response format")
            
    except Exception as e:
        logger.error(f"Error finishing interview: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate final report: {str(e)}"
        )


@router.post("/transcribe-audio")
async def transcribe_audio(
    audio_file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Transcribe audio using Whisper (requires Whisper API or local installation)"""
    try:
        # For now, return a placeholder
        # In production, integrate with Whisper API or local Whisper
        # You can use openai-whisper or faster-whisper (free, local)
        
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Audio transcription will be handled on the frontend using Web Speech API for now. Whisper integration coming soon."
        )
        
    except Exception as e:
        logger.error(f"Error transcribing audio: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to transcribe audio: {str(e)}"
        )


