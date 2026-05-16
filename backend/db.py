import os
from typing import Any

import asyncpg
from dotenv import load_dotenv

# Load environment variables from .env.local
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env.local'))

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is required")

async def init_db(app) -> None:
    app.state.db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=5)
    
    # Create tables if they don't exist
    pool = app.state.db_pool
    await pool.execute("""
        CREATE EXTENSION IF NOT EXISTS pgcrypto;

        CREATE TABLE IF NOT EXISTS roadmaps (
            id SERIAL PRIMARY KEY,
            user_email TEXT NOT NULL,
            education TEXT NOT NULL,
            interests TEXT NOT NULL,
            barriers TEXT NOT NULL,
            custom_roadmap JSONB NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS users (
            email TEXT PRIMARY KEY UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS enrollments (
            id SERIAL PRIMARY KEY,
            user_email TEXT NOT NULL UNIQUE,
            master_plan JSONB NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS user_stats (
            id SERIAL PRIMARY KEY,
            user_email TEXT NOT NULL UNIQUE,
            current_year INT DEFAULT 1,
            year_1_quiz_score INT DEFAULT 0,
            year_2_quiz_score INT DEFAULT 0,
            year_3_quiz_score INT DEFAULT 0,
            year_4_quiz_score INT DEFAULT 0,
            year_5_quiz_score INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS student_profiles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT UNIQUE NOT NULL,
            major_applied TEXT,
            assigned_track INTEGER,
            iq_style TEXT,
            preliminary_score NUMERIC DEFAULT 0.0,
            strengths TEXT[],
            weaknesses TEXT[],
            is_admitted BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS curriculum (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            major VARCHAR(120) NOT NULL,
            module_name VARCHAR(255) NOT NULL,
            module_code VARCHAR(50) UNIQUE NOT NULL,
            description TEXT,
            year_level INT NOT NULL CHECK (year_level BETWEEN 1 AND 5),
            semester INT NOT NULL CHECK (semester IN (1,2)),
            difficulty_rank INT NOT NULL CHECK (difficulty_rank BETWEEN 1 AND 10),
            content_type VARCHAR(50) NOT NULL,
            estimated_hours INT DEFAULT 0,
            is_core BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS module_dependencies (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            module_id UUID NOT NULL REFERENCES curriculum(id) ON DELETE CASCADE,
            requires_id UUID NOT NULL REFERENCES curriculum(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT NOW(),
            CONSTRAINT unique_dependency UNIQUE(module_id, requires_id)
        );

        CREATE TABLE IF NOT EXISTS student_progress (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
            module_id UUID NOT NULL REFERENCES curriculum(id),
            status VARCHAR(20) NOT NULL CHECK (status IN ('LOCKED', 'AVAILABLE', 'COMPLETED')),
            completed_at TIMESTAMP,
            progress_percent INT DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
            created_at TIMESTAMP DEFAULT NOW(),
            CONSTRAINT unique_student_module UNIQUE(student_id, module_id)
        );
    """)

    # Create indexes for better performance
    await pool.execute("""
        CREATE INDEX IF NOT EXISTS idx_roadmaps_user_email ON roadmaps(user_email);
        CREATE INDEX IF NOT EXISTS idx_roadmaps_created_at ON roadmaps(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_enrollments_user_email ON enrollments(user_email);
        CREATE INDEX IF NOT EXISTS idx_user_stats_user_email ON user_stats(user_email);
        CREATE INDEX IF NOT EXISTS idx_student_profiles_user_id ON student_profiles(user_id);
        CREATE INDEX IF NOT EXISTS idx_curriculum_major_year ON curriculum(major, year_level);
        CREATE INDEX IF NOT EXISTS idx_curriculum_major ON curriculum(major);
        CREATE INDEX IF NOT EXISTS idx_curriculum_year ON curriculum(year_level);
        CREATE INDEX IF NOT EXISTS idx_module_dependencies_module ON module_dependencies(module_id);
        CREATE INDEX IF NOT EXISTS idx_module_dependencies_requires ON module_dependencies(requires_id);
        CREATE INDEX IF NOT EXISTS idx_student_progress_student_module ON student_progress(student_id, module_id);
        CREATE INDEX IF NOT EXISTS idx_progress_student ON student_progress(student_id);
    """)

    await pool.execute("""
        CREATE TABLE IF NOT EXISTS module_content (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            module_id UUID NOT NULL REFERENCES curriculum(id) ON DELETE CASCADE,
            markdown_content TEXT,
            video_url TEXT,
            quiz_data JSONB,
            created_at TIMESTAMP DEFAULT NOW(),
            CONSTRAINT unique_module_content UNIQUE(module_id)
        );

        CREATE TABLE IF NOT EXISTS learning_sessions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
            module_id UUID NOT NULL REFERENCES curriculum(id) ON DELETE CASCADE,
            session_started_at TIMESTAMP DEFAULT NOW(),
            last_heartbeat TIMESTAMP DEFAULT NOW(),
            progress_percent INT DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
            total_watch_seconds INT DEFAULT 0,
            completed BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW(),
            CONSTRAINT unique_learning_session UNIQUE(student_id, module_id)
        );

        CREATE INDEX IF NOT EXISTS idx_learning_sessions_student_module ON learning_sessions(student_id, module_id);
        CREATE INDEX IF NOT EXISTS idx_learning_sessions_student ON learning_sessions(student_id);
    """)

    await pool.execute("""
        ALTER TABLE roadmaps
        ADD COLUMN IF NOT EXISTS education TEXT NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS interests TEXT NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS barriers TEXT NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS custom_roadmap JSONB NOT NULL DEFAULT '[]';
    """)
    await pool.execute("""
        ALTER TABLE student_profiles
        ADD COLUMN IF NOT EXISTS preliminary_score NUMERIC DEFAULT 0.0;
    """)
    await pool.execute("""
        ALTER TABLE user_stats
        ADD COLUMN IF NOT EXISTS total_xp INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS current_level INT DEFAULT 1,
        ADD COLUMN IF NOT EXISTS completed_modules INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS perfect_quiz_count INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS streak_days INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    """)

    await seed_computer_science_curriculum(pool)

