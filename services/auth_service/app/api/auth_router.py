from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from services.auth_service.app.services.auth_service import authenticate_user, get_user_from_token, create_new_user, get_user, get_user_by_id
from services.auth_service.app.schemas import CreateUserRequest, LoginForm, Token, User, RegisterForm, RefreshTokenRequest
from services.auth_service.app.utils import create_access_token, create_refresh_token, verify_token
from services.auth_service.app.dependencies import db_depends
from uuid import UUID

router = APIRouter(tags=["auth"])


@router.post("/login", response_model=Token, status_code=status.HTTP_200_OK)
async def login(db: db_depends, form: LoginForm):
    
    user = await authenticate_user(db, form.email, form.password)
    
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid credentials")
    
    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/register", response_model=Token, status_code=status.HTTP_200_OK)
async def register(form: RegisterForm, db: db_depends):
    existing_user = await get_user(db, form.email)
    
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")
    
    new_user = CreateUserRequest(email=form.email, password=form.password)
    
    result = await create_new_user(new_user, db)
    
    if result:
        # Создаем JWT токены для нового пользователя
        access_token = create_access_token({"sub": str(result.id)})
        refresh_token = create_refresh_token({"sub": str(result.id)})
        
        return Token(
            access_token=access_token,
            refresh_token=refresh_token,
        )
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST)

@router.post("/profile", response_model=User, status_code=status.HTTP_200_OK)
async def get_profile(current_user : Annotated[User, Depends(get_user_from_token)]):
    return current_user

@router.get("/user/{user_id}", response_model=User, status_code=status.HTTP_200_OK)
async def get_user_by_id_endpoint(user_id: UUID, db: db_depends):
    """Get user by ID"""
    user = await get_user_by_id(db, user_id)
    
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    return user

@router.post("/refresh", response_model=Token, status_code=status.HTTP_200_OK)
async def refresh_token(request: RefreshTokenRequest):
    try:
        # Проверяем refresh token
        payload = verify_token(request.refresh_token)
        user_id = payload.get("sub")
        
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
        
        # Создаем новые токены
        access_token = create_access_token({"sub": user_id})
        new_refresh_token = create_refresh_token({"sub": user_id})
        
        return Token(
            access_token=access_token,
            refresh_token=new_refresh_token,
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")