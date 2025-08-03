from fastapi import APIRouter, Depends
from services.results_service.app.schemas import CreateUserResult, Result
from services.results_service.app.dependencies import db_depends
from services.results_service.app.services.results_service import user_result, create_user_result
from services.shared.edu_shared.dependencies import get_current_user_id

router = APIRouter()



@router.get("/result", response_model=Result)
async def get_user_result(db: db_depends, current_user_id: str = Depends(get_current_user_id)):
    return await user_result(current_user_id, db)


@router.post("/result", response_model=Result)
async def add_user_result(user_result: CreateUserResult, db: db_depends, current_user_id: str = Depends(get_current_user_id),):
    result = await create_user_result(user_result, db, current_user_id) 
    
    return result