async def close_db(app) -> None:
    if getattr(app.state, "db_pool", None) is not None:
        await app.state.db_pool.close()


def get_db_pool(app) -> asyncpg.pool.Pool:
    return app.state.db_pool


async def fetch_roadmaps(pool: asyncpg.Pool, user_email: str) -> list[dict[str, Any]]:
    rows = await pool.fetch(
        """
        SELECT id, user_email, education, interests, barriers, custom_roadmap, created_at
        FROM roadmaps
        WHERE user_email = $1
        ORDER BY created_at DESC
        """,
        user_email,
    )
    return [dict(row) for row in rows]


async def insert_roadmap(
    pool: asyncpg.Pool,
    user_email: str,
    education: str,
    interests: str,
    barriers: str,
    custom_roadmap: list[str],
) -> dict[str, Any]:
    row = await pool.fetchrow(
        """
        INSERT INTO roadmaps (user_email, education, interests, barriers, custom_roadmap)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, user_email, education, interests, barriers, custom_roadmap, created_at
        """,
        user_email,
        education,
        interests,
        barriers,
        custom_roadmap,
    )
    return dict(row)


async def delete_roadmap(pool: asyncpg.Pool, roadmap_id: int, user_email: str) -> str:
    return await pool.execute(
        "DELETE FROM roadmaps WHERE id = $1 AND user_email = $2",
        roadmap_id,
        user_email,
    )


async def insert_enrollment(
    pool: asyncpg.Pool,
    user_email: str,
    master_plan: dict[str, Any],
) -> dict[str, Any]:
    row = await pool.fetchrow(
        """
        INSERT INTO enrollments (user_email, master_plan)
        VALUES ($1, $2)
        ON CONFLICT (user_email) DO UPDATE SET
            master_plan = EXCLUDED.master_plan,
            created_at = CURRENT_TIMESTAMP
        RETURNING id, user_email, master_plan, created_at
        """,
        user_email,
        master_plan,
    )
    
    # Initialize user stats when enrolled
    await pool.execute(
        """
        INSERT INTO user_stats (user_email, current_year)
        VALUES ($1, 1)
        ON CONFLICT (user_email) DO NOTHING
        """,
        user_email,
    )
    
    return dict(row) if row else {}


