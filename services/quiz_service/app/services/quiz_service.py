from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc, asc
from services.quiz_service.app.models import Quiz, Question, Answer, Tag
from services.quiz_service.app.schemas import QuizCreate, QuizUpdate
from services.quiz_service.app.utils import get_or_create_tags, get_quiz_with_questions
from uuid import UUID

class QuizService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_quiz(self, quiz_data: QuizCreate, user_id: UUID) -> Quiz:
        """Create a new quiz with questions and answers using ORM relationships."""

        # 1. Создаем корневой объект Quiz
        quiz = Quiz(
            title=quiz_data.title,
            description=quiz_data.description,
            is_ai_generated=quiz_data.is_ai_generated,
            user_id=user_id
        )

        # 2. Обрабатываем теги (ваш код здесь уже был хорош)
        if quiz_data.tags:
            # get_or_create_tags должен вернуть список объектов Tag
            tags = await get_or_create_tags(quiz_data.tags, self.db)
            quiz.tags = tags  # Просто присваиваем список в relationship

        # 3. Создаем вложенные объекты и связываем их через relationships
        # Мы не добавляем их в сессию вручную. SQLAlchemy сделает это благодаря cascade.
        
        questions_list = []
        for question_data in quiz_data.questions:
            # Создаем вопрос. НЕ УКАЗЫВАЕМ quiz_id!
            question = Question(
                question_type=question_data.question_type,
                question_text=question_data.question_text,
                points=question_data.points
            )
            
            # Создаем ответы для всех типов вопросов
            question.answers = [
                Answer(
                    answer_text=answer_data.answer_text,
                    is_correct=answer_data.is_correct
                )
                for answer_data in question_data.answers
            ]
            
            questions_list.append(question)

        # Присваиваем готовый список вопросов в relationship 'questions' у квиза
        quiz.questions = questions_list
        
        # 4. Добавляем в сессию ТОЛЬКО корневой объект `quiz`
        # Благодаря cascade="all", SQLAlchemy автоматически добавит все связанные
        # объекты Question и Answer.
        self.db.add(quiz)
        
        # 5. Один commit для всей транзакции.
        # SQLAlchemy сам определит правильный порядок INSERT'ов.
        await self.db.commit()
        
        # 6. Обновляем объект, чтобы подтянуть все сгенерированные БД значения (ID, created_at)
        # для quiz и всех его дочерних элементов.
        await self.db.refresh(quiz)
        
        return quiz

    async def get_quiz(self, quiz_id: UUID) -> Optional[Quiz]:
        """Get quiz by ID"""
        quiz = await get_quiz_with_questions(quiz_id, self.db)
        return quiz

    async def get_quizzes_by_user(self, user_id: UUID, limit: int = 20, offset: int = 0) -> List[Quiz]:
        """Get quizzes created by user"""
        query = select(Quiz).where(Quiz.user_id == user_id).offset(offset).limit(limit)
        result = await self.db.execute(query)
        return result.scalars().unique().all()

    async def update_quiz(self, quiz_id: UUID, quiz_data: QuizUpdate) -> Optional[Quiz]:
        """Update quiz"""
        quiz = await get_quiz_with_questions(quiz_id, self.db)
        if not quiz:
            return None

        # Update basic fields
        if quiz_data.title is not None:
            quiz.title = quiz_data.title
        if quiz_data.description is not None:
            quiz.description = quiz_data.description
        if quiz_data.is_ai_generated is not None:
            quiz.is_ai_generated = quiz_data.is_ai_generated

        # Handle tags
        if quiz_data.tags is not None:
            tags = await get_or_create_tags(quiz_data.tags, self.db)
            quiz.tags = tags

        # Handle questions update
        if quiz_data.questions is not None:
            # Удаляем существующие вопросы (cascade удалит ответы)
            for question in quiz.questions:
                await self.db.delete(question)
            
            # Создаем новые вопросы
            questions_list = []
            for question_data in quiz_data.questions:
                question = Question(
                    question_type=question_data.question_type,
                    question_text=question_data.question_text,
                    points=question_data.points
                )
                
                # Создаем ответы для всех типов вопросов
                question.answers = [
                    Answer(
                        answer_text=answer_data.answer_text,
                        is_correct=answer_data.is_correct
                    )
                    for answer_data in question_data.answers
                ]
                
                questions_list.append(question)
            
            quiz.questions = questions_list

        await self.db.commit()
        
        # Получаем обновленный квиз с полной загрузкой связанных данных
        return await get_quiz_with_questions(quiz_id, self.db)

    async def delete_quiz(self, quiz_id: UUID) -> bool:
        """Delete quiz"""
        quiz = await get_quiz_with_questions(quiz_id, self.db)
        if not quiz:
            return False

        await self.db.delete(quiz)
        await self.db.commit()
        return True

    async def search_quizzes_advanced(
        self,
        search_query: str = None,
        tags: List[str] = None,
        user_id: UUID = None,
        exclude_user_id: UUID = None,
        is_ai_generated: bool = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        limit: int = 20,
        offset: int = 0
    ) -> List[Quiz]:
        """Advanced search with sorting and filtering"""
        query = select(Quiz)
        
        # Build filters
        filters = []
        
        if search_query:
            search_filter = or_(
                Quiz.title.ilike(f"%{search_query}%"),
                Quiz.description.ilike(f"%{search_query}%")
            )
            filters.append(search_filter)
        
        if user_id:
            filters.append(Quiz.user_id == user_id)
        
        if exclude_user_id:
            filters.append(Quiz.user_id != exclude_user_id)
        
        if is_ai_generated is not None:
            filters.append(Quiz.is_ai_generated == is_ai_generated)
        
        if filters:
            query = query.where(and_(*filters))
        
        # Handle tags filtering
        if tags:
            for tag_name in tags:
                query = query.join(Quiz.tags).where(Tag.name == tag_name)
        
        # Apply sorting
        if sort_by == "title":
            order_column = Quiz.title
        elif sort_by == "updated_at":
            order_column = Quiz.updated_at
        else:  # default to created_at
            order_column = Quiz.created_at
        
        if sort_order == "asc":
            query = query.order_by(asc(order_column))
        else:
            query = query.order_by(desc(order_column))
        
        query = query.offset(offset).limit(limit)
        result = await self.db.execute(query)
        return result.scalars().unique().all()

    async def get_search_count(
        self,
        search_query: str = None,
        tags: List[str] = None,
        user_id: UUID = None,
        exclude_user_id: UUID = None,
        is_ai_generated: bool = None
    ) -> int:
        """Get total count for search results"""
        query = select(func.count(Quiz.id))
        
        # Build filters (same as search_quizzes_advanced)
        filters = []
        
        if search_query:
            search_filter = or_(
                Quiz.title.ilike(f"%{search_query}%"),
                Quiz.description.ilike(f"%{search_query}%")
            )
            filters.append(search_filter)
        
        if user_id:
            filters.append(Quiz.user_id == user_id)
        
        if exclude_user_id:
            filters.append(Quiz.user_id != exclude_user_id)
        
        if is_ai_generated is not None:
            filters.append(Quiz.is_ai_generated == is_ai_generated)
        
        if filters:
            query = query.where(and_(*filters))
        
        # Handle tags filtering
        if tags:
            for tag_name in tags:
                query = query.join(Quiz.tags).where(Tag.name == tag_name)
        
        result = await self.db.execute(query)
        return result.scalar() or 0

    async def get_quiz_count_by_user(self, user_id: UUID) -> int:
        """Get total number of quizzes created by user"""
        query = select(func.count(Quiz.id)).where(Quiz.user_id == user_id)
        result = await self.db.execute(query)
        return result.scalar() or 0

    async def get_all_tags(self) -> List[Tag]:
        """Get all available tags"""
        query = select(Tag).order_by(Tag.name)
        result = await self.db.execute(query)
        return result.scalars().unique().all()

    async def get_tags_with_search(self, search: str = None, limit: int = 50) -> List[Tag]:
        """Get tags with optional search"""
        query = select(Tag)
        
        if search:
            query = query.where(Tag.name.ilike(f"%{search}%"))
        
        query = query.order_by(Tag.name).limit(limit)
        result = await self.db.execute(query)
        return result.scalars().unique().all()
