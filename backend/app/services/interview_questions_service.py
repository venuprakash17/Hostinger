"""
Interview Questions Service
Fetches and generates real interview questions from companies
Uses OpenAI (cost-efficient) for question generation, Ollama for answer analysis
"""

import requests
import logging
import os
import json
from typing import List, Dict, Any, Optional
from app.services.advanced_ai_service import _call_ollama_advanced

logger = logging.getLogger(__name__)

# OpenAI configuration (optional, falls back to Ollama)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_CLIENT = None

try:
    if OPENAI_API_KEY:
        from openai import OpenAI
        OPENAI_CLIENT = OpenAI(api_key=OPENAI_API_KEY)
        logger.info("OpenAI client initialized for question generation")
except ImportError:
    logger.info("OpenAI not available, will use Ollama for question generation")
except Exception as e:
    logger.warning(f"OpenAI initialization error: {str(e)}, will use Ollama")


def _generate_questions_with_openai(
    company_name: str,
    role: str,
    experience_level: str,
    interview_round: str
) -> Optional[List[Dict[str, Any]]]:
    """Generate questions using OpenAI (cost-efficient gpt-4o-mini)"""
    if not OPENAI_CLIENT:
        return None
    
    try:
        round_descriptions = {
            "hr": """HR Round Questions:
- Focus on behavioral questions, cultural fit, communication skills
- Questions about motivation, career goals, teamwork, conflict resolution
- Company culture, values, and why you want to join
- Salary expectations, location preferences, notice period
- Strengths, weaknesses, achievements, failures
- Questions about resume, education, background
- STAR method questions (Situation, Task, Action, Result)
- Leadership, problem-solving, adaptability examples""",
            "technical": """Technical Round Questions:
- Programming languages, frameworks, tools specific to the role
- Data structures and algorithms
- System design (for experienced candidates)
- Database concepts, SQL queries
- Problem-solving and coding challenges
- Projects, technical achievements, architecture decisions
- Debugging, testing, code quality
- Technology trends, best practices
- Previous technical experience and challenges solved""",
            "managerial": """Managerial Round Questions:
- Leadership experience and style
- Team management, delegation, conflict resolution
- Decision-making in complex situations
- Strategic thinking, vision, planning
- Handling pressure, deadlines, resource constraints
- Mentoring, coaching, developing team members
- Cross-functional collaboration
- Business impact, ROI, metrics
- Handling difficult team members or situations
- Long-term vision and career aspirations"""
        }
        
        round_guidance = round_descriptions.get(interview_round.lower(), round_descriptions["technical"])
        
        system_prompt = f"""You are an expert at generating realistic interview questions based on ACTUAL previous year interviews from Indian IT companies.

Your task is to generate {interview_round.upper()} round questions for {company_name} for the role of {role} at {experience_level} level.

{round_guidance}

CRITICAL REQUIREMENTS:
1. FIRST question MUST ALWAYS be: "Tell me about yourself" (exact wording)
2. Questions must be REAL and commonly asked in {interview_round} rounds
3. Include 2-3 company-specific questions if company name is provided
4. Progress from easy → medium → hard
5. LAST question MUST ALWAYS be: "Do you have any questions for us?" (exact wording)
6. Generate 12-18 questions total
7. Make questions realistic and commonly asked in Indian IT companies

Return ONLY valid JSON array (no markdown, no code blocks):"""
        
        user_prompt = f"""Generate {interview_round.upper()} round interview questions for:
- Company: {company_name}
- Role: {role}
- Experience Level: {experience_level}

Focus on {interview_round} round specific questions. Include previous year questions from {company_name} if known.

Return JSON array format:
[
  {{"question": "Tell me about yourself", "type": "introduction", "category": "behavioral", "round": "{interview_round}"}},
  {{"question": "...", "type": "...", "category": "...", "round": "{interview_round}"}},
  ...
  {{"question": "Do you have any questions for us?", "type": "closing", "category": "behavioral", "round": "{interview_round}"}}
]"""
        
        response = OPENAI_CLIENT.chat.completions.create(
            model="gpt-4o-mini",  # Cost-efficient model ($0.15/1M input, $0.60/1M output)
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.7,
            max_tokens=3000
        )
        
        content = response.choices[0].message.content
        if not content:
            return None
        
        try:
            result = json.loads(content)
        except json.JSONDecodeError:
            logger.warning(f"Failed to parse OpenAI response as JSON: {content[:200]}")
            return None
        
        # Handle different response formats
        if isinstance(result, list):
            questions = result
        elif isinstance(result, dict):
            if "questions" in result:
                questions = result["questions"]
            elif any(k.startswith("question") for k in result.keys()):
                # Single question object
                questions = [result]
            else:
                # Try to extract questions from any array-like structure
                for key, value in result.items():
                    if isinstance(value, list) and len(value) > 0:
                        if isinstance(value[0], dict) and "question" in value[0]:
                            questions = value
                            break
                else:
                    logger.warning(f"Unexpected OpenAI response format: {result}")
                    return None
        else:
            logger.warning(f"OpenAI returned non-list/dict result: {type(result)}")
            return None
        
        # Validate questions are dicts
        if not isinstance(questions, list):
            return None
        
        # Ensure all questions are dicts, not strings
        validated_questions = []
        for q in questions:
            if isinstance(q, dict):
                validated_questions.append(q)
            elif isinstance(q, str):
                # If question is a string, wrap it in a dict
                validated_questions.append({"question": q, "type": "general", "category": "general"})
            else:
                logger.warning(f"Skipping invalid question format: {type(q)}")
        
        return validated_questions if validated_questions else None
        
    except Exception as e:
        logger.warning(f"OpenAI question generation failed: {str(e)}, falling back to Ollama")
        return None


