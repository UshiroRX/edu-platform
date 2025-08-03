from sqlalchemy import select
from services.auth_service.app.schemas import CreateUserRequest, User, UserInDB
from services.auth_service.app.utils import get_password_hash, verify_password
from jose import jwt
from services.auth_service.app.config import settings
from sqlalchemy.ext.asyncio import AsyncSession
from services.auth_service.app.models import User as Users
from services.auth_service.app.dependencies import  token_depends, db_depends

async def get_user(db : AsyncSession, email: str) -> UserInDB:
    query = select(Users).where(Users.email == email)
    result = await db.execute(query)
    user = result.scalars().first()

    if user is None:
        return None
    return UserInDB.model_validate(user)


async def authenticate_user(db : AsyncSession, email: str, password: str) -> bool:
    user = await get_user(db, email)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user


async def get_user_by_id(db : AsyncSession, user_id: int) -> UserInDB:
    query = select(Users).where(Users.id == user_id)
    result = await db.execute(query)
    user = result.scalars().first()

    if user is None:
        return None
    return UserInDB.model_validate(user)


async def get_user_from_token(db : db_depends, token: token_depends) -> User | None:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        return await get_user_by_id(db, user_id)
    except jwt.JWTError:    
        return None


async def create_new_user(request : CreateUserRequest, db : AsyncSession) -> User:
    new_user = Users(
        email=request.email,
        hashed_password=get_password_hash(request.password)
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return User.model_validate(new_user)