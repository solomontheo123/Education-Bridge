from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from backend.auth import get_current_user
from backend.db import fetch_student_profile, get_db_pool
from backend.services.modules import complete_module, get_module_session, heartbeat_module, submit_module_quiz

router = APIRouter(prefix="/modules", tags=["modules"])


class CompletionPayload(BaseModel):
    quiz_score: int = Field(..., ge=0, le=100)
    time_spent_seconds: int = Field(..., ge=0)


class QuizSubmissionPayload(BaseModel):
    answers: list[int] = Field(default_factory=list)
    time_spent_seconds: int = Field(..., ge=0)


class HeartbeatPayload(BaseModel):
    progress_percent: int = Field(..., ge=0, le=100)
    watch_seconds: int = Field(..., ge=0)


@router.get("/{module_id}")
async def read_module(
    module_id: str,
    request: Request,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    pool = get_db_pool(request.app)
    user_id = current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user token")

    profile = await fetch_student_profile(pool, user_id)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found")

    try:
        module = await get_module_session(pool, profile, module_id)
        return module
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.post("/{module_id}/complete")
async def complete_module_route(
    module_id: str,
    payload: CompletionPayload,
    request: Request,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    pool = get_db_pool(request.app)
    user_id = current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user token")

    profile = await fetch_student_profile(pool, user_id)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found")

    try:
        result = await complete_module(
            pool,
            profile,
            module_id,
            payload.quiz_score,
            payload.time_spent_seconds,
        )
        return result
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/{module_id}/submit-quiz")
async def submit_quiz_route(
    module_id: str,
    payload: QuizSubmissionPayload,
    request: Request,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    pool = get_db_pool(request.app)
    user_id = current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user token")

    profile = await fetch_student_profile(pool, user_id)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found")

    try:
        result = await submit_module_quiz(
            pool,
            profile,
            module_id,
            payload.answers,
            payload.time_spent_seconds,
        )
        return result
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/{module_id}/heartbeat")
async def heartbeat_module_route(
    module_id: str,
    payload: HeartbeatPayload,
    request: Request,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    pool = get_db_pool(request.app)
    user_id = current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user token")

    profile = await fetch_student_profile(pool, user_id)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found")

    try:
        return await heartbeat_module(
            pool,
            profile,
            module_id,
            payload.progress_percent,
            payload.watch_seconds,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
