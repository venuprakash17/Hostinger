"""
AI Mock Interview API endpoints
100% FREE - Uses Ollama for LLM and Whisper for STT
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any, List, Tuple
from pydantic import BaseModel
from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.user import User
from app.services.advanced_ai_service import check_ollama_availability, _call_ollama_advanced
from app.services.interview_questions_service import get_company_interview_questions
import logging
import base64
import io

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/mock-interview-ai", tags=["mock-interview-ai"])


@router.get("/health")
async def health_check():
    """Check if AI service (Ollama) is available"""
    try:
        ollama_available, model_name = check_ollama_availability()
        return {
            "status": "healthy" if ollama_available else "unavailable",
            "ollama_available": ollama_available,
            "model": model_name,
            "message": "Ollama is ready" if ollama_available else "Ollama is not running. Please install and start Ollama."
        }
    except Exception as e:
        logger.error(f"Health check error: {str(e)}")
        return {
            "status": "error",
            "ollama_available": False,
            "model": None,
            "message": f"Error checking Ollama: {str(e)}"
        }


class InterviewStartRequest(BaseModel):
    """Request to start AI mock interview"""
    job_role: str
    company_name: Optional[str] = None
    job_description: Optional[str] = None
    experience_level: Optional[str] = "fresher"  # fresher, 1-2 years, 3-5 years
    interview_round: Optional[str] = "technical"  # hr, technical, managerial
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
    best_answer: str  # Ideal/best answer for this question
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
INTERVIEWER_SYSTEM_PROMPT = """You are a senior technical interviewer with 15+ years of experience at top tech companies (Google, Microsoft, Amazon, TCS, Infosys, Wipro, etc.).

Your role:
- Conduct a realistic, professional mock interview
- Ask one question at a time
- Start with easy questions, gradually increase difficulty
- Mix technical, behavioral, and scenario-based questions
- Maintain professional but friendly interview tone
- Simulate real interview pressure and expectations
- Do NOT give answers - only ask questions
- Ask follow-up questions based on candidate's answers (when appropriate)

Interview Guidelines:
1. For freshers: Focus on fundamentals, basic projects, learning attitude, problem-solving approach
2. For 1-2 years: Focus on experience, problem-solving, growth, technical depth
3. For 3-5 years: Focus on architecture, leadership, complex scenarios, system design

Question Types:
- Technical: Language basics, algorithms, data structures, system design, tools, frameworks
- Behavioral: STAR method, teamwork, problem-solving, leadership, conflict resolution
- Scenario-based: Real-world problems, edge cases, trade-offs
- Company-specific: Questions about company culture, products, values (when company name provided)

Keep questions relevant to the job role and candidate's experience level. Make them realistic and commonly asked in actual interviews."""


