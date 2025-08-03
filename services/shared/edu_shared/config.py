
from pydantic_settings import BaseSettings
from pathlib import Path

class SharedSettings(BaseSettings):
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    
    class Config:
        env_file = Path.cwd() / ".env"
        extra = "allow"

async def fetch_settings() -> SharedSettings:
    return SharedSettings()