def get_company_interview_questions(
    company_name: str,
    role: str,
    experience_level: str = "fresher",
    interview_round: str = "technical"
) -> List[Dict[str, Any]]:
    """
    Get interview questions for a specific company, role, and round
    Uses OpenAI (cost-efficient) first, falls back to Ollama (free)
    """
    questions = []
    
    # Try OpenAI first (better quality, cost-efficient with gpt-4o-mini)
    questions = _generate_questions_with_openai(
        company_name, role, experience_level, interview_round
    )
    
    # Fallback to Ollama if OpenAI fails or not available
    if not questions:
        try:
            round_descriptions = {
                "hr": """HR Round Questions:
- Focus on behavioral questions, cultural fit, communication skills
- Questions about motivation, career goals, teamwork, conflict resolution
- Company culture, values, and why you want to join
- Salary expectations, location preferences, notice period
- Strengths, weaknesses, achievements, failures
- Questions about resume, education, background
- STAR method questions (Situation, Task, Action, Result)
- Leadership, problem-solving, adaptability examples""",
                "technical": """Technical Round Questions:
- Programming languages, frameworks, tools specific to the role
- Data structures and algorithms
- System design (for experienced candidates)
- Database concepts, SQL queries
- Problem-solving and coding challenges
- Projects, technical achievements, architecture decisions
- Debugging, testing, code quality
- Technology trends, best practices
- Previous technical experience and challenges solved""",
                "managerial": """Managerial Round Questions:
- Leadership experience and style
- Team management, delegation, conflict resolution
- Decision-making in complex situations
- Strategic thinking, vision, planning
- Handling pressure, deadlines, resource constraints
- Mentoring, coaching, developing team members
- Cross-functional collaboration
- Business impact, ROI, metrics
- Handling difficult team members or situations
- Long-term vision and career aspirations"""
            }
            
            round_guidance = round_descriptions.get(interview_round.lower(), round_descriptions["technical"])
            
            prompt = f"""You are an expert at generating realistic interview questions based on ACTUAL previous year interviews from Indian IT companies.

Generate 15-20 REAL {interview_round.upper()} round interview questions that are commonly asked at {company_name} for the role of {role} at {experience_level} level.

{round_guidance}

CRITICAL: These must be ACTUAL questions from previous interviews. Research:
- Glassdoor interview reviews for {company_name} {role} positions
- GeeksforGeeks interview experiences for {company_name}
- InterviewBit company-specific questions
- LeetCode company-tagged questions for {company_name}
- Common {interview_round} round questions in Indian IT companies for {role} role

MANDATORY REQUIREMENTS:
1. FIRST question MUST ALWAYS be: "Tell me about yourself" (exact wording)
2. Include 2-3 company-specific questions like:
   - "Why do you want to work at {company_name}?"
   - "What do you know about {company_name}?"
   - "How do you see yourself contributing to {company_name}?"
3. Focus on {interview_round} round specific questions
4. Progress from easy (Q1-5) → medium (Q6-12) → hard (Q13-18)
5. LAST question MUST ALWAYS be: "Do you have any questions for us?" (exact wording)
6. Include previous year questions from {company_name} if known
7. Make questions realistic and commonly asked in Indian IT companies

Return ONLY valid JSON array (no markdown, no code blocks):
[
  {{"question": "Tell me about yourself", "type": "introduction", "category": "behavioral", "round": "{interview_round}"}},
  {{"question": "Why do you want to work at {company_name}?", "type": "company", "category": "behavioral", "round": "{interview_round}"}},
  {{"question": "[Previous year {interview_round} round question from {company_name} for {role}]", "type": "{interview_round}", "category": "{interview_round}"}},
  ...
  {{"question": "Do you have any questions for us?", "type": "closing", "category": "behavioral", "round": "{interview_round}"}}
]

Generate 15-20 questions, prioritizing previous year {interview_round} round questions from {company_name}."""

            response = _call_ollama_advanced(
                prompt=prompt,
                system_prompt=f"You are an expert at generating realistic {interview_round} round interview questions based on company and role. Generate questions that are commonly asked in real interviews.",
                model="llama3.2:3b"
            )
            
            # Validate and normalize response
            if isinstance(response, list):
                questions = response
            elif isinstance(response, dict):
                if "questions" in response:
                    questions = response["questions"]
                elif any(k.startswith("question") for k in response.keys()):
                    # Single question object
                    questions = [response]
                else:
                    # Try to find questions array in response
                    for key, value in response.items():
                        if isinstance(value, list) and len(value) > 0:
                            if isinstance(value[0], dict) and "question" in value[0]:
                                questions = value
                                break
                    else:
                        logger.warning(f"Unexpected Ollama response format: {type(response)}")
                        questions = []
            elif isinstance(response, str):
                # If response is a string, try to parse it
                try:
                    parsed = json.loads(response)
                    if isinstance(parsed, list):
                        questions = parsed
                    elif isinstance(parsed, dict) and "questions" in parsed:
                        questions = parsed["questions"]
                    else:
                        questions = []
                except json.JSONDecodeError:
                    logger.warning(f"Ollama returned non-JSON string: {response[:200]}")
                    questions = []
            else:
                logger.warning(f"Unexpected Ollama response type: {type(response)}")
                questions = []
            
            # Validate all questions are dicts
            validated_questions = []
            for q in questions:
                if isinstance(q, dict):
                    validated_questions.append(q)
                elif isinstance(q, str):
                    # If question is a string, wrap it in a dict
                    validated_questions.append({"question": q, "type": interview_round, "category": interview_round})
                else:
                    logger.warning(f"Skipping invalid question format: {type(q)}")
            
            questions = validated_questions
        except Exception as e:
            logger.error(f"Error generating questions with Ollama: {str(e)}")
            # Fallback to default questions
            return get_default_questions(role, experience_level, interview_round)
    
    # Ensure all questions are dicts before processing
    validated_questions = []
    for q in questions:
        if isinstance(q, dict):
            validated_questions.append(q)
        elif isinstance(q, str):
            validated_questions.append({"question": q, "type": interview_round, "category": interview_round})
    
    questions = validated_questions
    
    if not questions:
        logger.error("No valid questions generated, using default questions")
        return get_default_questions(role, experience_level, interview_round)
    
    # Ensure "Tell me about yourself" is first
    intro_question = {
        "question": "Tell me about yourself",
        "type": "introduction",
        "category": "behavioral",
        "round": interview_round
    }
    
    # Remove if exists, then add at beginning
    questions = [q for q in questions if isinstance(q, dict) and q.get("question", "").lower() != "tell me about yourself"]
    questions.insert(0, intro_question)
    
    # Ensure closing question exists
    closing_question = {
        "question": "Do you have any questions for us?",
        "type": "closing",
        "category": "behavioral",
        "round": interview_round
    }
    
    # Remove if exists, then add at end
    questions = [q for q in questions if isinstance(q, dict) and q.get("question", "").lower() != "do you have any questions for us"]
    questions.append(closing_question)
    
    # Ensure all questions have round field
    for q in questions:
        if "round" not in q:
            q["round"] = interview_round
    
    # Ensure we have at least 12 questions (minimum for realistic interview)
    while len(questions) < 12:
        questions.insert(-1, {  # Insert before closing question
            "question": f"Can you explain your experience with {role} related technologies?",
            "type": interview_round,
            "category": interview_round,
            "round": interview_round
        })
    
    # Ensure all questions are dicts before filtering
    questions = [q for q in questions if isinstance(q, dict)]
    
    # Keep up to 20 questions for comprehensive interview
    if len(questions) > 20:
        intro = questions[0] if questions else intro_question
        closing = questions[-1] if questions and isinstance(questions[-1], dict) and questions[-1].get("question", "").lower() == "do you have any questions for us" else closing_question
        middle_questions = questions[1:-1] if questions and isinstance(questions[-1], dict) and questions[-1].get("question", "").lower() == "do you have any questions for us" else questions[1:]
        
        # Filter to ensure all are dicts
        middle_questions = [q for q in middle_questions if isinstance(q, dict)]
        
        # Prioritize round-specific and company-specific questions
        round_questions = [q for q in middle_questions if q.get("round") == interview_round or q.get("type") == interview_round]
        company_questions = [q for q in middle_questions if q.get("type") == "company"]
        other_questions = [q for q in middle_questions if q not in round_questions and q not in company_questions]
        
        # Keep best mix: 1 intro + 2-3 company + 10-12 round-specific + 3-4 other + 1 closing = ~18-20
        selected = [intro]
        selected.extend(company_questions[:3])
        selected.extend(round_questions[:12])
        selected.extend(other_questions[:4])
        selected.append(closing)
        questions = selected[:20]
    else:
        # Ensure closing question is last
        if questions and isinstance(questions[-1], dict) and questions[-1].get("question", "").lower() != "do you have any questions for us":
            questions = [q for q in questions if isinstance(q, dict) and q.get("question", "").lower() != "do you have any questions for us"]
            questions.append(closing_question)
    
    # Ensure all questions are dicts before adding numbers
    final_questions = []
    for q in questions:
        if isinstance(q, dict):
            q["question_number"] = len(final_questions) + 1
            q["total_questions"] = len(questions)
            final_questions.append(q)
        else:
            logger.warning(f"Skipping non-dict question: {type(q)}")
    
    if not final_questions:
        logger.error("No valid questions after processing, using default questions")
        return get_default_questions(role, experience_level, interview_round)
    
    logger.info(f"Generated {len(final_questions)} {interview_round} round questions for {company_name} - {role}")
    return final_questions