ANSWER_ANALYSIS_PROMPT = """You are an expert interview feedback provider with 20+ years of experience. Analyze the candidate's answer to an interview question and provide detailed, constructive feedback.

Question: {question}
Question Type: {question_type}
Candidate Answer: {answer}
Job Role: {job_role}
Experience Level: {experience_level}

{special_instructions}

CRITICAL: You must evaluate based on these criteria:
1. Relevance: Does it directly answer the question asked?
2. Correctness: Is the information accurate and truthful?
3. Clarity: Is it well-structured, easy to understand, and logically organized?
4. Depth: Does it show sufficient knowledge/experience for the role and experience level?
5. Communication: Is it professional, confident, and engaging?
6. Completeness: Does it cover all important aspects of the question?

SCORING GUIDELINES:
- 4.5-5.0: Excellent - Comprehensive, well-structured, shows strong expertise
- 3.5-4.4: Good - Covers main points, minor improvements needed
- 2.5-3.4: Average - Basic answer, missing some key points
- 1.5-2.4: Below Average - Incomplete or unclear
- 0.0-1.4: Poor - Does not answer the question or contains major issues

Return ONLY valid JSON (no markdown, no code blocks, no extra text) with this EXACT structure:
{{
    "score": 0.0-5.0,
    "strengths": ["specific strength 1", "specific strength 2", "specific strength 3"],
    "weaknesses": ["specific weakness 1", "specific weakness 2"],
    "missing_points": ["missing point 1", "missing point 2"],
    "improved_answer": "A better way to answer this question would be: [provide a detailed improved version of their answer, 100-200 words]",
    "best_answer": "The ideal/best answer for this question. Provide a complete, well-structured answer (200-350 words) that demonstrates excellent understanding, includes all key points, shows professionalism, and would impress an interviewer. This should be what a top candidate would say.",
    "communication_tips": ["specific tip 1", "specific tip 2", "specific tip 3"]
}}

IMPORTANT: 
- All fields are REQUIRED
- strengths, weaknesses, missing_points, and communication_tips must be arrays with at least 2 items each
- improved_answer and best_answer must be substantial (at least 100 words each)
- score must be a number between 0.0 and 5.0"""


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
        ollama_available, model_name = check_ollama_availability()
        if not ollama_available:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Ollama is not running. Please install and start Ollama:\n1. Install: https://ollama.ai\n2. Start: ollama serve (or it starts automatically)\n3. Pull model: ollama pull llama3.2:3b\nThen refresh this page."
            )
        
        # Get company-specific interview questions based on round
        company_name = request.company_name or "the company"
        interview_round = request.interview_round or "technical"
        all_questions = get_company_interview_questions(
            company_name=company_name,
            role=request.job_role,
            experience_level=request.experience_level,
            interview_round=interview_round
        )
        
        if not all_questions or len(all_questions) == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate interview questions"
            )
        
        # Return first question and store all questions in session
        first_question = all_questions[0]
        
        # Ensure first_question is a dict
        if not isinstance(first_question, dict):
            logger.error(f"First question is not a dict: {type(first_question)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Invalid question format received"
            )
        
        # Validate all questions are dicts
        validated_questions = []
        for q in all_questions:
            if isinstance(q, dict):
                validated_questions.append(q)
            elif isinstance(q, str):
                # Convert string to dict
                validated_questions.append({"question": q, "type": "general", "category": "general"})
            else:
                logger.warning(f"Skipping invalid question format: {type(q)}")
        
        if not validated_questions:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No valid questions generated"
            )
        
        # Store all questions in response for frontend to use
        response_data = {
            "question": first_question.get("question", "Tell me about yourself"),
            "question_type": first_question.get("type", "introduction"),
            "question_number": first_question.get("question_number", 1),
            "total_questions": first_question.get("total_questions", len(validated_questions)),
            "all_questions": validated_questions  # Send validated questions to frontend
        }
        
        logger.info(f"Generated {len(all_questions)} questions for {company_name} - {request.job_role}")
        return response_data
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
    interview_round: str = Form("technical"),
    company_name: Optional[str] = Form(None),
    resume_data: Optional[str] = Form(None),  # JSON string
    job_description: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate next interview question - uses pre-generated questions if available"""
    try:
        ollama_available, model_name = check_ollama_availability()
        if not ollama_available:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="AI service (Ollama) is not available"
            )
        
        # Try to get company-specific questions
        company = company_name or "the company"
        all_questions = get_company_interview_questions(
            company_name=company,
            role=job_role,
            experience_level=experience_level,
            interview_round=interview_round
        )
        
        if all_questions and len(all_questions) > question_number:
            # Return the next question from pre-generated list
            next_q = all_questions[question_number]
            
            # Ensure next_q is a dict
            if not isinstance(next_q, dict):
                logger.error(f"Question at index {question_number} is not a dict: {type(next_q)}")
                # Convert to dict if it's a string
                if isinstance(next_q, str):
                    next_q = {"question": next_q, "type": "general", "category": "general"}
                else:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Invalid question format"
                    )
            
            return {
                "question": next_q.get("question", ""),
                "question_type": next_q.get("type", "general"),
                "question_number": next_q.get("question_number", question_number + 1),
                "total_questions": next_q.get("total_questions", len(all_questions))
            }
        
        # Fallback: Generate question dynamically
        prompt = f"""Generate question #{question_number + 1} for a {experience_level} candidate applying for {job_role} at {company}.