async def fetch_enrollment(pool: asyncpg.Pool, user_email: str) -> dict[str, Any] | None:
    row = await pool.fetchrow(
        """
        SELECT id, user_email, master_plan, created_at
        FROM enrollments
        WHERE user_email = $1
        ORDER BY created_at DESC
        LIMIT 1
        """,
        user_email,
    )
    return dict(row) if row else None


async def get_user_stats(pool: asyncpg.Pool, user_email: str) -> dict[str, Any] | None:
    row = await pool.fetchrow(
        """
        SELECT * FROM user_stats WHERE user_email = $1
        """,
        user_email,
    )
    return dict(row) if row else None


async def update_user_stats(
    pool: asyncpg.Pool,
    user_email: str,
    current_year: int = None,
    quiz_score: dict[str, int] = None,
    total_xp: int = None,
    current_level: int = None,
    completed_modules: int = None,
    perfect_quiz_count: int = None,
    streak_days: int = None,
    last_activity_at: str = None,
) -> dict[str, Any]:
    """Update user stats with support for XP, level, and streak tracking"""
    updates = []
    values = [user_email]
    param_count = 2

    if current_year is not None:
        updates.append(f"current_year = ${param_count}")
        values.append(current_year)
        param_count += 1

    if quiz_score:
        for year, score in quiz_score.items():
            updates.append(f"{year}_quiz_score = ${param_count}")
            values.append(score)
            param_count += 1

    if total_xp is not None:
        updates.append(f"total_xp = ${param_count}")
        values.append(total_xp)
        param_count += 1

    if current_level is not None:
        updates.append(f"current_level = ${param_count}")
        values.append(current_level)
        param_count += 1

    if completed_modules is not None:
        updates.append(f"completed_modules = ${param_count}")
        values.append(completed_modules)
        param_count += 1

    if perfect_quiz_count is not None:
        updates.append(f"perfect_quiz_count = ${param_count}")
        values.append(perfect_quiz_count)
        param_count += 1

    if streak_days is not None:
        updates.append(f"streak_days = ${param_count}")
        values.append(streak_days)
        param_count += 1

    if last_activity_at is not None:
        updates.append(f"last_activity_at = ${param_count}")
        values.append(last_activity_at)
        param_count += 1

    if not updates:
        return await get_user_stats(pool, user_email) or {}

    updates.append("updated_at = NOW()")

    query = f"""
        UPDATE user_stats 
        SET {', '.join(updates)}
        WHERE user_email = $1
        RETURNING *
    """

    row = await pool.fetchrow(query, *values)
    return dict(row) if row else {}


async def insert_student_profile(
    pool: asyncpg.Pool,
    user_id: str,
    major_applied: str,
    assigned_track: int,
    iq_style: str,
    preliminary_score: float,
    strengths: list[str] = None,
    weaknesses: list[str] = None,
    is_admitted: bool = True,
) -> dict[str, Any]:
    row = await pool.fetchrow(
        """
        INSERT INTO student_profiles (user_id, major_applied, assigned_track, iq_style, preliminary_score, strengths, weaknesses, is_admitted)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, user_id, major_applied, assigned_track, iq_style, preliminary_score, strengths, weaknesses, is_admitted, created_at
        """,
        user_id,
        major_applied,
        assigned_track,
        iq_style,
        preliminary_score,
        strengths or [],
        weaknesses or [],
        is_admitted,
    )
    return dict(row) if row else {}


async def fetch_student_profile(pool: asyncpg.Pool, user_id: str) -> dict[str, Any] | None:
    row = await pool.fetchrow(
        """
        SELECT * FROM student_profiles WHERE user_id = $1
        """,
        user_id,
    )
    return dict(row) if row else None


