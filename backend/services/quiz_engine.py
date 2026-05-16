from typing import Any


def validate_quiz_answers(quiz_data: dict[str, Any], answers: list[int]) -> dict[str, int | bool]:
    questions = quiz_data.get("questions", []) if isinstance(quiz_data, dict) else []
    correct_count = 0

    for index, question in enumerate(questions):
        selected = answers[index] if index < len(answers) else -1
        if isinstance(selected, int) and selected == question.get("correct_answer"):
            correct_count += 1

    total_questions = len(questions)
    if total_questions == 0:
        score = 100
    else:
        score = round((correct_count / total_questions) * 100)

    return {
        "score": max(0, min(score, 100)),
        "passed": score >= 70,
        "correct_count": correct_count,
        "total_questions": total_questions,
    }
