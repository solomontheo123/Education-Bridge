from typing import Any

from backend.db import complete_student_module_with_cascade


async def complete_and_unlock_modules(
    conn: Any,
    student_id: str,
    module_id: str,
    quiz_score: int,
    time_spent_seconds: int,
) -> dict[str, Any]:
    return await complete_student_module_with_cascade(
        conn,
        student_id,
        module_id,
        quiz_score,
        time_spent_seconds,
    )
