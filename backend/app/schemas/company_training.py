"""Pydantic schemas for Company Training"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class RoundTypeEnum(str, Enum):
    QUIZ = "quiz"
    CODING = "coding"
    GROUP_DISCUSSION = "gd"
    INTERVIEW = "interview"


# Company Schemas
class CompanyBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    logo_url: Optional[str] = None
    description: Optional[str] = None
    website: Optional[str] = None
    is_active: bool = True


class CompanyCreate(CompanyBase):
    pass


class CompanyUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    logo_url: Optional[str] = None
    description: Optional[str] = None
    website: Optional[str] = None
    is_active: Optional[bool] = None


class Company(CompanyBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Company Role Schemas
class CompanyRoleBase(BaseModel):
    company_id: int
    role_name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    difficulty: Optional[str] = None
    scope_type: str = "svnapro"
    target_departments: Optional[List[str]] = None
    target_years: Optional[List[str]] = None
    target_sections: Optional[List[str]] = None
    is_active: bool = True


class CompanyRoleCreate(CompanyRoleBase):
    pass


class CompanyRoleUpdate(BaseModel):
    company_id: Optional[int] = None
    role_name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    difficulty: Optional[str] = None
    scope_type: Optional[str] = None
    target_departments: Optional[List[str]] = None
    target_years: Optional[List[str]] = None
    target_sections: Optional[List[str]] = None
    is_active: Optional[bool] = None


class CompanyRole(CompanyRoleBase):
    id: int
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    company: Optional[Company] = None
    
    class Config:
        from_attributes = True


# Practice Section Schemas
class PracticeSectionBase(BaseModel):
    role_id: int
    section_name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    order_index: int = 0
    is_active: bool = True


class PracticeSectionCreate(PracticeSectionBase):
    pass


class PracticeSectionUpdate(BaseModel):
    role_id: Optional[int] = None
    section_name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    order_index: Optional[int] = None
    is_active: Optional[bool] = None


class PracticeSection(PracticeSectionBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    role: Optional[CompanyRole] = None
    
    class Config:
        from_attributes = True


# Round Schemas
class RoundBase(BaseModel):
    practice_section_id: int
    round_type: RoundTypeEnum
    round_name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    order_index: int = 0
    is_active: bool = True
    quiz_id: Optional[int] = None
    coding_problem_id: Optional[int] = None


class RoundCreate(RoundBase):
    pass


class RoundUpdate(BaseModel):
    practice_section_id: Optional[int] = None
    round_type: Optional[RoundTypeEnum] = None
    round_name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    order_index: Optional[int] = None
    is_active: Optional[bool] = None
    quiz_id: Optional[int] = None
    coding_problem_id: Optional[int] = None


class Round(RoundBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    practice_section: Optional[PracticeSection] = None
    
    class Config:
        from_attributes = True


# Round Content Schemas
class RoundContentBase(BaseModel):
    round_id: int
    # GD fields
    gd_topic: Optional[str] = None
    gd_description: Optional[str] = None
    key_points: Optional[List[str]] = None
    best_points: Optional[List[str]] = None
    dos_and_donts: Optional[Dict[str, List[str]]] = None
    # Interview fields
    question: Optional[str] = None
    expected_answer: Optional[str] = None
    question_type: Optional[str] = None
    tips: Optional[List[str]] = None
    # Quiz fields
    quiz_question: Optional[str] = None
    quiz_options: Optional[List[str]] = None
    correct_answer: Optional[str] = None
    # Advanced Quiz features
    quiz_question_type: Optional[str] = Field(None, pattern="^(mcq|fill_blank|true_false)$")  # mcq, fill_blank, true_false
    quiz_timer_seconds: Optional[int] = None  # Timer for this question in seconds
    quiz_marks: int = Field(default=1, ge=1)  # Marks for this question
    quiz_option_a: Optional[str] = None  # Option A for MCQ
    quiz_option_b: Optional[str] = None  # Option B for MCQ
    quiz_option_c: Optional[str] = None  # Option C for MCQ
    quiz_option_d: Optional[str] = None  # Option D for MCQ
    quiz_correct_answer_text: Optional[str] = None  # For fill_blank questions
    quiz_is_true: Optional[bool] = None  # For true_false questions
    # Coding fields
    coding_title: Optional[str] = None
    coding_description: Optional[str] = None
    coding_difficulty: Optional[str] = None
    coding_input_format: Optional[str] = None
    coding_output_format: Optional[str] = None
    coding_constraints: Optional[str] = None
    coding_sample_input: Optional[str] = None
    coding_sample_output: Optional[str] = None
    coding_test_cases: Optional[List[Dict[str, Any]]] = None
    coding_starter_code_python: Optional[str] = None
    coding_starter_code_c: Optional[str] = None
    coding_starter_code_cpp: Optional[str] = None
    coding_starter_code_java: Optional[str] = None
    coding_starter_code_javascript: Optional[str] = None
    coding_time_limit: Optional[int] = None
    coding_memory_limit: Optional[int] = None
    # Advanced Coding exam features
    coding_exam_timer_enabled: bool = Field(default=False)  # Enable exam timer
    coding_exam_duration_minutes: Optional[int] = None  # Exam duration in minutes
    order_index: int = 0
    is_active: bool = True


class RoundContentCreate(RoundContentBase):
    pass


class RoundContentUpdate(BaseModel):
    round_id: Optional[int] = None
    gd_topic: Optional[str] = None
    gd_description: Optional[str] = None
    key_points: Optional[List[str]] = None
    best_points: Optional[List[str]] = None
    dos_and_donts: Optional[Dict[str, List[str]]] = None
    question: Optional[str] = None
    expected_answer: Optional[str] = None
    question_type: Optional[str] = None
    tips: Optional[List[str]] = None
    quiz_question: Optional[str] = None
    quiz_options: Optional[List[str]] = None
    correct_answer: Optional[str] = None
    quiz_question_type: Optional[str] = None
    quiz_timer_seconds: Optional[int] = None
    quiz_marks: Optional[int] = None
    quiz_option_a: Optional[str] = None
    quiz_option_b: Optional[str] = None
    quiz_option_c: Optional[str] = None
    quiz_option_d: Optional[str] = None
    quiz_correct_answer_text: Optional[str] = None
    quiz_is_true: Optional[bool] = None
    coding_title: Optional[str] = None
    coding_description: Optional[str] = None
    coding_difficulty: Optional[str] = None
    coding_input_format: Optional[str] = None
    coding_output_format: Optional[str] = None
    coding_constraints: Optional[str] = None
    coding_sample_input: Optional[str] = None
    coding_sample_output: Optional[str] = None
    coding_test_cases: Optional[List[Dict[str, Any]]] = None
    coding_starter_code_python: Optional[str] = None
    coding_starter_code_c: Optional[str] = None
    coding_starter_code_cpp: Optional[str] = None
    coding_starter_code_java: Optional[str] = None
    coding_starter_code_javascript: Optional[str] = None
    coding_time_limit: Optional[int] = None
    coding_memory_limit: Optional[int] = None
    coding_exam_timer_enabled: Optional[bool] = None
    coding_exam_duration_minutes: Optional[int] = None
    order_index: Optional[int] = None
    is_active: Optional[bool] = None


class RoundContent(RoundContentBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    round: Optional[Round] = None
    
    class Config:
        from_attributes = True


# Response schemas with relationships
class RoundWithContent(Round):
    contents: List[RoundContent] = []


class PracticeSectionWithRounds(PracticeSection):
    rounds: List[RoundWithContent] = []


class CompanyRoleWithSections(CompanyRole):
    practice_sections: List[PracticeSectionWithRounds] = []


class CompanyWithRoles(Company):
    roles: List[CompanyRoleWithSections] = []

