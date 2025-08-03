from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    DATABASE_URL : str
    
    class Config:
        env_file = Path.cwd() / ".env" 
        env_file_encoding = "utf-8"
        extra = "allow"
    
    
settings = Settings()
