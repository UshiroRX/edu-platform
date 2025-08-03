from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated
from services.auth_service.app.db import get_session


db_depends = Annotated[AsyncSession, Depends(get_session)]


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")
token_depends = Annotated[str, Depends(oauth2_scheme)]