Previous questions and answers: {previous_answers[:1000]}

Generate a NEW question that:
- Progresses in difficulty (question {question_number + 1} should be harder than previous)
- Is different from previous questions
- Matches experience level ({experience_level})
- Is relevant to {job_role} and {company}

Return ONLY valid JSON:
{{
    "question": "The question text",
    "question_type": "technical/behavioral/scenario",
    "question_number": {question_number + 1},
    "total_questions": 12
}}"""
        
        model_to_use = model_name or "llama3.2:3b"
        response = _call_ollama_advanced(
            prompt=prompt,
            system_prompt=INTERVIEWER_SYSTEM_PROMPT,
            model=model_to_use
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
        ollama_available, model_name = check_ollama_availability()
        if not ollama_available:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="AI service (Ollama) is not available. Please install and start Ollama:\n1. Install: https://ollama.ai\n2. Start: ollama serve\n3. Pull model: ollama pull llama3.2:3b"
            )
        
        # Extract job role and experience from resume or use defaults
        job_role = "Software Developer"
        experience_level = "fresher"
        if request.resume_data:
            if isinstance(request.resume_data, dict):
                job_role = request.resume_data.get("target_role") or request.resume_data.get("job_role", job_role)
                experience_level = request.resume_data.get("experience_level", experience_level)
        
        # Determine question type for special handling
        question_type = "general"
        question_lower = request.question.lower()
        if "tell me about yourself" in question_lower or "introduce yourself" in question_lower:
            question_type = "introduction"
            special_instructions = """SPECIAL FOCUS FOR "TELL ME ABOUT YOURSELF":
- Check if answer includes: name, education, relevant experience, key skills, achievements, career goals
- Should be 2-3 minutes when spoken (about 150-250 words)
- Should highlight most relevant experience for the role
- Should show enthusiasm and alignment with the role
- Should be concise but comprehensive
- Should end with why they're interested in this role/company"""
        elif "do you have any questions" in question_lower or "questions for us" in question_lower:
            question_type = "closing"
            special_instructions = """SPECIAL FOCUS FOR "DO YOU HAVE ANY QUESTIONS FOR US":
- This shows interest and preparation
- Good questions: about team, projects, growth opportunities, company culture, role expectations
- Bad signs: asking about salary/benefits first, no questions at all, questions easily found on website
- Should show genuine interest and research about the company
- Should demonstrate understanding of the role
- Should be professional and thoughtful"""
        else:
            special_instructions = "Provide standard interview feedback."
        
        prompt = ANSWER_ANALYSIS_PROMPT.format(
            question=request.question,
            question_type=question_type,
            answer=request.answer,
            job_role=job_role,
            experience_level=experience_level,
            special_instructions=special_instructions
        )
        
        # Use the available model or default
        model_to_use = model_name or "llama3.2:3b"
        
        response = _call_ollama_advanced(
            prompt=prompt,
            system_prompt="You are an expert interview feedback provider. Be constructive, honest, and encouraging. Always return valid JSON with all required fields.",
            model=model_to_use
        )
        
        # Parse response with better error handling
        if isinstance(response, dict):
            # Ensure all required fields are present with defaults
            if "score" not in response:
                response["score"] = 3.0  # Default score
            if "strengths" not in response:
                response["strengths"] = []
            if "weaknesses" not in response:
                response["weaknesses"] = []
            if "missing_points" not in response:
                response["missing_points"] = []
            if "communication_tips" not in response:
                response["communication_tips"] = []
            
            # Ensure best_answer is present, use improved_answer as fallback
            if "best_answer" not in response or not response.get("best_answer"):
                response["best_answer"] = response.get("improved_answer", "A comprehensive answer would include all key points mentioned in the feedback above.")
            
            # Ensure improved_answer exists
            if "improved_answer" not in response or not response.get("improved_answer"):
                response["improved_answer"] = response.get("best_answer", "Consider incorporating the feedback points mentioned above.")
            
            # Validate score is within range
            score = float(response.get("score", 3.0))
            if score < 0:
                score = 0
            elif score > 5:
                score = 5
            response["score"] = score
            
            try:
                return AnswerAnalysisResponse(**response)
            except Exception as validation_error:
                logger.error(f"Response validation error: {validation_error}, response: {response}")
                # Return a fallback response
                return AnswerAnalysisResponse(
                    score=score,
                    strengths=response.get("strengths", ["Good attempt"]),
                    weaknesses=response.get("weaknesses", ["Could be improved"]),
                    missing_points=response.get("missing_points", []),
                    improved_answer=response.get("improved_answer", "Consider adding more detail to your answer."),
                    best_answer=response.get("best_answer", "A comprehensive answer would address all aspects of the question."),
                    communication_tips=response.get("communication_tips", ["Speak clearly and confidently"])
                )
        else:
            logger.error(f"Invalid response format: {type(response)}, value: {response}")
            raise ValueError(f"Invalid response format: expected dict, got {type(response)}")
            
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except ValueError as e:
        logger.error(f"Value error analyzing answer: {str(e)}")
        # Provide a fallback response if AI fails
        return _get_fallback_analysis(request.question, request.answer, job_role, experience_level)
    except Exception as e:
        logger.error(f"Error analyzing answer: {str(e)}", exc_info=True)
        # Provide a fallback response if AI fails
        return _get_fallback_analysis(request.question, request.answer, job_role, experience_level)


