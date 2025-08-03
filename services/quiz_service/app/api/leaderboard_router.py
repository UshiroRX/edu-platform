from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from services.quiz_service.app.schemas import (
    LeaderboardResponse,
    LeaderboardEntry,
    UserScoreUpdate,
    UserData
)
from services.quiz_service.app.services.leaderboard_service import LeaderboardService
from services.shared.edu_shared.dependencies import get_current_user_id

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


@router.get("/", response_model=LeaderboardResponse)
async def get_leaderboard(
    top: int = Query(10, ge=1, le=100, description="Количество топ пользователей"),
    current_user_id: str = Depends(get_current_user_id)
):
    """
    Получает топ пользователей по баллам
    """
    try:
        # Получаем leaderboard
        entries_data = await LeaderboardService.get_leaderboard(top=top, with_user_data=True)
        
        # Получаем информацию о текущем пользователе
        current_user_rank = await LeaderboardService.get_user_rank(current_user_id)
        current_user_score = await LeaderboardService.get_user_score(current_user_id)
        total_users = await LeaderboardService.get_total_users()
        
        # Преобразуем данные в схемы
        entries = []
        for entry_data in entries_data:
            user_data = None
            if "user_data" in entry_data:
                user_data = UserData(**entry_data["user_data"])
            
            entry = LeaderboardEntry(
                user_id=entry_data["user_id"],
                score=entry_data["score"],
                rank=entry_data["rank"],
                user_data=user_data
            )
            entries.append(entry)
        
        return LeaderboardResponse(
            entries=entries,
            total_users=total_users,
            current_user_rank=current_user_rank,
            current_user_score=current_user_score
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting leaderboard: {str(e)}"
        )


@router.get("/user/{user_id}/around", response_model=List[LeaderboardEntry])
async def get_users_around_user(
    user_id: str,
    range_size: int = Query(5, ge=1, le=20, description="Количество пользователей с каждой стороны")
):
    """
    Получает пользователей вокруг указанного пользователя
    """
    try:
        entries_data = await LeaderboardService.get_users_around_user(user_id, range_size)
        
        entries = []
        for entry_data in entries_data:
            user_data = None
            if "user_data" in entry_data:
                user_data = UserData(**entry_data["user_data"])
            
            entry = LeaderboardEntry(
                user_id=entry_data["user_id"],
                score=entry_data["score"],
                rank=entry_data["rank"],
                user_data=user_data
            )
            entries.append(entry)
        
        return entries
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting users around user: {str(e)}"
        )


@router.post("/user/{user_id}/score")
async def update_user_score(
    user_id: str,
    score_update: UserScoreUpdate,
    current_user_id: str = Depends(get_current_user_id)
):
    """
    Обновляет баллы пользователя (только для своего аккаунта)
    """
    if user_id != current_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own score"
        )
    
    try:
        user_data = None
        if score_update.user_data:
            user_data = score_update.user_data.dict()
        
        success = await LeaderboardService.add_user_score(
            user_id=user_id,
            score=score_update.score,
            user_data=user_data
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update user score"
            )
        
        return {"message": "Score updated successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating user score: {str(e)}"
        )


@router.get("/user/{user_id}/score")
async def get_user_score(user_id: str):
    """
    Получает баллы пользователя
    """
    try:
        score = await LeaderboardService.get_user_score(user_id)
        rank = await LeaderboardService.get_user_rank(user_id)
        
        if score is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found in leaderboard"
            )
        
        return {
            "user_id": user_id,
            "score": score,
            "rank": rank
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting user score: {str(e)}"
        )


@router.delete("/user/{user_id}")
async def remove_user_from_leaderboard(
    user_id: str,
    current_user_id: str = Depends(get_current_user_id)
):
    """
    Удаляет пользователя из leaderboard (только для своего аккаунта)
    """
    if user_id != current_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only remove your own account from leaderboard"
        )
    
    try:
        success = await LeaderboardService.remove_user(user_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to remove user from leaderboard"
            )
        
        return {"message": "User removed from leaderboard successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error removing user from leaderboard: {str(e)}"
        )


@router.delete("/clear")
async def clear_leaderboard():
    """
    Очищает весь leaderboard (только для администраторов)
    """
    try:
        success = await LeaderboardService.clear_leaderboard()
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to clear leaderboard"
            )
        
        return {"message": "Leaderboard cleared successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error clearing leaderboard: {str(e)}"
        ) 