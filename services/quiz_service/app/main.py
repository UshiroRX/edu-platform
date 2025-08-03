from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from services.quiz_service.app.api.quiz_router import router as quiz_router

app = FastAPI(title="Quiz Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(quiz_router, prefix="/quiz", tags=["quiz"])
