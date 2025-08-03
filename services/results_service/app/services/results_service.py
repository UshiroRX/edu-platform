

from sqlalchemy import select
from services.results_service.app.dependencies import db_depends
from services.results_service.app.models import Result
from services.results_service.app.schemas import CreateUserResult, Result as ResultSchema


async def user_result(user_id: str, db: db_depends) -> ResultSchema | None:
    query = select(Result).where(Result.user_id == user_id)
    result = await db.execute(query)
    user_result = result.scalars().first()
    
    if user_result is None:
        return None
    
    return ResultSchema.model_validate(user_result)

async def create_user_result(user_result: CreateUserResult, db: db_depends, user_id: str) -> ResultSchema:
    
    new_result = Result(
        user_id=user_id,
        points=user_result.points
    )
    
    db.add(new_result)
    await db.commit()
    await db.refresh(new_result)
    
    return ResultSchema.model_validate(new_result)