async def bootstrap_student_profile(
    pool: asyncpg.Pool,
    user_id: str,
    major_applied: str = "Computer Science",
    assigned_track: int = 4,
    iq_style: str = "Step-by-Step",
) -> dict[str, Any]:
    existing = await fetch_student_profile(pool, user_id)
    if existing:
        return existing

    row = await pool.fetchrow(
        """
        INSERT INTO student_profiles (
            user_id,
            major_applied,
            assigned_track,
            iq_style,
            preliminary_score,
            strengths,
            weaknesses,
            is_admitted
        ) VALUES ($1, $2, $3, $4, 0.0, ARRAY[]::text[], ARRAY[]::text[], FALSE)
        RETURNING *
        """,
        user_id,
        major_applied,
        assigned_track,
        iq_style,
    )
    return dict(row) if row else {}


async def complete_student_module(
    pool: asyncpg.Pool,
    student_id: str,
    module_id: str,
) -> dict[str, Any]:
    module_exists = await pool.fetchval(
        "SELECT EXISTS(SELECT 1 FROM curriculum WHERE id = $1)",
        module_id,
    )
    if not module_exists:
        raise ValueError(f"Module not found: {module_id}")

    row = await pool.fetchrow(
        """
        INSERT INTO student_progress (student_id, module_id, status, completed_at, progress_percent)
        VALUES ($1, $2, 'COMPLETED', NOW(), 100)
        ON CONFLICT (student_id, module_id) DO UPDATE SET
            status = 'COMPLETED',
            completed_at = NOW(),
            progress_percent = 100
        RETURNING *
        """,
        student_id,
        module_id,
    )
    return dict(row) if row else {}


async def fetch_module_detail_with_session(
    pool: asyncpg.Pool,
    student_id: str,
    module_id: str,
) -> dict[str, Any] | None:
    row = await pool.fetchrow(
        """
        SELECT
            c.id,
            c.major,
            c.module_name,
            c.module_code,
            c.description,
            c.year_level,
            c.semester,
            c.difficulty_rank,
            c.content_type,
            c.estimated_hours,
            c.is_core,
            mc.markdown_content,
            mc.video_url,
            mc.quiz_data,
            sp.status AS progress_status,
            COALESCE(sp.progress_percent, 0) AS progress_percent,
            sp.completed_at,
            ls.session_started_at,
            ls.last_heartbeat,
            COALESCE(ls.progress_percent, 0) AS session_progress_percent,
            COALESCE(ls.total_watch_seconds, 0) AS total_watch_seconds,
            COALESCE(ls.completed, FALSE) AS session_completed,
            COALESCE(prereq.dependencies, '[]'::jsonb) AS dependencies,
            COALESCE(prereq.total_count, 0) AS prerequisite_count,
            COALESCE(prereq.completed_count, 0) AS completed_prerequisite_count
        FROM curriculum c
        LEFT JOIN module_content mc ON mc.module_id = c.id
        LEFT JOIN student_progress sp ON sp.student_id = $1 AND sp.module_id = c.id
        LEFT JOIN learning_sessions ls ON ls.student_id = $1 AND ls.module_id = c.id
        LEFT JOIN LATERAL (
            SELECT
                jsonb_agg(jsonb_build_object('requires_id', md.requires_id, 'requires_name', prereq.module_name)) AS dependencies,
                COUNT(*) AS total_count,
                SUM(CASE WHEN completed_sp.status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_count
            FROM module_dependencies md
            JOIN curriculum prereq ON prereq.id = md.requires_id
            LEFT JOIN student_progress completed_sp ON completed_sp.student_id = $1
                AND completed_sp.module_id = md.requires_id
                AND completed_sp.status = 'COMPLETED'
            WHERE md.module_id = c.id
        ) prereq ON true
        WHERE c.id = $2
        """,
        student_id,
        module_id,
    )
    return dict(row) if row else None


async def fetch_learning_session(
    pool: asyncpg.Pool,
    student_id: str,
    module_id: str,
) -> dict[str, Any] | None:
    row = await pool.fetchrow(
        """
        SELECT * FROM learning_sessions
        WHERE student_id = $1
          AND module_id = $2
        """,
        student_id,
        module_id,
    )
    return dict(row) if row else None


