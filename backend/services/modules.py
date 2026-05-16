import logging
from datetime import datetime
from typing import Any

from backend.db import (
    complete_student_module_with_cascade,
    fetch_completed_module_count,
    fetch_module_detail_with_session,
    fetch_module_quiz_data,
    fetch_module_summary,
    get_user_stats,
    update_learning_session_heartbeat,
    update_user_stats,
    upsert_learning_session,
)
from backend.services.achievement_engine import evaluate_achievements
from backend.services.quiz_engine import validate_quiz_answers
from backend.services.xp_engine import calculate_level, calculate_xp

logger = logging.getLogger("education_bridge.modules")


async def get_module_session(
    pool: Any,
    student_profile: dict[str, Any],
    module_id: str,
) -> dict[str, Any]:
    student_id = student_profile["id"]
    module = await fetch_module_detail_with_session(pool, student_id, module_id)
    if not module:
        raise ValueError("Module not found")

    prerequisite_count = int(module.get("prerequisite_count", 0) or 0)
    completed_prerequisite_count = int(module.get("completed_prerequisite_count", 0) or 0)
    progress_status = module.get("progress_status")
    is_completed = progress_status == "COMPLETED" or module.get("session_completed", False)

    status = "AVAILABLE"
    if is_completed:
        status = "COMPLETED"
    elif prerequisite_count > completed_prerequisite_count:
        status = "LOCKED"

    if status == "LOCKED":
        raise PermissionError("Module is locked until prerequisites are complete")

    session = await upsert_learning_session(
        pool,
        student_id,
        module_id,
        progress_percent=int(module.get("progress_percent", 0) or 0),
        watch_seconds=0,
        completed=is_completed,
    )

    logger.info(
        "module_opened: student=%s module=%s status=%s session=%s",
        student_id,
        module_id,
        status,
        session.get("id"),
    )

    return {
        "id": module["id"],
        "module_name": module["module_name"],
        "module_code": module.get("module_code") or "",
        "markdown_content": module.get("markdown_content") or "",
        "video_url": module.get("video_url") or "",
        "quiz_data": module.get("quiz_data") or {"questions": []},
        "status": status,
        "progress_percent": int(module.get("progress_percent", 0) or 0),
        "completed": status == "COMPLETED",
        "session_started_at": module.get("session_started_at"),
        "last_heartbeat": module.get("last_heartbeat"),
        "total_watch_seconds": int(module.get("total_watch_seconds", 0) or 0),
        "dependencies": module.get("dependencies") or [],
    }


async def complete_module(
    pool: Any,
    student_profile: dict[str, Any],
    module_id: str,
    quiz_score: int,
    time_spent_seconds: int,
) -> dict[str, Any]:
    student_id = student_profile["id"]
    result = await complete_student_module_with_cascade(
        pool,
        student_id,
        module_id,
        quiz_score,
        time_spent_seconds,
    )

    logger.info(
        "module_completed: student=%s module=%s quiz_score=%d time_spent=%ds unlocked=%s",
        student_id,
        module_id,
        quiz_score,
        time_spent_seconds,
        result.get("unlocked"),
    )

    return result


