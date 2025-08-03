from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from services.results_service.app.api.results_router import router as results_router


app = FastAPI(summary="Results Service")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(results_router, prefix="/results", tags=["results"])