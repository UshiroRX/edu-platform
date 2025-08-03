from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncAttrs
from sqlalchemy.orm import DeclarativeBase
from services.quiz_service.app.config import settings
import redis.asyncio as redis


engine = create_async_engine(settings.DATABASE_URL)

new_session = async_sessionmaker(engine, expire_on_commit=False)

async def get_session():
    async with new_session() as session:
        yield session

class Base(AsyncAttrs, DeclarativeBase):
    pass


redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)