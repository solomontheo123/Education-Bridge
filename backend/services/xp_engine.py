import math


def calculate_xp(difficulty_rank: int, score: int) -> int:
    score = max(0, min(score, 100))
    xp = round((difficulty_rank ** 2) * (score / 10))
    return max(0, xp)


def required_xp_for_level(level: int) -> int:
    return round(100 * (level ** 1.5))


def calculate_level(total_xp: int) -> int:
    level = 1
    while total_xp >= required_xp_for_level(level + 1):
        level += 1
    return level


def xp_to_next_level(total_xp: int) -> int:
    next_level = calculate_level(total_xp) + 1
    return max(0, required_xp_for_level(next_level) - total_xp)
