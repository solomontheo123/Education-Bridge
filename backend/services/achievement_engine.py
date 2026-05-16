from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from backend.db import (
    achievement_exists,
    insert_achievement,
    fetch_completed_module_count,
    fetch_user_stats,
)


def _normalize_timestamp(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value)
        except ValueError:
            return None
    return None


async def evaluate_achievements(
    conn: Any,
    user_email: str,
    student_id: str,
    module_id: str,
    score: int,
    time_spent: int,
) -> list[dict[str, Any]]:
    stats = await fetch_user_stats(conn, user_email) or {}
    completed_count = await fetch_completed_module_count(conn, student_id)
    streak_days = int(stats.get("streak_days", 0) or 0)
    last_activity_at = _normalize_timestamp(stats.get("last_activity_at"))
    now = datetime.utcnow()
    new_achievements: list[dict[str, Any]] = []

    if completed_count == 1:
        if not await achievement_exists(conn, user_email, "first_step"):
            new_achievements.append({
                "achievement_type": "first_step",
                "achievement_title": "First Step",
                "achievement_description": "Completed your first module.",
                "xp_bonus": 25,
            })

    if completed_count == 5:
        if not await achievement_exists(conn, user_email, "novice_scholar"):
            new_achievements.append({
                "achievement_type": "novice_scholar",
                "achievement_title": "Novice Scholar",
                "achievement_description": "Completed five modules and built learning momentum.",
                "xp_bonus": 50,
            })

    if score == 100:
        if not await achievement_exists(conn, user_email, "perfect_mind"):
            new_achievements.append({
                "achievement_type": "perfect_mind",
                "achievement_title": "Perfect Mind",
                "achievement_description": "Achieved a perfect mastery score.",
                "xp_bonus": 75,
            })

    if time_spent <= 300:
        if not await achievement_exists(conn, user_email, "fast_learner"):
            new_achievements.append({
                "achievement_type": "fast_learner",
                "achievement_title": "Fast Learner",
                "achievement_description": "Completed a module in under 5 minutes.",
                "xp_bonus": 20,
            })

    if last_activity_at is not None:
        delta = now.date() - last_activity_at.date()
        if delta.days == 1:
            streak_days += 1
        elif delta.days > 1:
            streak_days = 1
    else:
        streak_days = 1

    if streak_days >= 7:
        if not await achievement_exists(conn, user_email, "consistent_learner"):
            new_achievements.append({
                "achievement_type": "consistent_learner",
                "achievement_title": "Consistent Learner",
                "achievement_description": "Completed a learning streak of 7 days.",
                "xp_bonus": 100,
            })

    awarded: list[dict[str, Any]] = []
    for achievement in new_achievements:
        row = await insert_achievement(
            conn,
            user_email,
            achievement["achievement_type"],
            achievement["achievement_title"],
            achievement["achievement_description"],
            achievement.get("xp_bonus", 0),
            {
                "module_id": module_id,
                "score": score,
                "time_spent": time_spent,
            },
        )
        if row:
            awarded.append({
                "title": row["achievement_title"],
                "description": row["achievement_description"],
                "xp_bonus": int(row["xp_bonus"] or 0),
            })

    return awarded
