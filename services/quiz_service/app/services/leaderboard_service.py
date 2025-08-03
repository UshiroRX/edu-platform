from typing import List, Optional, Dict, Any
from uuid import UUID
import json
import httpx
from services.quiz_service.app.db import redis_client
from services.quiz_service.app.config import settings


class LeaderboardService:
    """Сервис для работы с leaderboard используя Redis ZSET"""
    
    LEADERBOARD_KEY = "quiz_leaderboard"
    USER_DATA_KEY = "user_data"
    
    @staticmethod
    async def get_user_email_from_auth(user_id: str) -> Optional[str]:
        """
        Получает email пользователя из auth service
        
        Args:
            user_id: ID пользователя
            
        Returns:
            Optional[str]: Email пользователя или None
        """
        try:
            # Получаем базовый URL для auth service
            auth_base_url = "http://auth-service:8000"
            
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{auth_base_url}/auth/user/{user_id}")
                
                if response.status_code == 200:
                    user_data = response.json()
                    return user_data.get("email")
                else:
                    print(f"Failed to get user data for {user_id}: {response.status_code}")
                    return None
        except Exception as e:
            print(f"Error getting user data from auth service: {e}")
            return None
    
    @staticmethod
    async def add_user_score(user_id: str, score: int, user_data: Dict[str, Any] = None) -> bool:
        """
        Добавляет или обновляет баллы пользователя в leaderboard
        
        Args:
            user_id: ID пользователя
            score: Количество баллов
            user_data: Дополнительные данные пользователя (email, name и т.д.)
        
        Returns:
            bool: True если успешно добавлено
        """
        try:
            # Получаем email пользователя
            email = None
            if user_data and user_data.get("email"):
                email = user_data["email"]
            else:
                email = await LeaderboardService.get_user_email_from_auth(user_id)
            
            if not email:
                print(f"Could not get email for user {user_id}")
                return False
            
            # Добавляем баллы в ZSET используя email как ключ
            await redis_client.zadd(LeaderboardService.LEADERBOARD_KEY, {email: score})
            
            # Сохраняем дополнительные данные пользователя если предоставлены
            if user_data:
                user_data_json = json.dumps(user_data)
                await redis_client.hset(LeaderboardService.USER_DATA_KEY, email, user_data_json)
            
            return True
        except Exception as e:
            print(f"Error adding user score: {e}")
            return False
    
    @staticmethod
    async def get_user_score(user_id: str) -> Optional[int]:
        """
        Получает баллы пользователя
        
        Args:
            user_id: ID пользователя
            
        Returns:
            Optional[int]: Баллы пользователя или None если не найден
        """
        try:
            # Получаем email пользователя
            email = await LeaderboardService.get_user_email_from_auth(user_id)
            if not email:
                return None
            
            score = await redis_client.zscore(LeaderboardService.LEADERBOARD_KEY, email)
            return int(score) if score is not None else None
        except Exception as e:
            print(f"Error getting user score: {e}")
            return None
    
    @staticmethod
    async def get_user_rank(user_id: str) -> Optional[int]:
        """
        Получает позицию пользователя в рейтинге (1-based)
        
        Args:
            user_id: ID пользователя
            
        Returns:
            Optional[int]: Позиция в рейтинге или None если не найден
        """
        try:
            # Получаем email пользователя
            email = await LeaderboardService.get_user_email_from_auth(user_id)
            if not email:
                return None
            
            rank = await redis_client.zrevrank(LeaderboardService.LEADERBOARD_KEY, email)
            return int(rank + 1) if rank is not None else None
        except Exception as e:
            print(f"Error getting user rank: {e}")
            return None
    
    @staticmethod
    async def get_leaderboard(top: int = 10, with_user_data: bool = True) -> List[Dict[str, Any]]:
        """
        Получает топ пользователей по баллам
        
        Args:
            top: Количество топ пользователей
            with_user_data: Включать ли данные пользователей
            
        Returns:
            List[Dict]: Список пользователей с их баллами и позициями
        """
        try:
            # Получаем топ пользователей с баллами (по убыванию)
            top_users = await redis_client.zrevrange(
                LeaderboardService.LEADERBOARD_KEY, 
                0, 
                top - 1, 
                withscores=True
            )
            
            result = []
            for i, (email, score) in enumerate(top_users):
                user_info = {
                    "user_id": email,  # Используем email как user_id для отображения
                    "score": int(score),
                    "rank": i + 1
                }
                
                # Добавляем данные пользователя если запрошены
                if with_user_data:
                    user_data = await redis_client.hget(LeaderboardService.USER_DATA_KEY, email)
                    if user_data:
                        try:
                            user_info["user_data"] = json.loads(user_data)
                        except:
                            # Если данные повреждены, создаем базовые данные
                            user_info["user_data"] = {"email": email}
                    else:
                        # Если данных нет в Redis, создаем базовые данные
                        user_info["user_data"] = {"email": email}
                
                result.append(user_info)
            
            return result
        except Exception as e:
            print(f"Error getting leaderboard: {e}")
            return []
    
    @staticmethod
    async def get_users_around_user(user_id: str, range_size: int = 5) -> List[Dict[str, Any]]:
        """
        Получает пользователей вокруг указанного пользователя
        
        Args:
            user_id: ID пользователя
            range_size: Количество пользователей с каждой стороны
            
        Returns:
            List[Dict]: Список пользователей с их баллами и позициями
        """
        try:
            # Получаем email пользователя
            email = await LeaderboardService.get_user_email_from_auth(user_id)
            if not email:
                return []
            
            # Получаем позицию пользователя
            user_rank = await redis_client.zrevrank(LeaderboardService.LEADERBOARD_KEY, email)
            if user_rank is None:
                return []
            
            # Вычисляем диапазон
            start_rank = max(0, user_rank - range_size)
            end_rank = user_rank + range_size
            
            # Получаем пользователей в диапазоне
            users = await redis_client.zrevrange(
                LeaderboardService.LEADERBOARD_KEY,
                start_rank,
                end_rank,
                withscores=True
            )
            
            result = []
            for i, (user_email, score) in enumerate(users):
                user_info = {
                    "user_id": user_email,  # Используем email как user_id
                    "score": int(score),
                    "rank": start_rank + i + 1,
                    "is_current_user": user_email == email
                }
                
                # Добавляем данные пользователя
                user_data = await redis_client.hget(LeaderboardService.USER_DATA_KEY, user_email)
                if user_data:
                    try:
                        user_info["user_data"] = json.loads(user_data)
                    except:
                        # Если данные повреждены, создаем базовые данные
                        user_info["user_data"] = {"email": user_email}
                else:
                    # Если данных нет в Redis, создаем базовые данные
                    user_info["user_data"] = {"email": user_email}
                
                result.append(user_info)
            
            return result
        except Exception as e:
            print(f"Error getting users around user: {e}")
            return []
    
    @staticmethod
    async def get_total_users() -> int:
        """
        Получает общее количество пользователей в leaderboard
        
        Returns:
            int: Количество пользователей
        """
        try:
            return await redis_client.zcard(LeaderboardService.LEADERBOARD_KEY)
        except Exception as e:
            print(f"Error getting total users: {e}")
            return 0
    
    @staticmethod
    async def remove_user(user_id: str) -> bool:
        """
        Удаляет пользователя из leaderboard
        
        Args:
            user_id: ID пользователя
            
        Returns:
            bool: True если успешно удален
        """
        try:
            # Получаем email пользователя
            email = await LeaderboardService.get_user_email_from_auth(user_id)
            if not email:
                return False
            
            # Удаляем из ZSET
            await redis_client.zrem(LeaderboardService.LEADERBOARD_KEY, email)
            
            # Удаляем данные пользователя
            await redis_client.hdel(LeaderboardService.USER_DATA_KEY, email)
            
            return True
        except Exception as e:
            print(f"Error removing user: {e}")
            return False
    
    @staticmethod
    async def clear_leaderboard() -> bool:
        """
        Очищает весь leaderboard
        
        Returns:
            bool: True если успешно очищен
        """
        try:
            await redis_client.delete(LeaderboardService.LEADERBOARD_KEY)
            await redis_client.delete(LeaderboardService.USER_DATA_KEY)
            return True
        except Exception as e:
            print(f"Error clearing leaderboard: {e}")
            return False 