async def submit_module_quiz(
    pool: Any,
    student_profile: dict[str, Any],
    module_id: str,
    answers: list[int],
    time_spent_seconds: int,
) -> dict[str, Any]:
    student_id = student_profile["id"]
    user_email = student_profile["user_id"]

    async with pool.acquire() as conn:
        async with conn.transaction():
            quiz_data = await fetch_module_quiz_data(conn, module_id)
            if not quiz_data or not isinstance(quiz_data.get("questions"), list):
                raise ValueError("Quiz data not available for this module")

            validation = validate_quiz_answers(quiz_data, answers)
            quiz_score = validation["score"]
            passed = validation["passed"]

            module_summary = await fetch_module_summary(conn, module_id)
            if not module_summary:
                raise ValueError("Module not found")

            difficulty_rank = int(module_summary.get("difficulty_rank") or 1)
            xp_for_module = calculate_xp(difficulty_rank, quiz_score) if passed else 0

            existing_progress = await conn.fetchrow(
                """
                SELECT status, passed, xp_earned, mastery_score, attempts_count
                FROM student_progress
                WHERE student_id = $1
                  AND module_id = $2
                """,
                student_id,
                module_id,
            )

            previous_passed = bool(existing_progress and existing_progress.get("passed"))
            previous_xp = int(existing_progress["xp_earned"] or 0) if existing_progress else 0
            attempts = int(existing_progress["attempts_count"] or 0) + 1
            mastery_score = max(int(existing_progress["mastery_score"] or 0) if existing_progress else 0, quiz_score)
            xp_awarded = xp_for_module if passed and not previous_passed else 0
            xp_earned = previous_xp if previous_passed else xp_for_module
            completed_status = "COMPLETED" if passed else (existing_progress["status"] if existing_progress else "AVAILABLE")

            progress_row = await conn.fetchrow(
                """
                INSERT INTO student_progress (
                    student_id,
                    module_id,
                    status,
                    completed_at,
                    progress_percent,
                    mastery_score,
                    xp_earned,
                    attempts_count,
                    passed
                ) VALUES ($1, $2, $3, $4, 100, $5, $6, $7, $8)
                ON CONFLICT (student_id, module_id) DO UPDATE SET
                    status = CASE WHEN student_progress.status = 'COMPLETED' THEN student_progress.status ELSE EXCLUDED.status END,
                    completed_at = CASE WHEN EXCLUDED.passed AND student_progress.passed = FALSE THEN NOW() ELSE student_progress.completed_at END,
                    progress_percent = GREATEST(student_progress.progress_percent, EXCLUDED.progress_percent),
                    mastery_score = GREATEST(student_progress.mastery_score, EXCLUDED.mastery_score),
                    xp_earned = CASE WHEN student_progress.passed THEN student_progress.xp_earned ELSE GREATEST(student_progress.xp_earned, EXCLUDED.xp_earned) END,
                    attempts_count = EXCLUDED.attempts_count,
                    passed = student_progress.passed OR EXCLUDED.passed
                RETURNING *
                """,
                student_id,
                module_id,
                completed_status,
                datetime.utcnow() if passed else None,
                mastery_score,
                xp_earned,
                attempts,
                passed,
            )

            await conn.execute(
                """
                INSERT INTO learning_sessions (
                    student_id,
                    module_id,
                    last_heartbeat,
                    progress_percent,
                    total_watch_seconds,
                    completed
                ) VALUES ($1, $2, NOW(), 100, $3, TRUE)
                ON CONFLICT (student_id, module_id) DO UPDATE SET
                    last_heartbeat = NOW(),
                    progress_percent = 100,
                    total_watch_seconds = learning_sessions.total_watch_seconds + $3,
                    completed = TRUE
                """,
                student_id,
                module_id,
                time_spent_seconds,
            )

            unlocked: list[str] = []
            if passed:
                unlocked_rows = await conn.fetch(
                    """
                    WITH completed AS (
                        SELECT module_id
                        FROM student_progress
                        WHERE student_id = $1
                          AND status = 'COMPLETED'
                    ),
                    dependents AS (
                        SELECT m.id AS module_id
                        FROM curriculum m
                        WHERE m.id IN (SELECT module_id FROM module_dependencies WHERE requires_id = $2)
                          AND NOT EXISTS (
                              SELECT 1 FROM module_dependencies md
                              WHERE md.module_id = m.id
                                AND md.requires_id NOT IN (SELECT module_id FROM completed)
                          )
                    )
                    INSERT INTO student_progress (student_id, module_id, status, progress_percent)
                    SELECT $1, d.module_id, 'AVAILABLE', 0
                    FROM dependents d
                    ON CONFLICT (student_id, module_id) DO UPDATE SET
                        status = CASE WHEN student_progress.status = 'COMPLETED' THEN student_progress.status ELSE EXCLUDED.status END
                    RETURNING module_id
                    """,
                    student_id,
                    module_id,
                )
                unlocked = [row["module_id"] for row in unlocked_rows]

            new_achievements = []
            if passed:
                new_achievements = await evaluate_achievements(
                    conn,
                    user_email,
                    student_id,
                    module_id,
                    quiz_score,
                    time_spent_seconds,
                )

            user_stats = await get_user_stats(conn, user_email) or {}
            previous_total_xp = int(user_stats.get("total_xp") or 0)
            awarded_bonus = sum(item.get("xp_bonus", 0) for item in new_achievements)
            total_xp = previous_total_xp + xp_awarded + awarded_bonus
            current_level = calculate_level(total_xp)
            completed_modules = await fetch_completed_module_count(conn, student_id)

            streak_days = int(user_stats.get("streak_days") or 0)
            last_activity = user_stats.get("last_activity_at")
            if passed:
                from datetime import datetime, timedelta
                now = datetime.utcnow()
                if last_activity:
                    last_date = last_activity.date() if hasattr(last_activity, "date") else now.date()
                    delta = now.date() - last_date
                    if delta.days == 1:
                        streak_days += 1
                    elif delta.days > 1:
                        streak_days = 1
                else:
                    streak_days = 1
                last_activity_at = now.isoformat()
            else:
                last_activity_at = user_stats.get("last_activity_at")

            perfect_quiz_increment = 1 if any(a["title"] == "Perfect Mind" for a in new_achievements) else 0
            perfect_quiz_count = int(user_stats.get("perfect_quiz_count") or 0) + perfect_quiz_increment

            await update_user_stats(
                conn,
                user_email,
                total_xp=total_xp,
                current_level=current_level,
                completed_modules=completed_modules,
                perfect_quiz_count=perfect_quiz_count,
                streak_days=streak_days,
                last_activity_at=last_activity_at,
            )

            next_module = None
            if unlocked:
                next_summary = await fetch_module_summary(conn, unlocked[0])
                if next_summary:
                    next_module = {"id": next_summary["id"], "title": next_summary["module_name"]}

            return {
                "passed": passed,
                "score": quiz_score,
                "xp_earned": xp_awarded + awarded_bonus,
                "level_up": current_level > int(user_stats.get("current_level") or 1),
                "new_achievements": new_achievements,
                "next_module": next_module,
                "unlocked": unlocked,
            }


async def heartbeat_module(
    pool: Any,
    student_profile: dict[str, Any],
    module_id: str,
    progress_percent: int,
    watch_seconds: int,
) -> dict[str, Any]:
    student_id = student_profile["id"]
    result = await update_learning_session_heartbeat(
        pool,
        student_id,
        module_id,
        max(0, min(100, progress_percent)),
        max(0, watch_seconds),
    )

    logger.info(
        "heartbeat_received: student=%s module=%s progress=%s watch_seconds=%s",
        student_id,
        module_id,
        result.get("progress_percent"),
        result.get("total_watch_seconds"),
    )

    return result
