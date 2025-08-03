from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from services.auth_service.app.api.auth_router import router as auth_router
from services.auth_service.app.config import settings

app = FastAPI(summary="Authentication Service")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/auth")