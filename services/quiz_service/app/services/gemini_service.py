import google.generativeai as genai
from typing import List, Dict, Any
import json
import os
from pydantic import BaseModel
from services.quiz_service.app.config import settings

class QuizGenerationRequest(BaseModel):
    topic: str
    difficulty: str = "medium"  # easy, medium, hard
    question_count: int = 5
    question_types: List[str] = ["multiple_choice", "single_choice", "long_answer"]
    language: str = "ru"

class QuizGenerationResponse(BaseModel):
    title: str
    description: str
    questions: List[Dict[str, Any]]

class GeminiService:
    def __init__(self):
        api_key = settings.GOOGLE_API_KEY
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable is required")
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-1.5-flash')

    def _create_prompt(self, request: QuizGenerationRequest) -> str:
        """Создает промпт для генерации квиза"""
        
        difficulty_map = {
            "easy": "легкий",
            "medium": "средний", 
            "hard": "сложный"
        }
        
        question_types_map = {
            "multiple_choice": "множественный выбор",
            "single_choice": "один выбор",
            "long_answer": "текстовый ответ"
        }
        
        question_types_str = ", ".join([question_types_map.get(qt, qt) for qt in request.question_types])
        
        prompt = f"""
Создай квиз на тему "{request.topic}" на {difficulty_map.get(request.difficulty, request.difficulty)} уровне сложности.

Требования:
- Количество вопросов: {request.question_count}
- Типы вопросов: {question_types_str}
- Язык: {request.language}

Структура ответа (JSON):
{{
    "title": "Название квиза",
    "description": "Описание квиза",
    "questions": [
        {{
            "question_text": "Текст вопроса",
            "question_type": "multiple_choice|single_choice|long_answer",
            "points": 1,
            "answers": [
                {{
                    "answer_text": "Текст ответа",
                    "is_correct": true/false
                }}
            ]
        }}
    ]
}}

Правила:
1. Для вопросов с выбором должно быть минимум 2 ответа
2. Для вопросов типа "long_answer" все ответы должны быть правильными (is_correct: true)
3. Для single_choice только один ответ должен быть правильным
4. Для multiple_choice может быть несколько правильных ответов
5. Баллы за вопрос должны быть от 1 до 10
6. Для текстовых вопросов (long_answer) используй короткие ответы - 1-3 слова максимум
7. Для текстовых вопросов создавай простые вопросы, на которые можно ответить одним словом или короткой фразой
8. Примеры текстовых вопросов:
   - "Столица России?" → ответ: "Москва"
   - "Первый президент США?" → ответ: "Вашингтон"
   - "Столица Франции?" → ответ: "Париж"
   - "Год основания Москвы?" → ответ: "1147"
9. Ответ должен быть только в формате JSON, без дополнительного текста
"""

        return prompt

    async def generate_quiz(self, request: QuizGenerationRequest) -> QuizGenerationResponse:
        """Генерирует квиз с помощью Gemini"""
        
        try:
            prompt = self._create_prompt(request)
            
            response = self.model.generate_content(prompt)
            
            # Парсим JSON ответ
            content = response.text.strip()
            
            # Убираем возможные markdown блоки
            if content.startswith("```json"):
                content = content[7:]
            if content.endswith("```"):
                content = content[:-3]
            
            content = content.strip()
            
            quiz_data = json.loads(content)
            
            return QuizGenerationResponse(**quiz_data)
            
        except Exception as e:
            raise Exception(f"Ошибка генерации квиза: {str(e)}")

    async def generate_quiz_with_fallback(self, request: QuizGenerationRequest) -> QuizGenerationResponse:
        """Генерирует квиз с fallback логикой"""
        
        try:
            return await self.generate_quiz(request)
        except Exception as e:
            # Fallback: создаем простой квиз
            print(f"Ошибка генерации, используем fallback: {e}")
            
            return QuizGenerationResponse(
                title=f"Квиз по теме: {request.topic}",
                description=f"Автоматически созданный квиз по теме '{request.topic}'",
                questions=[
                    {
                        "question_text": f"Назовите ключевое слово в теме '{request.topic}'",
                        "question_type": "long_answer",
                        "points": 1,
                        "answers": [
                            {
                                "answer_text": "Основное понятие",
                                "is_correct": True
                            }
                        ]
                    }
                ]
            )
