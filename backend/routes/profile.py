from typing import Any
from fastapi import APIRouter, Depends, Request, HTTPException, status
from backend.auth import get_current_user
from backend.db import bootstrap_student_profile, get_db_pool, fetch_student_profile

router = APIRouter()


@router.post("/profile/bootstrap")
async def bootstrap_profile(request: Request, current_user: dict = Depends(get_current_user)) -> dict[str, Any]:
    pool = get_db_pool(request.app)
    user_id = current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user token")

    profile = await bootstrap_student_profile(pool, user_id)
    if not profile:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create student profile")
    return profile


@router.get("/profile")
async def get_profile(request: Request, current_user: dict = Depends(get_current_user)) -> dict[str, Any]:
    pool = get_db_pool(request.app)
    user_id = current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user token")

    profile = await fetch_student_profile(pool, user_id)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found")
    return profile
