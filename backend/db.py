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
            assigned_track INTEGER, -- 3, 4, or 5 years
            iq_style TEXT, -- "Analytical", "Creative", "Practical"
            preliminary_score NUMERIC DEFAULT 0.0,
            strengths TEXT[], -- Array of topics they aced
            weaknesses TEXT[], -- Array of topics they struggled with
            is_admitted BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
) -> dict[str, Any]:
    """Update user stats - current year and quiz scores"""
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
    
    if not updates:
        return await get_user_stats(pool, user_email) or {}
    
    updates.append(f"updated_at = NOW()")
    
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


async def fetch_user_by_email(pool: asyncpg.Pool, email: str) -> dict[str, Any] | None:
    row = await pool.fetchrow(
        """
        SELECT email, password_hash, created_at
        FROM users
        WHERE email = $1
        """,
        email,
    )
    return dict(row) if row else None


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
