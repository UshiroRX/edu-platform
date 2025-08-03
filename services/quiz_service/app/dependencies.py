from typing import Annotated
from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from services.quiz_service.app.models import Quiz, Question, Tag
from services.quiz_service.app.db import get_session
from sqlalchemy import select
from uuid import UUID

async def get_quiz_by_id(quiz_id: UUID, db: AsyncSession) -> Quiz:
    query = select(Quiz).where(Quiz.id == quiz_id)
    result = await db.execute(query)
    quiz = result.scalars().first()
    
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found"
        )
    return quiz

async def get_question_by_id(question_id: UUID, db: AsyncSession) -> Question:
    query = select(Question).where(Question.id == question_id)
    result = await db.execute(query)
    question = result.scalars().first()
    
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"
        )
    return question

async def get_tag_by_id(tag_id: UUID, db: AsyncSession) -> Tag:
    query = select(Tag).where(Tag.id == tag_id)
    result = await db.execute(query)
    tag = result.scalars().first()
    
    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag not found"
        )
    return tag

# Dependency for database session
db_depends = Annotated[AsyncSession, Depends(get_session)]
