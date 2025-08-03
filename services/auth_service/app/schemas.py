from pydantic import BaseModel, EmailStr, Field
from uuid import UUID

class User(BaseModel):
    id: UUID
    email: EmailStr

    class Config:
        from_attributes = True
        

class RegisterForm(BaseModel):
    email: str
    password: str

class LoginForm(BaseModel):
    email: str
    password: str

    class Config:
        from_attributes = True

class UserCreate(User):
    password: str = Field(..., min_length=6, max_length=128)

class UserInDB(User):
    hashed_password: str

    
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    
    class Config:
        from_attributes = True

class RefreshTokenRequest(BaseModel):
    refresh_token: str