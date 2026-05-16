from dataclasses import dataclass
from typing import List, Optional


@dataclass
class CurriculumModule:
    id: str
    major: str
    module_name: str
    module_code: str
    description: Optional[str]
    year_level: int
    semester: int
    difficulty_rank: int
    content_type: str
    estimated_hours: int
    is_core: bool


@dataclass
class ModuleDependency:
    module_id: str
    requires_id: str
    requires_name: str


@dataclass
class StudentProgressEntry:
    module_id: str
    status: str
    progress_percent: int
    completed_at: Optional[str]
