from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from services.quiz_service.app.dependencies import db_depends
from services.quiz_service.app.schemas import (
    QuizCreate,
    QuizUpdate,
    QuizResponse,
    QuizListResponse,
    PaginatedQuizResponse,
    QuizSearchParams,
    QuizResult,
    QuizResultResponse,
    TagResponse,
)
from services.quiz_service.app.services.quiz_service import QuizService
from services.quiz_service.app.services.gemini_service import GeminiService, QuizGenerationRequest
from services.quiz_service.app.utils import get_quiz_with_questions
from services.shared.edu_shared.dependencies import get_current_user_id

router = APIRouter()


@router.post("/", response_model=QuizResponse, status_code=status.HTTP_201_CREATED)
async def create_quiz(
    quiz_data: QuizCreate,
    db: db_depends,
    user_id: str = Depends(get_current_user_id),
):
    """Create a new quiz"""
    quiz_service = QuizService(db)
    quiz = await quiz_service.create_quiz(quiz_data, UUID(user_id))
    return QuizResponse.model_validate(quiz)


@router.get("/{quiz_id}", response_model=QuizResponse)
async def get_quiz(quiz_id: UUID, db: db_depends):
    """Get quiz by ID with all questions and answers"""
    quiz = await get_quiz_with_questions(quiz_id, db)

    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found"
        )

    return QuizResponse.model_validate(quiz)


@router.get("/user/{user_id}", response_model=PaginatedQuizResponse)
async def get_user_quizzes(
    user_id: UUID,
    db: db_depends,
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(10, ge=1, le=50, description="Items per page"),
):
    """Get quizzes created by user with proper pagination"""
    quiz_service = QuizService(db)

    # Calculate offset
    offset = (page - 1) * size

    # Get quizzes and total count
    quizzes = await quiz_service.get_quizzes_by_user(user_id, size, offset)
    total_count = await quiz_service.get_quiz_count_by_user(user_id)

    # Convert to response format - фронтенд сам посчитает количество вопросов
    items = [QuizListResponse.model_validate(quiz) for quiz in quizzes]

    # Calculate pagination info
    total_pages = (total_count + size - 1) // size
    has_next = page < total_pages
    has_prev = page > 1

    return PaginatedQuizResponse(
        items=items,
        total=total_count,
        limit=size,
        offset=offset,
        has_next=has_next,
        has_prev=has_prev,
    )


@router.put("/{quiz_id}", response_model=QuizResponse)
async def update_quiz(
    quiz_id: UUID,
    quiz_data: QuizUpdate,
    db: db_depends,
    user_id: str = Depends(get_current_user_id),
):
    """Update quiz (only owner can update)"""
    quiz_service = QuizService(db)

    # Check if quiz exists and user owns it
    quiz = await get_quiz_with_questions(quiz_id, db)
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found"
        )

    if str(quiz.user_id) != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own quizzes",
        )

    updated_quiz = await quiz_service.update_quiz(quiz_id, quiz_data)
    if not updated_quiz:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update quiz"
        )
    return QuizResponse.model_validate(updated_quiz)


@router.delete("/{quiz_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quiz(
    quiz_id: UUID,
    db: db_depends,
    user_id: str = Depends(get_current_user_id),
):
    """Delete quiz (only owner can delete)"""
    quiz_service = QuizService(db)

    # Check if quiz exists and user owns it
    quiz = await get_quiz_with_questions(quiz_id, db)
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found"
        )

    if str(quiz.user_id) != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own quizzes",
        )

    success = await quiz_service.delete_quiz(quiz_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete quiz",
        )


@router.get("/search/", response_model=PaginatedQuizResponse)
async def search_quizzes(
    db: db_depends,
    q: Optional[str] = Query(None, description="Search query (title or description)"),
    tags: Optional[List[str]] = Query(None, description="Filter by tags"),
    user_id: Optional[UUID] = Query(None, description="Filter by user"),
    exclude_user_id: Optional[UUID] = Query(None, description="Exclude quizzes by user"),
    is_ai_generated: Optional[bool] = Query(
        None, description="Filter by AI generation"
    ),
    sort_by: str = Query(
        "created_at", description="Sort by: created_at, title, updated_at"
    ),
    sort_order: str = Query("desc", description="Sort order: asc, desc"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(10, ge=1, le=50, description="Items per page"),
):
    """Search quizzes with advanced filtering and pagination"""
    quiz_service = QuizService(db)

    # Calculate offset
    offset = (page - 1) * size

    # Validate sort parameters
    valid_sort_fields = ["created_at", "title", "updated_at"]
    if sort_by not in valid_sort_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid sort_by. Must be one of: {valid_sort_fields}",
        )

    if sort_order not in ["asc", "desc"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="sort_order must be 'asc' or 'desc'",
        )

    # Get quizzes with filters
    quizzes = await quiz_service.search_quizzes_advanced(
        search_query=q,
        tags=tags,
        user_id=user_id,
        exclude_user_id=exclude_user_id,
        is_ai_generated=is_ai_generated,
        sort_by=sort_by,
        sort_order=sort_order,
        limit=size,
        offset=offset,
    )

    # Get total count for pagination
    total_count = await quiz_service.get_search_count(
        search_query=q, 
        tags=tags, 
        user_id=user_id, 
        exclude_user_id=exclude_user_id,
        is_ai_generated=is_ai_generated
    )

    # Convert to response format - фронтенд сам посчитает количество вопросов
    items = [QuizListResponse.model_validate(quiz) for quiz in quizzes]

    # Calculate pagination info
    total_pages = (total_count + size - 1) // size
    has_next = page < total_pages
    has_prev = page > 1

    return PaginatedQuizResponse(
        items=items,
        total=total_count,
        limit=size,
        offset=offset,
        has_next=has_next,
        has_prev=has_prev,
    )