def _get_fallback_analysis(question: str, answer: str, job_role: str, experience_level: str) -> AnswerAnalysisResponse:
    """Provide fallback analysis when AI is unavailable"""
    answer_length = len(answer.split())
    
    # Basic scoring based on answer length and content
    if answer_length < 20:
        score = 2.0
        strengths = ["You provided an answer"]
        weaknesses = ["Answer is too brief", "Needs more detail"]
        missing_points = ["Specific examples", "Relevant experience", "Key achievements"]
    elif answer_length < 50:
        score = 3.0
        strengths = ["Answer has reasonable length", "Shows basic understanding"]
        weaknesses = ["Could include more examples", "Needs more structure"]
        missing_points = ["Quantifiable achievements", "Specific technical details"]
    else:
        score = 3.5
        strengths = ["Comprehensive answer", "Good length", "Shows effort"]
        weaknesses = ["Could be more structured", "May need more specific examples"]
        missing_points = ["Better organization", "More relevant details"]
    
    improved_answer = f"A better answer would include: your relevant experience in {job_role}, specific examples or achievements, how your skills align with the role, and why you're interested. Structure it clearly with an introduction, main points, and conclusion."
    
    best_answer = f"For a {experience_level} {job_role} position, an ideal answer would comprehensively address the question by: (1) Providing relevant background and experience, (2) Highlighting specific achievements and skills that match the role, (3) Demonstrating understanding of the position and company, (4) Showing enthusiasm and alignment with the role's requirements, and (5) Concluding with why you're the right fit. The answer should be well-structured, professional, and demonstrate both technical competence and cultural fit."
    
    return AnswerAnalysisResponse(
        score=score,
        strengths=strengths,
        weaknesses=weaknesses,
        missing_points=missing_points,
        improved_answer=improved_answer,
        best_answer=best_answer,
        communication_tips=[
            "Speak clearly and confidently",
            "Structure your answer logically",
            "Include specific examples",
            "Maintain eye contact (in real interviews)",
            "Practice your answer beforehand"
        ]
    )


@router.post("/finish", response_model=InterviewFinishResponse)
async def finish_interview(
    request: InterviewFinishRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate final interview report"""
    try:
        ollama_available, model_name = check_ollama_availability()
        if not ollama_available:
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
        
        model_to_use = model_name or "llama3.2:3b"
        response = _call_ollama_advanced(
            prompt=prompt,
            system_prompt="You are an expert career counselor. Provide actionable, encouraging feedback. Always return valid JSON with all required fields.",
            model=model_to_use
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


