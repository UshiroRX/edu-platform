from uuid import UUID
from pydantic import BaseModel, Field

class CreateUserResult(BaseModel):
    points: int = Field(..., ge=0, le=140)

    class Config:
        from_attributes = True

class Result(BaseModel):
    id: UUID
    user_id: UUID
    points: int = Field(..., ge=0, le=140)

    class Config:
        from_attributes = True
