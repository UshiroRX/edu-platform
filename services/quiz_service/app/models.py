import uuid
from sqlalchemy import Column, String, DateTime, Boolean, Table, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from services.quiz_service.app.db import Base
from sqlalchemy.types import Enum as SQLAlchemyEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum

quiz_tag_association = Table(
    "quiz_tag_association",
    Base.metadata,
    Column("quiz_id", UUID(as_uuid=True), ForeignKey("quiz.quiz.id"), primary_key=True),
    Column("tag_id", UUID(as_uuid=True), ForeignKey("quiz.tag.id"), primary_key=True),
    schema="quiz" 
)

class Quiz(Base):
    __tablename__ = "quiz"
    __table_args__ = {"schema": "quiz"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    is_ai_generated = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())
    
    tags = relationship("Tag", secondary=quiz_tag_association, back_populates="quizzes", lazy="joined")
    questions = relationship("Question", back_populates="quiz", lazy="joined", cascade="all, delete-orphan")
    
    user_id = Column(UUID(as_uuid=True), nullable=False)
    
    
class QuestionType(str, Enum):
    MULTIPLE_CHOICE = "multiple_choice"
    TEXT_ANSWER = "long_answer"
    SINGLE_CHOICE = "single_choice"

class Tag(Base):
    __tablename__ = "tag"
    __table_args__ = {"schema": "quiz"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())
    
    quizzes = relationship("Quiz", secondary=quiz_tag_association, back_populates="tags", lazy="joined")
    
class Question(Base):
    __tablename__ = "question"
    __table_args__ = {"schema": "quiz"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quiz_id = Column(UUID(as_uuid=True), ForeignKey("quiz.quiz.id"), nullable=False)
    question_type = Column(SQLAlchemyEnum(QuestionType), nullable=False)
    question_text = Column(String, nullable=False)
    points = Column(Integer, nullable=False, default=1)  # Количество баллов за вопрос
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())
    
    quiz = relationship("Quiz", back_populates="questions", lazy="joined")
    answers = relationship("Answer", back_populates="question", lazy="joined", cascade="all, delete-orphan")

class Answer(Base):
    __tablename__ = "answer"
    __table_args__ = {"schema": "quiz"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    question_id = Column(UUID(as_uuid=True), ForeignKey("quiz.question.id"), nullable=False)
    answer_text = Column(String, nullable=False)
    is_correct = Column(Boolean, nullable=False, default=False)
    question = relationship("Question", back_populates="answers", lazy="joined")


