from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from enum import Enum

# Enums
class QuestionType(str, Enum):
    MULTIPLE_CHOICE = "multiple_choice"
    TEXT_ANSWER = "long_answer"
    SINGLE_CHOICE = "single_choice"

# Base schemas
class TagBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)

class AnswerBase(BaseModel):
    answer_text: str = Field(..., min_length=1, max_length=500)
    is_correct: bool = False

class QuestionBase(BaseModel):
    question_type: QuestionType
    question_text: str = Field(..., min_length=1, max_length=1000)
    points: int = Field(1, ge=1, le=100, description="Количество баллов за вопрос")

class QuizBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1, max_length=1000)
    is_ai_generated: bool = False

# Create schemas
class TagCreate(TagBase):
    pass

class AnswerCreate(AnswerBase):
    pass

class QuestionCreate(QuestionBase):
    answers: List[AnswerCreate] = Field(default=[], description="Answers for all question types")

class TextQuestionCreate(QuestionBase):
    answers: List[AnswerCreate] = Field(default=[], description="Answers for all question types")

class QuizCreate(QuizBase):
    tags: Optional[List[str]] = Field(default=[], description="List of tag names")
    questions: List[QuestionCreate] = Field(..., min_items=1)

# Response schemas
class TagResponse(TagBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class AnswerResponse(AnswerBase):
    id: UUID

    class Config:
        from_attributes = True

class QuestionResponse(QuestionBase):
    id: UUID
    quiz_id: UUID
    created_at: datetime
    updated_at: datetime
    answers: List[AnswerResponse]
    points: int

    class Config:
        from_attributes = True

class QuizResponse(QuizBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime
    tags: List[TagResponse]
    questions: List[QuestionResponse]

    class Config:
        from_attributes = True

# Update schemas
class TagUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=50)

class AnswerUpdate(BaseModel):
    answer_text: Optional[str] = Field(None, min_length=1, max_length=500)
    is_correct: Optional[bool] = None

class QuestionUpdate(BaseModel):
    question_type: Optional[QuestionType] = None
    question_text: Optional[str] = Field(None, min_length=1, max_length=1000)
    points: Optional[int] = Field(None, ge=1, le=100, description="Количество баллов за вопрос")
    answers: Optional[List[AnswerCreate]] = None

class QuizUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, min_length=1, max_length=1000)
    is_ai_generated: Optional[bool] = None
    tags: Optional[List[str]] = None
    questions: Optional[List[QuestionCreate]] = None

# List response schemas
class QuizListResponse(BaseModel):
    id: UUID
    title: str
    description: str
    is_ai_generated: bool
    user_id: UUID
    created_at: datetime
    updated_at: datetime
    tags: List[TagResponse]
    questions: List[QuestionResponse]  # Фронтенд сам посчитает количество

    class Config:
        from_attributes = True

# Search and filter schemas
class QuizSearchParams(BaseModel):
    title: Optional[str] = None
    tags: Optional[List[str]] = None
    user_id: Optional[UUID] = None
    is_ai_generated: Optional[bool] = None
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)

# Quiz result schemas
class QuizAnswer(BaseModel):
    question_id: UUID
    answers: List[str] = Field(default=[])
    text_answer: Optional[str] = None

class QuizResult(BaseModel):
    quiz_id: UUID
    answers: List[QuizAnswer]
    score: Optional[int] = None
    total_questions: Optional[int] = None
    correct_answers: Optional[int] = None

class QuizResultResponse(BaseModel):
    score: int
    total_questions: int
    correct_answers: int
    total_points: int
    earned_points: int
    answers: List[QuizAnswer]
    details: List[dict]  # Детальная информация по каждому вопросу

# Pagination response
class PaginatedQuizResponse(BaseModel):
    items: List[QuizListResponse]
    total: int
    limit: int
    offset: int
    has_next: bool
    has_prev: bool
