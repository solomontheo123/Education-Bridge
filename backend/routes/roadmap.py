from typing import Any, List
from fastapi import APIRouter, Depends, Request, HTTPException, status
from pydantic import BaseModel
from backend.auth import get_current_user
from backend.db import complete_student_module, get_db_pool, fetch_student_profile
from backend.schemas.roadmap import RoadmapNode
from backend.services.roadmap_engine import build_student_roadmap

router = APIRouter()


class CompleteModuleRequest(BaseModel):
    module_id: str


@router.get("/roadmap", response_model=List[RoadmapNode])
async def get_roadmap(request: Request, current_user: dict = Depends(get_current_user)) -> List[RoadmapNode]:
    pool = get_db_pool(request.app)
    email = current_user.get("sub")
    if not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user token")

    profile = await fetch_student_profile(pool, email)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found")

    roadmap = await build_student_roadmap(pool, profile)
    return roadmap


@router.post("/roadmap/complete-module", response_model=List[RoadmapNode])
async def complete_module(request: Request, payload: CompleteModuleRequest, current_user: dict = Depends(get_current_user)) -> List[RoadmapNode]:
    pool = get_db_pool(request.app)
    email = current_user.get("sub")
    if not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user token")

    profile = await fetch_student_profile(pool, email)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found")

    try:
        await complete_student_module(pool, profile["id"], payload.module_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    roadmap = await build_student_roadmap(pool, profile)
    return roadmap