@router.get("/tags/", response_model=List[TagResponse])
async def get_all_tags(
    db: db_depends,
    search: Optional[str] = Query(None, description="Search tags by name"),
    limit: int = Query(50, ge=1, le=100, description="Maximum tags to return"),
):
    """Get all available tags with optional search"""
    quiz_service = QuizService(db)
    tags = await quiz_service.get_tags_with_search(search, limit)
    return [TagResponse.model_validate(tag) for tag in tags]


@router.get("/user/{user_id}/count")
async def get_user_quiz_count(user_id: UUID, db: db_depends):
    """Get total number of quizzes created by user"""
    quiz_service = QuizService(db)
    count = await quiz_service.get_quiz_count_by_user(user_id)
    return {"user_id": user_id, "quiz_count": count, "status": "success"}

@router.post("/{quiz_id}/calculate-result", response_model=QuizResultResponse)
async def calculate_quiz_result(
    quiz_id: UUID, 
    result: QuizResult, 
    db: db_depends, 
    user_id: str = Depends(get_current_user_id)
):
    """Calculate quiz result"""
    print(f"Backend received quiz_id: {quiz_id}")
    print(f"Backend received result: {result}")
    print(f"Backend received answers: {result.answers}")
    
    quiz_service = QuizService(db)
    quiz = await quiz_service.get_quiz(quiz_id)
    
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    # Подсчитываем результаты
    total_questions = len(quiz.questions)
    correct_answers = 0
    total_points = 0
    earned_points = 0
    
    for question in quiz.questions:
        user_answer = next((a for a in result.answers if a.question_id == question.id), None)
        
        if question.question_type == "long_answer":
            # Для текстовых вопросов проверяем, есть ли ответ пользователя
            if user_answer and user_answer.text_answer and user_answer.text_answer.strip():
                # Если есть правильные ответы в базе, проверяем совпадение
                correct_answer_list = [a for a in question.answers if a.is_correct]
                if correct_answer_list:
                    # Проверяем, содержит ли ответ пользователя ключевые слова из правильных ответов
                    user_answer_lower = user_answer.text_answer.lower().strip()
                    is_correct = any(
                        correct_answer.answer_text.lower().strip() in user_answer_lower or
                        user_answer_lower in correct_answer.answer_text.lower().strip()
                        for correct_answer in correct_answer_list
                    )
                else:
                    # Если нет правильных ответов в базе, считаем любой непустой ответ правильным
                    is_correct = True
                
                if is_correct:
                    correct_answers += 1
                    earned_points += question.points
                
                total_points += question.points
                print(f"Text question: {question.question_text}")
                print(f"User answer: {user_answer.text_answer}")
                print(f"Correct answers in DB: {[a.answer_text for a in question.answers if a.is_correct]}")
                print(f"Is correct: {is_correct}")
                print(f"Points: {question.points}, Earned: {earned_points if is_correct else 0}")
            else:
                print(f"Text question without answer: {question.question_text}")
                print(f"User answer: {user_answer.text_answer if user_answer else 'No user answer'}")
                total_points += question.points
        else:
            # Для вопросов с выбором
            if user_answer and user_answer.answers:
                correct_answer_ids = [str(a.id) for a in question.answers if a.is_correct]
                user_answer_ids = user_answer.answers
                
                is_correct = (
                    len(correct_answer_ids) == len(user_answer_ids) and
                    all(aid in correct_answer_ids for aid in user_answer_ids)
                )
                
                if is_correct:
                    correct_answers += 1
                    earned_points += question.points
                
                total_points += question.points
                print(f"Choice question: {question.question_text}")
                print(f"User answers: {user_answer.answers}")
                print(f"Correct answers: {correct_answer_ids}")
                print(f"Is correct: {is_correct}")
                print(f"Points: {question.points}, Earned: {earned_points if is_correct else 0}")
            else:
                total_points += question.points
    
    # Рассчитываем процент правильных ответов
    score = round((correct_answers / total_questions) * 100) if total_questions > 0 else 0
    
    return QuizResultResponse(
        score=score,
        total_questions=total_questions,
        correct_answers=correct_answers,
        total_points=total_points,
        earned_points=earned_points,
        answers=result.answers,
        details=[]  # Пустой массив деталей
    )

@router.post("/generate-with-ai", response_model=QuizResponse, status_code=status.HTTP_201_CREATED)
async def generate_quiz_with_ai(
    request: QuizGenerationRequest,
    db: db_depends,
    user_id: str = Depends(get_current_user_id),
):
    """Generate quiz with AI"""
    try:
        gemini_service = GeminiService()
        generated_quiz = await gemini_service.generate_quiz_with_fallback(request)
        
        # Преобразуем сгенерированный квиз в формат QuizCreate
        quiz_data = QuizCreate(
            title=generated_quiz.title,
            description=generated_quiz.description,
            is_ai_generated=True,
            tags=[],  # Можно добавить автоматические теги
            questions=[
                {
                    "question_type": q["question_type"],
                    "question_text": q["question_text"],
                    "points": q["points"],
                    "answers": [
                        {
                            "answer_text": a["answer_text"],
                            "is_correct": a["is_correct"]
                        }
                        for a in q["answers"]
                    ]
                }
                for q in generated_quiz.questions
            ]
        )
        
        # Создаем квиз в базе данных
        quiz_service = QuizService(db)
        quiz = await quiz_service.create_quiz(quiz_data, UUID(user_id))
        
        return QuizResponse.model_validate(quiz)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка генерации квиза: {str(e)}"
        )
