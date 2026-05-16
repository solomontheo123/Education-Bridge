from pydantic import BaseModel
from typing import List, Optional


class RoadmapNode(BaseModel):
    id: str
    module_name: str
    module_code: str
    year_level: int
    semester: int
    difficulty_rank: int
    content_type: str
    estimated_hours: int
    is_core: bool
    status: str
    dependencies: List[str]
    description: Optional[str] = None