async def upsert_learning_session(
    pool: asyncpg.Pool,
    student_id: str,
    module_id: str,
    progress_percent: int = 0,
    watch_seconds: int = 0,
    completed: bool = False,
) -> dict[str, Any]:
    row = await pool.fetchrow(
        """
        INSERT INTO learning_sessions (
            student_id,
            module_id,
            last_heartbeat,
            progress_percent,
            total_watch_seconds,
            completed
        ) VALUES ($1, $2, NOW(), $3, $4, $5)
        ON CONFLICT (student_id, module_id) DO UPDATE SET
            last_heartbeat = NOW(),
            progress_percent = GREATEST(learning_sessions.progress_percent, EXCLUDED.progress_percent),
            total_watch_seconds = learning_sessions.total_watch_seconds + EXCLUDED.total_watch_seconds,
            completed = learning_sessions.completed OR EXCLUDED.completed
        RETURNING *
        """,
        student_id,
        module_id,
        progress_percent,
        watch_seconds,
        completed,
    )
    return dict(row) if row else {}


async def fetch_module_prerequisite_ids(
    pool: asyncpg.Pool,
    module_id: str,
) -> list[str]:
    rows = await pool.fetch(
        """
        SELECT requires_id FROM module_dependencies WHERE module_id = $1
        """,
        module_id,
    )
    return [row["requires_id"] for row in rows]


async def fetch_completed_module_ids(
    pool: asyncpg.Pool,
    student_id: str,
) -> set[str]:
    rows = await pool.fetch(
        """
        SELECT module_id FROM student_progress
        WHERE student_id = $1
          AND status = 'COMPLETED'
        """,
        student_id,
    )
    return {row["module_id"] for row in rows}


async def fetch_completed_module_count(
    pool: asyncpg.Pool,
    student_id: str,
) -> int:
    return await pool.fetchval(
        """
        SELECT COUNT(*) FROM student_progress
        WHERE student_id = $1
          AND passed = TRUE
        """,
        student_id,
    ) or 0


async def fetch_module_quiz_data(
    pool: asyncpg.Pool,
    module_id: str,
) -> dict[str, Any]:
    row = await pool.fetchrow(
        """
        SELECT quiz_data FROM module_content WHERE module_id = $1
        """,
        module_id,
    )
    return dict(row)["quiz_data"] if row else {}


async def fetch_module_summary(
    pool: asyncpg.Pool,
    module_id: str,
) -> dict[str, Any] | None:
    row = await pool.fetchrow(
        """
        SELECT id, module_name, difficulty_rank, year_level, semester
        FROM curriculum
        WHERE id = $1
        """,
        module_id,
    )
    return dict(row) if row else None


async def achievement_exists(
    conn: asyncpg.Connection,
    user_email: str,
    achievement_type: str,
) -> bool:
    return await conn.fetchval(
        """
        SELECT EXISTS(
            SELECT 1 FROM achievements
            WHERE user_email = $1 AND achievement_type = $2
        )
        """,
        user_email,
        achievement_type,
    )


