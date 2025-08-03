from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from services.quiz_service.app.api.quiz_router import router as quiz_router
from services.quiz_service.app.api.leaderboard_router import router as leaderboard_router
from services.quiz_service.app.config import settings

app = FastAPI(title="Quiz Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(quiz_router, prefix="/quiz", tags=["quiz"])
app.include_router(leaderboard_router, prefix="/api", tags=["leaderboard"])
