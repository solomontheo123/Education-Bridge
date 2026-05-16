from __future__ import annotations
import logging
import time
from typing import Any
from backend.db import fetch_curriculum_for_major, fetch_module_dependencies, fetch_student_progress
from backend.models.curriculum import CurriculumModule

logger = logging.getLogger("education_bridge.roadmap")


def _build_module_map(rows: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    return {row["id"]: row for row in rows}


def _validate_no_cycles(module_ids: set[str], prerequisite_map: dict[str, list[str]]) -> None:
    visited: set[str] = set()
    completed: set[str] = set()

    def visit(node_id: str) -> None:
        if node_id in completed:
            return
        if node_id in visited:
            raise ValueError("Circular dependency detected in curriculum graph")

        visited.add(node_id)
        for requirement in prerequisite_map.get(node_id, []):
            visit(requirement)
        visited.remove(node_id)
        completed.add(node_id)

    for node_id in module_ids:
        if node_id not in completed:
            visit(node_id)


def _priority_key(module: dict[str, Any], iq_style: str, assigned_track: int) -> tuple[int, int, str]:
    year_level = module["year_level"]
    difficulty = module["difficulty_rank"]
    if iq_style.lower() == "analytical":
        return (year_level, -difficulty, module["module_name"])
    return (year_level, difficulty, module["module_name"])


def _topological_sort(modules: list[dict[str, Any]], prerequisite_map: dict[str, list[str]], assigned_track: int, iq_style: str) -> list[dict[str, Any]]:
    module_map = _build_module_map(modules)
    indegree: dict[str, int] = {module_id: len(prerequisite_map.get(module_id, [])) for module_id in module_map}
    dependents: dict[str, list[str]] = {}
    for module_id, requirements in prerequisite_map.items():
        for requirement in requirements:
            dependents.setdefault(requirement, []).append(module_id)

    available = [module_map[module_id] for module_id, degree in indegree.items() if degree == 0]
    available.sort(key=lambda module: _priority_key(module, iq_style, assigned_track))

    sorted_modules: list[dict[str, Any]] = []
    while available:
        current = available.pop(0)
        sorted_modules.append(current)
        for child_id in dependents.get(current["id"], []):
            indegree[child_id] -= 1
            if indegree[child_id] == 0:
                available.append(module_map[child_id])
        available.sort(key=lambda module: _priority_key(module, iq_style, assigned_track))

    if len(sorted_modules) != len(modules):
        raise ValueError("Curriculum contains a cycle or unresolved prerequisite chain")

    return sorted_modules


def _resolve_status(module_id: str, prerequisites: list[str], completed_modules: set[str]) -> str:
    if module_id in completed_modules:
        return "COMPLETED"
    if all(requirement in completed_modules for requirement in prerequisites):
        return "AVAILABLE"
    return "LOCKED"


def _build_dependency_map(dependency_rows: list[dict[str, Any]]) -> dict[str, list[dict[str, str]]]:
    graph: dict[str, list[dict[str, str]]] = {}
    for row in dependency_rows:
        graph.setdefault(row["module_id"], []).append({
            "requires_id": row["requires_id"],
            "requires_name": row["requires_name"],
        })
    return graph


def _assemble_nodes(
    modules: list[dict[str, Any]],
    dependency_rows: list[dict[str, Any]],
    progress_rows: list[dict[str, Any]],
    iq_style: str,
    assigned_track: int,
) -> list[dict[str, Any]]:
    module_map = _build_module_map(modules)
    dependency_map = _build_dependency_map(dependency_rows)
    student_completed = {
        row["module_id"]
        for row in progress_rows
        if row["status"] == "COMPLETED" or row.get("progress_percent") == 100
    }

    prerequisite_map = {
        module_id: [entry["requires_id"] for entry in dependency_map.get(module_id, []) if entry["requires_id"] in module_map]
        for module_id in module_map
    }

    _validate_no_cycles(set(module_map), prerequisite_map)
    sorted_modules = _topological_sort(modules, prerequisite_map, assigned_track, iq_style)

    roadmap: list[dict[str, Any]] = []
    for module in sorted_modules:
        module_id = module["id"]
        dependencies = [dependency["requires_name"] for dependency in dependency_map.get(module_id, [])]
        status = _resolve_status(module_id, prerequisite_map.get(module_id, []), student_completed)

        roadmap.append({
            "id": module_id,
            "module_name": module["module_name"],
            "module_code": module["module_code"],
            "year_level": module["year_level"],
            "semester": module["semester"],
            "difficulty_rank": module["difficulty_rank"],
            "content_type": module["content_type"],
            "estimated_hours": module["estimated_hours"],
            "is_core": module["is_core"],
            "description": module.get("description"),
            "status": status,
            "dependencies": dependencies,
        })

    return roadmap


async def build_student_roadmap(pool: Any, student_profile: dict[str, Any]) -> list[dict[str, Any]]:
    major = student_profile.get("major_applied") or "Computer Science"
    assigned_track = int(student_profile.get("assigned_track") or 4)
    iq_style = student_profile.get("iq_style") or "Step-by-Step"
    student_id = student_profile.get("id")
    start_time = time.perf_counter()

    modules = await fetch_curriculum_for_major(pool, major, assigned_track)
    module_ids = [module["id"] for module in modules]
    dependency_rows = await fetch_module_dependencies(pool, module_ids)
    progress_rows = await fetch_student_progress(pool, student_id)

    roadmap = _assemble_nodes(modules, dependency_rows, progress_rows, iq_style, assigned_track)
    duration_ms = int((time.perf_counter() - start_time) * 1000)
    unlocked_count = sum(1 for node in roadmap if node["status"] == "AVAILABLE")

    logger.info(
        "Generated roadmap for %s major=%s track=%s style=%s modules=%d unlocked=%d duration=%dms",
        student_id,
        major,
        assigned_track,
        iq_style,
        len(roadmap),
        unlocked_count,
        duration_ms,
    )

    return roadmap