async def insert_achievement(
    conn: asyncpg.Connection,
    user_email: str,
    achievement_type: str,
    achievement_title: str,
    achievement_description: str | None,
    xp_bonus: int = 0,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    row = await conn.fetchrow(
        """
        INSERT INTO achievements (
            user_email,
            achievement_type,
            achievement_title,
            achievement_description,
            xp_bonus,
            metadata
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (user_email, achievement_type) DO NOTHING
        RETURNING *
        """,
        user_email,
        achievement_type,
        achievement_title,
        achievement_description,
        xp_bonus,
        metadata,
    )
    return dict(row) if row else None


async def fetch_dependent_module_ids(
    pool: asyncpg.Pool,
    prerequisite_module_id: str,
) -> list[str]:
    rows = await pool.fetch(
        """
        SELECT module_id FROM module_dependencies WHERE requires_id = $1
        """,
        prerequisite_module_id,
    )
    return [row["module_id"] for row in rows]


async def complete_student_module_with_cascade(
    pool: asyncpg.Pool,
    student_id: str,
    module_id: str,
    quiz_score: int,
    time_spent_seconds: int,
) -> dict[str, Any]:
    async with pool.acquire() as conn:
        async with conn.transaction():
            module_exists = await conn.fetchval(
                "SELECT EXISTS(SELECT 1 FROM curriculum WHERE id = $1)",
                module_id,
            )
            if not module_exists:
                raise ValueError(f"Module not found: {module_id}")

            progress_row = await conn.fetchrow(
                """
                SELECT status, passed, mastery_score, xp_earned, attempts_count
                FROM student_progress
                WHERE student_id = $1
                  AND module_id = $2
                """,
                student_id,
                module_id,
            )

            previous_passed = bool(progress_row and progress_row.get("passed"))
            previous_xp = int(progress_row["xp_earned"] or 0) if progress_row else 0
            previous_mastery = int(progress_row["mastery_score"] or 0) if progress_row else 0
            attempts = int(progress_row["attempts_count"] or 0) + 1
            mastery_score = max(previous_mastery, quiz_score)
            passed = quiz_score >= 70

            difficulty_rank = await conn.fetchval(
                "SELECT difficulty_rank FROM curriculum WHERE id = $1",
                module_id,
            )
            from backend.services.xp_engine import calculate_xp
            earned_this_attempt = calculate_xp(int(difficulty_rank or 1), quiz_score) if passed and not previous_passed else 0
            total_xp = previous_xp + earned_this_attempt

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
                ) VALUES ($1, $2, $3, CASE WHEN $7 THEN NOW() ELSE NULL END, 100, $4, $5, $6, $7)
                ON CONFLICT (student_id, module_id) DO UPDATE SET
                    status = CASE WHEN student_progress.status = 'COMPLETED' THEN student_progress.status ELSE EXCLUDED.status END,
                    completed_at = CASE WHEN EXCLUDED.passed AND student_progress.passed = FALSE THEN NOW() ELSE student_progress.completed_at END,
                    progress_percent = GREATEST(student_progress.progress_percent, EXCLUDED.progress_percent),
                    mastery_score = GREATEST(student_progress.mastery_score, EXCLUDED.mastery_score),
                    xp_earned = student_progress.xp_earned + $5,
                    attempts_count = EXCLUDED.attempts_count,
                    passed = student_progress.passed OR EXCLUDED.passed
                RETURNING *
                """,
                student_id,
                module_id,
                'COMPLETED' if passed else progress_row["status"] if progress_row else 'AVAILABLE',
                mastery_score,
                earned_this_attempt,
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

            return {
                "progress": dict(progress_row) if progress_row else {},
                "unlocked": unlocked,
                "xp_awarded": earned_this_attempt,
                "passed": passed,
            }


async def update_learning_session_heartbeat(
    pool: asyncpg.Pool,
    student_id: str,
    module_id: str,
    progress_percent: int,
    watch_seconds: int,
) -> dict[str, Any]:
    module_exists = await pool.fetchval(
        "SELECT EXISTS(SELECT 1 FROM curriculum WHERE id = $1)",
        module_id,
    )
    if not module_exists:
        raise ValueError(f"Module not found: {module_id}")

    row = await pool.fetchrow(
        """
        INSERT INTO learning_sessions (
            student_id,
            module_id,
            last_heartbeat,
            progress_percent,
            total_watch_seconds,
            completed
        ) VALUES ($1, $2, NOW(), $3, $4, FALSE)
        ON CONFLICT (student_id, module_id) DO UPDATE SET
            last_heartbeat = NOW(),
            progress_percent = GREATEST(learning_sessions.progress_percent, EXCLUDED.progress_percent),
            total_watch_seconds = learning_sessions.total_watch_seconds + EXCLUDED.total_watch_seconds
        RETURNING *
        """,
        student_id,
        module_id,
        progress_percent,
        watch_seconds,
    )
    return dict(row) if row else {}


async def insert_user(pool: asyncpg.Pool, email: str, password_hash: str) -> dict[str, Any]:
    row = await pool.fetchrow(
        """
        INSERT INTO users (email, password_hash)
        VALUES ($1, $2)
        RETURNING email, created_at
        """,
        email,
        password_hash,
    )
    return dict(row) if row else {}


async def seed_computer_science_curriculum(pool: asyncpg.Pool) -> None:
    entry_count = await pool.fetchval(
        "SELECT COUNT(*) FROM curriculum WHERE major = $1",
        "Computer Science",
    )
    if entry_count and entry_count > 0:
        return

    curriculum_rows = [
        (
            "Computer Science",
            "Python Fundamentals",
            "CS101",
            "Introduction to Python programming, basic syntax, data structures, and scripting fundamentals.",
            1,
            1,
            2,
            "Core",
            40,
            True,
        ),
        (
            "Computer Science",
            "Data Structures",
            "CS102",
            "Fundamental data structures, algorithmic thinking, and memory management.",
            1,
            2,
            5,
            "Core",
            50,
            True,
        ),
        (
            "Computer Science",
            "Algorithms",
            "CS201",
            "Design and analysis of algorithms, complexity, sorting, search, and recursion.",
            2,
            1,
            6,
            "Core",
            55,
            True,
        ),
        (
            "Computer Science",
            "Object-Oriented Design",
            "CS202",
            "Principles of object-oriented programming, design patterns, and modular architecture.",
            2,
            2,
            4,
            "Core",
            45,
            True,
        ),
        (
            "Computer Science",
            "Databases and SQL",
            "CS203",
            "Relational databases, SQL queries, normalization, and transaction management.",
            3,
            1,
            5,
            "Core",
            50,
            True,
        ),
        (
            "Computer Science",
            "Web Systems and APIs",
            "CS301",
            "Web development fundamentals, RESTful API design, client-server architecture, and deployments.",
            3,
            2,
            6,
            "Core",
            55,
            True,
        ),
        (
            "Computer Science",
            "Machine Learning Foundations",
            "CS401",
            "Introductory machine learning concepts, linear models, evaluation, and practical workflows.",
            4,
            1,
            7,
            "Core",
            60,
            True,
        ),
        (
            "Computer Science",
            "AI Ethics and Responsible Technology",
            "CS402",
            "Ethics, fairness, and societal impact of AI systems in modern computing environments.",
            4,
            2,
            5,
            "Elective",
            35,
            False,
        ),
        (
            "Computer Science",
            "Advanced Algorithms and Optimization",
            "CS501",
            "Higher-level algorithmic concepts, complexity optimization, graph theory, and advanced data structures.",
            5,
            1,
            9,
            "Core",
            65,
            True,
        ),
        (
            "Computer Science",
            "Capstone Project",
            "CS502",
            "A year-long capstone experience integrating systems design, teamwork, and deployment of a real product.",
            5,
            2,
            8,
            "Capstone",
            80,
            True,
        ),
    ]

    await pool.executemany(
        """
        INSERT INTO curriculum (
            major,
            module_name,
            module_code,
            description,
            year_level,
            semester,
            difficulty_rank,
            content_type,
            estimated_hours,
            is_core
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (module_code) DO NOTHING
        """,
        curriculum_rows,
    )

    dependency_pairs = [
        ("CS102", "CS101"),
        ("CS201", "CS102"),
        ("CS202", "CS101"),
        ("CS203", "CS102"),
        ("CS301", "CS201"),
        ("CS301", "CS202"),
        ("CS401", "CS203"),
        ("CS401", "CS201"),
        ("CS402", "CS203"),
        ("CS501", "CS201"),
        ("CS501", "CS401"),
        ("CS502", "CS301"),
        ("CS502", "CS401"),
    ]

    for module_code, requires_code in dependency_pairs:
        await insert_module_dependency(pool, module_code, requires_code)

    await validate_dependency_graph(pool)

    await pool.execute(
        """
        INSERT INTO module_content (module_id, markdown_content, video_url, quiz_data)
        VALUES
            ((SELECT id FROM curriculum WHERE module_code = 'CS101'), $1, $2, $3),
            ((SELECT id FROM curriculum WHERE module_code = 'CS102'), $4, $5, $6)
        ON CONFLICT (module_id) DO NOTHING
        """,
        "# Python Fundamentals\n\nWelcome to *Python Fundamentals*. In this module you will learn the basics of Python programming, including variables, control flow, functions, and data structures.\n\n## Learning Objectives\n\n- Understand Python syntax and evaluation order\n- Write functions and use loops and branches\n- Inspect data structures like lists and dictionaries\n\n### Example Equation\n\nThe growth of a simple loop can be expressed as: `O(n)`\n\n### Quick code sample\n\n```python\nfor i in range(5):\n    print(i * 2)\n```\n",
        "https://www.youtube.com/embed/rfscVS0vtbw",
        '{"questions": [{"question": "What is the correct syntax to define a function in Python?","options": ["function myFunc()", "def myFunc():", "func myFunc()", "define myFunc()"],"correct_answer": 1}]}',
        "# Data Structures\n\nData Structures are essential for storing and organizing information efficiently. This lesson covers arrays, lists, stacks, queues, and trees.\n\n### Recurrence Example\n\nA recursive sequence can be written as: $f(n)=f(n-1)+f(n-2)$.\n\n### Why it matters\n\nEfficient data structures help reduce time complexity from `O(n^2)` to `O(n log n)` when used correctly.\n",
        "https://www.youtube.com/embed/bum_19loj9A",
        '{"questions": [{"question": "Which of these is a linear data structure?","options": ["Tree","Graph","Array","Hash Table"],"correct_answer": 2}]}',
    )


async def insert_module_dependency(
    pool: asyncpg.Pool,
    module_code: str,
    requires_code: str,
) -> None:
    module_id = await pool.fetchval(
        "SELECT id FROM curriculum WHERE module_code = $1",
        module_code,
    )
    prereq_id = await pool.fetchval(
        "SELECT id FROM curriculum WHERE module_code = $1",
        requires_code,
    )

    if not module_id or not prereq_id:
        raise ValueError(f"Invalid dependency reference: {module_code} -> {requires_code}")
    if module_id == prereq_id:
        raise ValueError(f"Module cannot depend on itself: {module_code}")

    await pool.execute(
        """
        INSERT INTO module_dependencies (module_id, requires_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
        """,
        module_id,
        prereq_id,
    )


async def validate_dependency_graph(pool: asyncpg.Pool) -> None:
    rows = await pool.fetch(
        "SELECT module_id, requires_id FROM module_dependencies"
    )

    adjacency: dict[str, list[str]] = {}
    for row in rows:
        adjacency.setdefault(row["module_id"], []).append(row["requires_id"])

    visited: set[str] = set()
    in_stack: set[str] = set()

    def dfs(node: str) -> None:
        if node in in_stack:
            raise ValueError("Circular dependency detected in module_dependencies")
        if node in visited:
            return
        visited.add(node)
        in_stack.add(node)
        for neighbor in adjacency.get(node, []):
            dfs(neighbor)
        in_stack.remove(node)

    for module_id in adjacency:
        if module_id not in visited:
            dfs(module_id)


async def fetch_curriculum_for_major(
    pool: asyncpg.Pool,
    major: str,
    max_year: int,
) -> list[dict[str, Any]]:
    rows = await pool.fetch(
        """
        SELECT id, major, module_name, module_code, description, year_level, semester,
               difficulty_rank, content_type, estimated_hours, is_core
        FROM curriculum
        WHERE major = $1
          AND year_level <= $2
        ORDER BY year_level ASC, semester ASC, difficulty_rank ASC
        """,
        major,
        max_year,
    )
    return [dict(row) for row in rows]


async def fetch_module_dependencies(
    pool: asyncpg.Pool,
    module_ids: list[str],
) -> list[dict[str, Any]]:
    if not module_ids:
        return []
    rows = await pool.fetch(
        """
        SELECT md.module_id, md.requires_id, prerequisite.module_name AS requires_name
        FROM module_dependencies md
        JOIN curriculum prerequisite ON prerequisite.id = md.requires_id
        WHERE md.module_id = ANY($1::uuid[])
        """,
        module_ids,
    )
    return [dict(row) for row in rows]


async def fetch_student_progress(
    pool: asyncpg.Pool,
    student_id: str,
) -> list[dict[str, Any]]:
    rows = await pool.fetch(
        """
        SELECT module_id, status, progress_percent, completed_at
        FROM student_progress
        WHERE student_id = $1
        """,
        student_id,
    )
    return [dict(row) for row in rows]
