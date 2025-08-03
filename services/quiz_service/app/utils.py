from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from services.quiz_service.app.models import Quiz, Tag, Question
from uuid import UUID
from sqlalchemy.orm import selectinload, joinedload

async def get_or_create_tags(tag_names: List[str], db: AsyncSession) -> List[Tag]:
    """Get existing tags or create new ones"""
    tags = []
    
    for tag_name in tag_names:
        # Check if tag exists
        query = select(Tag).where(Tag.name == tag_name)
        result = await db.execute(query)
        tag = result.scalars().first()
        
        if not tag:
            # Create new tag
            tag = Tag(name=tag_name)
            db.add(tag)
            await db.flush()  # Get the ID without committing
        
        tags.append(tag)
    
    return tags

async def get_quiz_with_questions(quiz_id: UUID, db: AsyncSession) -> Quiz | None:
    result = await db.execute(
        select(Quiz)
        .options(
            selectinload(Quiz.questions).selectinload(Question.answers),
            selectinload(Quiz.tags),
        )
        .where(Quiz.id == quiz_id)
    )
    return result.scalars().first()

async def get_quizzes_by_user(user_id: UUID, db: AsyncSession, limit: int = 20, offset: int = 0) -> List[Quiz]:
    """Get quizzes created by a specific user"""
    query = select(Quiz).where(Quiz.user_id == user_id).offset(offset).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

async def search_quizzes(
    db: AsyncSession,
    title: str = None,
    tags: List[str] = None,
    user_id: UUID = None,
    is_ai_generated: bool = None,
    limit: int = 20,
    offset: int = 0
) -> List[Quiz]:
    """Search quizzes with filters"""
    query = select(Quiz)
    
    if title:
        query = query.where(Quiz.title.ilike(f"%{title}%"))
    
    if user_id:
        query = query.where(Quiz.user_id == user_id)
    
    if is_ai_generated is not None:
        query = query.where(Quiz.is_ai_generated == is_ai_generated)
    
    if tags:
        # Filter by tags (simplified - you might want to implement this differently)
        for tag_name in tags:
            query = query.join(Quiz.tags).where(Tag.name == tag_name)
    
    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

async def get_quiz_count_by_user(user_id: UUID, db: AsyncSession) -> int:
    """Get total number of quizzes created by user"""
    query = select(func.count(Quiz.id)).where(Quiz.user_id == user_id)
    result = await db.execute(query)
    return result.scalar() or 0