def get_default_questions(role: str, experience_level: str, interview_round: str = "technical") -> List[Dict[str, Any]]:
    """Fallback default questions if AI generation fails"""
    
    # Round-specific default questions
    hr_questions = [
        {"question": "Tell me about yourself", "type": "introduction", "category": "behavioral", "round": "hr"},
        {"question": "Why do you want to work here?", "type": "company", "category": "behavioral", "round": "hr"},
        {"question": "What are your strengths and weaknesses?", "type": "behavioral", "category": "behavioral", "round": "hr"},
        {"question": "Where do you see yourself in 5 years?", "type": "behavioral", "category": "behavioral", "round": "hr"},
        {"question": "How do you handle stress and pressure?", "type": "behavioral", "category": "behavioral", "round": "hr"},
        {"question": "Tell me about a time you worked in a team", "type": "behavioral", "category": "behavioral", "round": "hr"},
        {"question": "What motivates you?", "type": "behavioral", "category": "behavioral", "round": "hr"},
        {"question": "How do you handle conflicts?", "type": "behavioral", "category": "behavioral", "round": "hr"},
        {"question": "What are your salary expectations?", "type": "hr", "category": "hr", "round": "hr"},
        {"question": "Why should we hire you?", "type": "behavioral", "category": "behavioral", "round": "hr"},
        {"question": "Do you have any questions for us?", "type": "closing", "category": "behavioral", "round": "hr"},
    ]
    
    technical_questions = [
        {"question": "Tell me about yourself", "type": "introduction", "category": "behavioral", "round": "technical"},
        {"question": f"Why are you interested in the {role} role?", "type": "motivational", "category": "behavioral", "round": "technical"},
        {"question": "What programming languages are you most comfortable with?", "type": "technical", "category": "technical", "round": "technical"},
        {"question": f"Describe a challenging project you worked on related to {role}", "type": "technical", "category": "technical", "round": "technical"},
        {"question": "What is your approach to debugging code?", "type": "technical", "category": "technical", "round": "technical"},
        {"question": "Explain a time when you had to learn something new quickly", "type": "behavioral", "category": "behavioral", "round": "technical"},
        {"question": "Describe your experience with version control systems", "type": "technical", "category": "technical", "round": "technical"},
        {"question": "How do you stay updated with technology trends?", "type": "behavioral", "category": "behavioral", "round": "technical"},
        {"question": "What data structures do you know?", "type": "technical", "category": "technical", "round": "technical"},
        {"question": "How do you handle tight deadlines?", "type": "behavioral", "category": "behavioral", "round": "technical"},
        {"question": "Do you have any questions for us?", "type": "closing", "category": "behavioral", "round": "technical"},
    ]
    
    managerial_questions = [
        {"question": "Tell me about yourself", "type": "introduction", "category": "behavioral", "round": "managerial"},
        {"question": "Describe your leadership style", "type": "managerial", "category": "managerial", "round": "managerial"},
        {"question": "How do you handle team conflicts?", "type": "managerial", "category": "managerial", "round": "managerial"},
        {"question": "Tell me about a time you had to make a difficult decision", "type": "managerial", "category": "managerial", "round": "managerial"},
        {"question": "How do you delegate tasks to your team?", "type": "managerial", "category": "managerial", "round": "managerial"},
        {"question": "What is your approach to mentoring team members?", "type": "managerial", "category": "managerial", "round": "managerial"},
        {"question": "How do you handle underperforming team members?", "type": "managerial", "category": "managerial", "round": "managerial"},
        {"question": "Describe a time you had to manage multiple priorities", "type": "managerial", "category": "managerial", "round": "managerial"},
        {"question": "What metrics do you use to measure team success?", "type": "managerial", "category": "managerial", "round": "managerial"},
        {"question": "How do you ensure team alignment with company goals?", "type": "managerial", "category": "managerial", "round": "managerial"},
        {"question": "Do you have any questions for us?", "type": "closing", "category": "behavioral", "round": "managerial"},
    ]
    
    # Select questions based on round
    if interview_round.lower() == "hr":
        questions = hr_questions
    elif interview_round.lower() == "managerial":
        questions = managerial_questions
    else:
        questions = technical_questions
    
    # Add question numbers
    for i, q in enumerate(questions, 1):
        q["question_number"] = i
        q["total_questions"] = len(questions)
    
    return questions
