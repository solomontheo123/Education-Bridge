import json
import logging
import os
import time
import base64
from contextlib import asynccontextmanager
from typing import Optional, Any, List

import bcrypt
import jwt
import redis.asyncio as aioredis
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from google.auth.transport import requests as google_auth_requests
from google.oauth2 import id_token
from groq import Groq
from pydantic import BaseModel

# Load environment variables from .env.local
load_dotenv(os.path.join(os.path.dirname(__file__), '.env.local'))

# Logging and monitoring
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=LOG_LEVEL,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("education_bridge")

# Redis configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
redis_client: Optional[aioredis.Redis] = None

# Google OAuth configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

# Password hashing functions
def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

from backend.auth import create_access_token, get_current_user
from backend.db import (
    close_db,
    fetch_roadmaps,
    get_db_pool,
    init_db,
    insert_roadmap,
    delete_roadmap,
    insert_enrollment,
    fetch_enrollment,
    get_user_stats,
    update_user_stats,
    insert_student_profile,
    fetch_student_profile,
    bootstrap_student_profile,
    complete_student_module,
    fetch_user_by_email,
    insert_user,
)

load_dotenv()

async def init_redis(app: FastAPI) -> None:
    global redis_client
    try:
        redis_client = aioredis.from_url(REDIS_URL, encoding="utf-8", decode_responses=True)
        await redis_client.ping()
        app.state.redis = redis_client
        logger.info("Connected to Redis at %s", REDIS_URL)
    except Exception as exc:
        redis_client = None
        logger.warning("Redis unavailable, falling back to in-memory stores: %s", exc)


async def close_redis(app: FastAPI) -> None:
    if getattr(app.state, "redis", None) is not None:
        await app.state.redis.close()


@asynccontextmanager
async def lifespan(app: FastAPI) -> Any:
    # Startup
    await init_db(app)
    await init_redis(app)
    yield
    # Shutdown
    await close_db(app)
    await close_redis(app)


app = FastAPI(lifespan=lifespan)

from backend.routes.roadmap import router as roadmap_router
from backend.routes.profile import router as profile_router
from backend.routes.modules import router as modules_router

app.include_router(roadmap_router)
app.include_router(profile_router)
app.include_router(modules_router)

raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001")
allowed_origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

if os.getenv("ENVIRONMENT", "development").lower() == "production":
    allowed_origins = [origin for origin in allowed_origins if origin.startswith("https://")]
    if not allowed_origins:
        raise RuntimeError("Production environment requires at least one HTTPS ALLOWED_ORIGINS entry")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ACCESS_TOKEN_EXPIRE_SECONDS = int(os.getenv("ACCESS_TOKEN_EXPIRE_SECONDS", "86400"))
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

@app.middleware("http")
async def enforce_https(request, call_next):
    if os.getenv("ENVIRONMENT", "development").lower() == "production":
        proto = request.headers.get("x-forwarded-proto", request.url.scheme)
        if proto != "https":
            target = request.url.replace(scheme="https")
            return RedirectResponse(url=str(target))
    return await call_next(request)


@app.middleware("http")
async def log_requests(request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration_ms = int((time.time() - start_time) * 1000)
    logger.info("%s %s %s %s %dms",
                request.method,
                request.url.path,
                request.client.host if request.client else "-",
                response.status_code,
                duration_ms)
    return response


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "environment": os.getenv("ENVIRONMENT", "development"),
        "redis": redis_client is not None,
    }


@app.get("/metrics")
async def metrics():
    return {
        "status": "ok",
        "redis_connected": redis_client is not None,
        "timestamp": int(time.time()),
    }


verification_codes: dict[str, str] = {}

# Simple rate limiting (in production, use Redis or a proper rate limiter)
auth_attempts: dict[str, list[float]] = {}

def get_redis() -> Optional[aioredis.Redis]:
    return redis_client


async def check_rate_limit(identifier: str, max_attempts: int = 10, window_seconds: int = 600) -> bool:
    """Rate limiting supporting Redis when available. Increased for development."""
    redis = get_redis()
    if redis:
        try:
            key = f"rate_limit:{identifier}"
            current = await redis.incr(key)
            if current == 1:
                await redis.expire(key, window_seconds)
            return current <= max_attempts
        except Exception as exc:
            logger.warning("Redis rate limit failed, falling back to memory: %s", exc)

    now = time.time()
    if identifier not in auth_attempts:
        auth_attempts[identifier] = []

    # Remove old attempts outside the window
    auth_attempts[identifier] = [t for t in auth_attempts[identifier] if now - t < window_seconds]

    if len(auth_attempts[identifier]) >= max_attempts:
        return False

    auth_attempts[identifier].append(now)
    return True


async def store_verification_code(email: str, code: str) -> None:
    redis = get_redis()
    if redis:
        await redis.setex(f"verification:{email}", 600, code)
    else:
        verification_codes[email] = code


async def get_verification_code(email: str) -> Optional[str]:
    redis = get_redis()
    if redis:
        return await redis.get(f"verification:{email}")
    return verification_codes.get(email)


async def remove_verification_code(email: str) -> None:
    redis = get_redis()
    if redis:
        await redis.delete(f"verification:{email}")
    verification_codes.pop(email, None)


async def generate_5_year_plan(interests: str) -> dict[str, Any]:
    try:
        prompt = f"""
        You are an expert career counselor and academic dean. Create a comprehensive 5-year master plan for a student based on their interests: {interests}.

        The plan should be structured as follows:
        - Year 1: Foundation courses and basic skills (12-15 courses)
        - Year 2: Intermediate level courses (10-12 courses)
        - Year 3: Advanced specialization (8-10 courses)
        - Year 4: Professional development and projects (6-8 courses)
        - Year 5: Capstone projects and career preparation (4-6 courses)

        For each year, provide:
        - 4-15 courses depending on the year (decreasing as years progress)
        - Each course should have 6-12 topics
        - Brief description of what will be learned
        - Courses should build upon each other like building blocks

        Return the response as a JSON object with the following structure:
        {{
            "year_1": {{
                "title": "Foundation Year",
                "description": "Year description",
                "courses": [
                    {{"name": "Course Name", "topics": ["Topic 1", "Topic 2", "Topic 3", ...]}},
                    ...
                ]
            }},
            "year_2": {{
                "title": "Intermediate Year",
                "description": "...",
                "courses": [...]
            }},
            ...
        }}

        Make it realistic and aligned with the student's interests. Each course should have 6+ topics.
        """

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a helpful education assistant that returns valid JSON."},
                {"role": "user", "content": prompt},
            ],
            max_tokens=2000,
            temperature=0.7,
        )

        ai_text = response.choices[0].message.content.strip()
        # Try to parse as JSON
        try:
            master_plan = json.loads(ai_text)
        except json.JSONDecodeError:
            # Fallback: create a basic structure
            master_plan = {
                "year_1": {
                    "title": "Foundation Year",
                    "description": f"Foundation year focusing on {interests}",
                    "courses": [
                        {"name": "Introduction to " + interests, "topics": ["Basic Concepts", "Fundamental Principles", "Core Terminology", "Initial Applications", "Basic Tools", "Foundation Skills", "Introduction to Theory", "Practical Basics"]},
                        {"name": "Basic Skills Development", "topics": ["Skill Assessment", "Fundamental Techniques", "Practice Exercises", "Basic Problem Solving", "Tool Usage", "Safety Protocols", "Basic Communication", "Progress Tracking"]},
                        {"name": "Foundation Course", "topics": ["Core Knowledge", "Essential Concepts", "Basic Frameworks", "Fundamental Methods", "Introduction to Systems", "Basic Analysis", "Foundation Projects", "Knowledge Application"]},
                        {"name": "Mathematics for " + interests, "topics": ["Basic Math", "Algebra Fundamentals", "Statistics Basics", "Data Analysis", "Mathematical Modeling", "Problem Solving", "Quantitative Methods", "Computational Thinking"]},
                        {"name": "Communication Skills", "topics": ["Written Communication", "Oral Presentation", "Technical Writing", "Report Preparation", "Presentation Skills", "Team Communication", "Professional Email", "Documentation"]}
                    ]
                },
                "year_2": {
                    "title": "Intermediate Year",
                    "description": f"Building on Year 1 with {interests}",
                    "courses": [
                        {"name": "Intermediate Topics", "topics": ["Advanced Fundamentals", "Intermediate Concepts", "Applied Theory", "Case Studies", "Intermediate Projects", "Analysis Techniques", "Problem Solving", "Practical Applications"]},
                        {"name": "Practical Applications", "topics": ["Real-world Scenarios", "Application Development", "Project Implementation", "Case Analysis", "Practical Exercises", "Industry Standards", "Best Practices", "Performance Evaluation"]},
                        {"name": "Project Work", "topics": ["Project Planning", "Team Collaboration", "Project Execution", "Quality Assurance", "Project Management", "Documentation", "Presentation", "Review and Feedback"]},
                        {"name": "Advanced Mathematics", "topics": ["Advanced Algebra", "Calculus", "Advanced Statistics", "Data Modeling", "Optimization", "Complex Analysis", "Mathematical Software", "Research Methods"]}
                    ]
                },
                "year_3": {
                    "title": "Advanced Year",
                    "description": f"Deep dive into {interests}",
                    "courses": [
                        {"name": "Advanced Concepts", "topics": ["Theoretical Foundations", "Advanced Theory", "Complex Systems", "Advanced Analysis", "Research Methodology", "Innovation", "Critical Thinking", "Advanced Applications"]},
                        {"name": "Specialization", "topics": ["Specialized Knowledge", "Domain Expertise", "Advanced Techniques", "Specialized Tools", "Industry Focus", "Expert Skills", "Specialization Projects", "Professional Development"]},
                        {"name": "Research Methods", "topics": ["Research Design", "Data Collection", "Analysis Methods", "Research Ethics", "Literature Review", "Hypothesis Testing", "Research Writing", "Publication"]}
                    ]
                },
                "year_4": {
                    "title": "Professional Year",
                    "description": f"Professional development in {interests}",
                    "courses": [
                        {"name": "Professional Skills", "topics": ["Professional Ethics", "Industry Standards", "Leadership", "Management", "Professional Communication", "Career Development", "Networking", "Professional Certification"]},
                        {"name": "Industry Projects", "topics": ["Industry Collaboration", "Real Projects", "Client Management", "Project Delivery", "Quality Standards", "Industry Tools", "Professional Practice", "Portfolio Development"]},
                        {"name": "Internship", "topics": ["Internship Preparation", "Workplace Integration", "Professional Skills", "Mentorship", "Performance Evaluation", "Career Planning", "Professional Networking", "Transition to Employment"]}
                    ]
                },
                "year_5": {
                    "title": "Capstone Year",
                    "description": f"Final year culminating in {interests} expertise",
                    "courses": [
                        {"name": "Capstone Project", "topics": ["Project Design", "Implementation", "Testing", "Documentation", "Presentation", "Defense", "Final Review", "Project Completion"]},
                        {"name": "Career Preparation", "topics": ["Job Search", "Resume Writing", "Interview Skills", "Career Planning", "Professional Development", "Networking", "Job Applications", "Career Transition"]},
                        {"name": "Portfolio", "topics": ["Portfolio Development", "Project Showcase", "Professional Documentation", "Achievement Highlights", "Skills Demonstration", "Career Marketing", "Professional Branding"]}
                    ]
                }
            }

        return master_plan
    except Exception as e:
        print(f"AI Error in plan generation: {str(e)}")
        # Return a default plan
        return {
            "year_1": {
                "title": "Foundation Year",
                "description": "Starting your educational journey",
                "courses": [
                    {"name": "Introduction", "topics": ["Basics", "Fundamentals", "Core Concepts", "Introduction", "Basic Skills", "Foundation", "Getting Started", "Overview"]},
                    {"name": "Basics", "topics": ["Basic Principles", "Essential Knowledge", "Core Skills", "Fundamental Concepts", "Basic Tools", "Essential Techniques", "Basic Practice", "Foundation Building"]},
                    {"name": "Foundation", "topics": ["Core Knowledge", "Basic Frameworks", "Essential Methods", "Foundation Skills", "Basic Systems", "Fundamental Analysis", "Core Projects", "Knowledge Base"]}
                ]
            },
            "year_2": {
                "title": "Intermediate Year",
                "description": "Building knowledge",
                "courses": [
                    {"name": "Intermediate", "topics": ["Intermediate Concepts", "Applied Knowledge", "Practical Skills", "Intermediate Projects", "Analysis", "Application", "Development", "Progression"]},
                    {"name": "Applications", "topics": ["Practical Application", "Real-world Use", "Implementation", "Case Studies", "Practical Exercises", "Industry Application", "Best Practices", "Performance"]},
                    {"name": "Projects", "topics": ["Project Planning", "Project Execution", "Team Work", "Project Management", "Quality Control", "Documentation", "Presentation", "Review"]}
                ]
            },
            "year_3": {
                "title": "Advanced Year",
                "description": "Deepening expertise",
                "courses": [
                    {"name": "Advanced", "topics": ["Advanced Concepts", "Theoretical Knowledge", "Complex Systems", "Advanced Analysis", "Research", "Innovation", "Critical Thinking", "Expertise"]},
                    {"name": "Specialization", "topics": ["Specialized Knowledge", "Domain Expertise", "Advanced Techniques", "Specialized Tools", "Industry Focus", "Expert Skills", "Specialization", "Professional Focus"]},
                    {"name": "Research", "topics": ["Research Methods", "Data Analysis", "Research Design", "Literature Review", "Hypothesis", "Methodology", "Research Writing", "Publication"]}
                ]
            },
            "year_4": {
                "title": "Professional Year",
                "description": "Professional skills",
                "courses": [
                    {"name": "Professional", "topics": ["Professional Ethics", "Industry Standards", "Leadership", "Management", "Professional Communication", "Career Skills", "Networking", "Certification"]},
                    {"name": "Industry", "topics": ["Industry Knowledge", "Industry Practices", "Industry Tools", "Industry Projects", "Industry Standards", "Industry Collaboration", "Industry Trends", "Industry Expertise"]},
                    {"name": "Internship", "topics": ["Internship Preparation", "Workplace Skills", "Professional Development", "Mentorship", "Performance", "Career Planning", "Professional Growth", "Employment Transition"]}
                ]
            },
            "year_5": {
                "title": "Capstone Year",
                "description": "Culmination and preparation",
                "courses": [
                    {"name": "Capstone", "topics": ["Capstone Project", "Final Project", "Comprehensive Work", "Integration", "Synthesis", "Final Presentation", "Project Defense", "Completion"]},
                    {"name": "Career", "topics": ["Career Preparation", "Job Search", "Resume", "Interview", "Career Planning", "Professional Development", "Career Goals", "Career Transition"]},
                    {"name": "Portfolio", "topics": ["Portfolio Development", "Work Showcase", "Professional Documentation", "Achievement Display", "Skills Presentation", "Career Marketing", "Professional Identity", "Career Advancement"]}
                ]
            }
        }


class UserOnboarding(BaseModel):
    education: str
    interests: str
    barriers: str


class ChatRequest(BaseModel):
    message: str
    context: dict
    history: list = []


class LoginRequest(BaseModel):
    email: str
    password: str


class SignUpRequest(BaseModel):
    email: str
    password: str


class EmailCheckRequest(BaseModel):
    email: str


class EmailCheckResponse(BaseModel):
    exists: bool


class SendVerificationRequest(BaseModel):
    email: str
    code: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    email: Optional[str] = None


class GoogleAuthRequest(BaseModel):
    token: str


def verify_google_id_token(token: str) -> dict[str, Any]:
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Google client ID is not configured")
    try:
        request = google_auth_requests.Request()
        id_info = id_token.verify_oauth2_token(token, request, GOOGLE_CLIENT_ID)
        if id_info.get("aud") != GOOGLE_CLIENT_ID:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token audience")
        if id_info.get("iss") not in ["accounts.google.com", "https://accounts.google.com"]:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token issuer")
        return id_info
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token") from exc


class RoadmapCreate(BaseModel):
    education: str
    interests: str
    barriers: str
    custom_roadmap: list[str]


class EnrollRequest(BaseModel):
    interests: str

class ExamRequest(BaseModel):
    major: str

class ExamResult(BaseModel):
    category: str
    is_correct: bool


class SubmitExamRequest(BaseModel):
    results: List[ExamResult]
    major: str


class StudentProfileResponse(BaseModel):
    assigned_track: int
    iq_style: str
    preliminary_score: float
    major_applied: str
    is_admitted: bool

@app.post("/auth/login", response_model=TokenResponse)
async def login(request: LoginRequest) -> TokenResponse:
    email = request.email.strip().lower()

    # Rate limiting
    if not await check_rate_limit(f"login_{email}"):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Please try again later."
        )

    if not email or not request.password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email and password are required")

    pool = get_db_pool(app)

    # Check if user exists and password matches
    user = await pool.fetchrow(
        "SELECT email, password_hash FROM users WHERE email = $1",
        email
    )

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    # Verify password
    if not verify_password(request.password, user['password_hash']):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    # Ensure the student profile exists before returning the token
    await bootstrap_student_profile(pool, email)
    token = create_access_token({"sub": email, "email": email}, ACCESS_TOKEN_EXPIRE_SECONDS)
    return TokenResponse(access_token=token)


@app.post("/auth/check-email", response_model=EmailCheckResponse)
async def check_email(request: EmailCheckRequest) -> EmailCheckResponse:
    email = request.email.strip().lower()
    pool = get_db_pool(app)
    exists = await pool.fetchval(
        "SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)",
        email,
    )
    return EmailCheckResponse(exists=exists)


@app.post("/auth/send-verification")
async def send_verification(request: SendVerificationRequest) -> dict[str, str]:
    email = request.email.strip().lower()
    if not email or not request.code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email and verification code are required")

    await store_verification_code(email, request.code)
    # For development: return the code so user can see it
    # In production, this would send via email/SMS
    logger.info("[Verification] code stored for %s", email)
    return {"status": "sent", "code": request.code, "message": f"Development mode: Your verification code is {request.code}"}


@app.post("/auth/verify-code")
async def verify_code(request: SendVerificationRequest) -> dict[str, bool]:
    email = request.email.strip().lower()
    code = request.code.strip()
    if not email or not code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email and verification code are required")

    expected_code = await get_verification_code(email)
    if expected_code is None or expected_code != code:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid verification code")

    # Code is valid; remove it once verified
    await remove_verification_code(email)
    return {"verified": True}


@app.post("/auth/signup", response_model=TokenResponse)
async def signup(request: SignUpRequest) -> TokenResponse:
    email = request.email.strip().lower()
    password = request.password

    # Rate limiting
    if not await check_rate_limit(f"signup_{email}"):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many signup attempts. Please try again later."
        )

    if not email or not password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email and password are required")

    pool = get_db_pool(app)
    existing = await pool.fetchval(
        "SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)",
        email,
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account already exists")

    password_hash = hash_password(password)
    await insert_user(pool, email, password_hash)
    await bootstrap_student_profile(pool, email)

    token = create_access_token({"sub": email, "email": email}, ACCESS_TOKEN_EXPIRE_SECONDS)
    return TokenResponse(access_token=token)


@app.post("/auth/google", response_model=TokenResponse)
async def google_auth(request: GoogleAuthRequest) -> TokenResponse:
    if not request.token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Google token is required")

    id_info = verify_google_id_token(request.token)
    email = id_info.get("email")
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Google token has no email")

    email = email.strip().lower()
    pool = get_db_pool(app)
    user = await pool.fetchrow(
        "SELECT email FROM users WHERE email = $1",
        email,
    )

    if not user:
        password_hash = hash_password(os.urandom(16).hex() + "Aa1!")
        await insert_user(pool, email, password_hash)

    await bootstrap_student_profile(pool, email)
    # Using the user's email as the stable identifier stored in the JWT sub claim
    token = create_access_token({"sub": email, "email": email}, ACCESS_TOKEN_EXPIRE_SECONDS)
    return TokenResponse(access_token=token, email=email)


@app.get("/roadmaps")
async def get_roadmaps(current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, list[dict[str, Any]]]:
    pool = get_db_pool(app)
    return {"roadmaps": await fetch_roadmaps(pool, current_user["sub"])}


@app.post("/roadmaps")
async def save_roadmap(
    payload: RoadmapCreate,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    pool = get_db_pool(app)
    return await insert_roadmap(
        pool,
        current_user["sub"],
        payload.education,
        payload.interests,
        payload.barriers,
        payload.custom_roadmap,
    )


@app.delete("/roadmaps/{roadmap_id}")
async def remove_roadmap(
    roadmap_id: int,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, str]:
    pool = get_db_pool(app)
    await delete_roadmap(pool, roadmap_id, current_user["sub"])
    return {"status": "deleted"}


@app.post("/enroll")
async def enroll_student(
    request: EnrollRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    pool = get_db_pool(app)
    
    # Check if already enrolled
    existing = await fetch_enrollment(pool, current_user["sub"])
    if existing:
        return {"status": "Already enrolled", "master_plan": existing["master_plan"]}
    
    # 1. AI generates the 5-year Master Plan
    master_plan = await generate_5_year_plan(request.interests)
    
    # 2. Save the plan to Neon
    enrollment = await insert_enrollment(pool, current_user["sub"], master_plan)
    
    return {"status": "Enrolled in Year 1", "enrollment_id": enrollment["id"], "master_plan": master_plan}


@app.get("/enrollment")
async def get_enrollment(current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    pool = get_db_pool(app)
    enrollment = await fetch_enrollment(pool, current_user["sub"])
    if not enrollment:
        raise HTTPException(status_code=404, detail="Not enrolled")
    return {"enrollment": enrollment}


@app.get("/student-profile", response_model=StudentProfileResponse)
async def get_student_profile(current_user: dict[str, Any] = Depends(get_current_user)) -> StudentProfileResponse:
    """Get the authenticated student's profile including track assignment and admission status."""
    pool = get_db_pool(app)
    user_id = current_user["sub"]
    
    async with pool.acquire() as conn:
        # Fetch student profile from database
        profile = await conn.fetchrow(
            """
            SELECT assigned_track, iq_style, preliminary_score, major_applied, is_admitted
            FROM student_profiles
            WHERE user_id = $1
            """,
            user_id
        )
        
        if not profile:
            # Return default profile for non-admitted students
            return StudentProfileResponse(
                assigned_track=0,
                iq_style="",
                preliminary_score=0.0,
                major_applied="None",
                is_admitted=False
            )
        
        return StudentProfileResponse(
            assigned_track=profile["assigned_track"],
            iq_style=profile["iq_style"],
            preliminary_score=float(profile["preliminary_score"]),
            major_applied=profile["major_applied"],
            is_admitted=profile["is_admitted"]
        )


@app.get("/user-stats")
async def get_user_stats_endpoint(current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    pool = get_db_pool(app)
    stats = await get_user_stats(pool, current_user["sub"])
    if not stats:
        # Return default stats for first-time users instead of 404
        return {
            "stats": {
                "current_year": 1,
                "year_1_quiz_score": 0,
                "year_2_quiz_score": 0,
                "year_3_quiz_score": 0,
                "year_4_quiz_score": 0,
                "year_5_quiz_score": 0,
            }
        }
    return {"stats": stats}


@app.post("/check-year-access/{year}")
async def check_year_access(
    year: int,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Check if user can access a specific year (lock mechanics)"""
    pool = get_db_pool(app)
    stats = await get_user_stats(pool, current_user["sub"])
    
    if not stats:
        raise HTTPException(status_code=404, detail="User not enrolled")
    
    current_year = stats.get("current_year", 1)
    
    if year > current_year:
        return {
            "access": False,
            "message": f"Year {year} is locked. You are currently in Year {current_year}",
        }
    
    # Check quiz score for year access
    quiz_score_key = f"year_{year}_quiz_score"
    quiz_score = stats.get(quiz_score_key, 0)
    
    if year > 1 and quiz_score < 80:
        return {
            "access": False,
            "message": f"Quiz score of {quiz_score}% for Year {year - 1} is below the required 80%",
            "quiz_score": quiz_score,
        }
    
    return {"access": True, "current_year": current_year}


@app.post("/generate-curriculum")
async def generate_roadmap(data: UserOnboarding) -> dict[str, Any]:
    try:
        prompt = f"""
        You are an expert academic mentor. Create a comprehensive 5-year curriculum roadmap for a student based on:
        - Education: {data.education}
        - Interests: {data.interests}
        - Barriers: {data.barriers}

        Create a structured curriculum where each year builds upon the previous one like building blocks.
        Each year should have 12-15 courses initially, gradually reducing to 4-6 courses by year 5.
        Each course must have at least 6 detailed topics.

        Structure the response as a JSON object with this exact format:
        {{
            "year_1": {{
                "title": "Foundation Year",
                "description": "Building fundamental knowledge",
                "courses": [
                    {{
                        "name": "Course Name",
                        "topics": ["Topic 1", "Topic 2", "Topic 3", "Topic 4", "Topic 5", "Topic 6", "Topic 7"]
                    }},
                    ... (12-15 courses)
                ]
            }},
            "year_2": {{
                "title": "Intermediate Year",
                "description": "Deepening understanding",
                "courses": [
                    ... (10-12 courses, each with 6+ topics)
                ]
            }},
            "year_3": {{
                "title": "Advanced Year",
                "description": "Specialization and application",
                "courses": [
                    ... (8-10 courses, each with 6+ topics)
                ]
            }},
            "year_4": {{
                "title": "Professional Year",
                "description": "Industry preparation",
                "courses": [
                    ... (6-8 courses, each with 6+ topics)
                ]
            }},
            "year_5": {{
                "title": "Capstone Year",
                "description": "Mastery and career launch",
                "courses": [
                    ... (4-6 courses, each with 6+ topics)
                ]
            }}
        }}

        Make courses progressive and interconnected. Each year should unlock more advanced concepts.
        """

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a helpful education assistant that returns valid JSON."},
                {"role": "user", "content": prompt},
            ],
            max_tokens=4000,
            temperature=0.7,
        )

        ai_text = response.choices[0].message.content.strip()
        # Try to parse as JSON
        try:
            curriculum_data = json.loads(ai_text)
        except json.JSONDecodeError:
            # Fallback: create a structured curriculum
            curriculum_data = {
                "year_1": {
                    "title": "Foundation Year",
                    "description": f"Building fundamental knowledge in {data.interests}",
                    "courses": [
                        {
                            "name": f"Introduction to {data.interests}",
                            "topics": ["Basic Concepts", "Historical Context", "Core Principles", "Fundamental Tools", "Basic Applications", "Problem Solving", "Critical Thinking"]
                        },
                        {
                            "name": f"Mathematics for {data.interests}",
                            "topics": ["Algebra Fundamentals", "Calculus Basics", "Statistics", "Probability", "Linear Algebra", "Discrete Math", "Mathematical Modeling"]
                        },
                        {
                            "name": f"Communication Skills",
                            "topics": ["Written Communication", "Oral Presentation", "Technical Writing", "Documentation", "Report Writing", "Presentation Skills", "Professional Email"]
                        },
                        {
                            "name": f"Digital Literacy",
                            "topics": ["Computer Basics", "Internet Navigation", "Online Research", "Data Management", "Digital Tools", "Software Applications", "Cybersecurity Basics"]
                        },
                        {
                            "name": f"Research Methods",
                            "topics": ["Research Design", "Data Collection", "Analysis Techniques", "Literature Review", "Citation Methods", "Research Ethics", "Report Writing"]
                        },
                        {
                            "name": f"Critical Thinking",
                            "topics": ["Logical Reasoning", "Problem Analysis", "Decision Making", "Creative Thinking", "Ethical Reasoning", "Bias Recognition", "Argument Construction"]
                        },
                        {
                            "name": f"Time Management",
                            "topics": ["Goal Setting", "Prioritization", "Planning Techniques", "Productivity Tools", "Study Skills", "Work-Life Balance", "Stress Management"]
                        },
                        {
                            "name": f"Basic Programming",
                            "topics": ["Programming Fundamentals", "Variables & Data Types", "Control Structures", "Functions", "Basic Algorithms", "Debugging", "Code Documentation"]
                        },
                        {
                            "name": f"Data Analysis Basics",
                            "topics": ["Data Types", "Data Cleaning", "Basic Statistics", "Data Visualization", "Spreadsheets", "Basic SQL", "Data Interpretation"]
                        },
                        {
                            "name": f"Project Management Intro",
                            "topics": ["Project Lifecycle", "Planning Methods", "Resource Allocation", "Risk Management", "Team Collaboration", "Progress Tracking", "Basic Tools"]
                        },
                        {
                            "name": f"Ethics in {data.interests}",
                            "topics": ["Professional Ethics", "Data Privacy", "Intellectual Property", "Social Impact", "Environmental Considerations", "Diversity & Inclusion", "Ethical Decision Making"]
                        },
                        {
                            "name": f"Career Planning",
                            "topics": ["Career Exploration", "Skill Assessment", "Industry Trends", "Networking Basics", "Resume Building", "Interview Skills", "Professional Development"]
                        }
                    ]
                },
                "year_2": {
                    "title": "Intermediate Year",
                    "description": f"Deepening understanding and building upon Year 1 foundations in {data.interests}",
                    "courses": [
                        {
                            "name": f"Advanced {data.interests} Concepts",
                            "topics": ["Theoretical Frameworks", "Advanced Applications", "Case Studies", "Industry Standards", "Emerging Trends", "Complex Problem Solving", "Innovation Methods"]
                        },
                        {
                            "name": f"Advanced Mathematics",
                            "topics": ["Multivariate Calculus", "Advanced Statistics", "Optimization", "Numerical Methods", "Mathematical Proofs", "Advanced Modeling", "Computational Math"]
                        },
                        {
                            "name": f"Database Systems",
                            "topics": ["Database Design", "SQL Advanced", "NoSQL Databases", "Data Modeling", "Query Optimization", "Database Security", "Big Data Concepts"]
                        },
                        {
                            "name": f"Software Engineering",
                            "topics": ["Software Development Life Cycle", "Version Control", "Testing Strategies", "Code Quality", "Design Patterns", "Agile Methodology", "DevOps Basics"]
                        },
                        {
                            "name": f"Data Structures & Algorithms",
                            "topics": ["Arrays & Lists", "Trees & Graphs", "Sorting Algorithms", "Search Algorithms", "Dynamic Programming", "Complexity Analysis", "Algorithm Design"]
                        },
                        {
                            "name": f"Web Development",
                            "topics": ["HTML/CSS Advanced", "JavaScript Frameworks", "Backend Development", "API Design", "Web Security", "Responsive Design", "Performance Optimization"]
                        },
                        {
                            "name": f"Machine Learning Basics",
                            "topics": ["Supervised Learning", "Unsupervised Learning", "Neural Networks", "Model Evaluation", "Feature Engineering", "Overfitting Prevention", "ML Ethics"]
                        },
                        {
                            "name": f"Business Intelligence",
                            "topics": ["Business Analysis", "Market Research", "Financial Planning", "Strategic Thinking", "Business Models", "Competitive Analysis", "Business Communication"]
                        },
                        {
                            "name": f"Advanced Research Methods",
                            "topics": ["Quantitative Research", "Qualitative Research", "Mixed Methods", "Statistical Analysis", "Research Design", "Data Interpretation", "Academic Writing"]
                        },
                        {
                            "name": f"Leadership & Management",
                            "topics": ["Leadership Styles", "Team Management", "Conflict Resolution", "Motivation Theories", "Organizational Behavior", "Change Management", "Strategic Planning"]
                        }
                    ]
                },
                "year_3": {
                    "title": "Advanced Year",
                    "description": f"Specialization and advanced application in {data.interests}",
                    "courses": [
                        {
                            "name": f"Specialized {data.interests} Applications",
                            "topics": ["Domain Expertise", "Advanced Techniques", "Industry Applications", "Research Frontiers", "Innovation Projects", "Expert Systems", "Advanced Problem Solving"]
                        },
                        {
                            "name": f"Advanced Machine Learning",
                            "topics": ["Deep Learning", "Computer Vision", "Natural Language Processing", "Reinforcement Learning", "Model Deployment", "MLOps", "Advanced Algorithms"]
                        },
                        {
                            "name": f"Big Data Analytics",
                            "topics": ["Distributed Computing", "Hadoop Ecosystem", "Spark", "Data Warehousing", "Real-time Analytics", "Data Pipeline Design", "Scalability"]
                        },
                        {
                            "name": f"Cloud Computing",
                            "topics": ["Cloud Architecture", "AWS/Azure/GCP", "Serverless Computing", "Microservices", "Containerization", "Cloud Security", "Cost Optimization"]
                        },
                        {
                            "name": f"Advanced Software Architecture",
                            "topics": ["System Design", "Scalable Architecture", "Microservices Design", "API Gateway", "Event-Driven Architecture", "Performance Engineering", "Security Architecture"]
                        },
                        {
                            "name": f"Data Science Advanced",
                            "topics": ["Advanced Statistics", "Time Series Analysis", "A/B Testing", "Causal Inference", "Bayesian Methods", "Experimental Design", "Data Science Ethics"]
                        },
                        {
                            "name": f"Entrepreneurship",
                            "topics": ["Business Planning", "Startup Fundamentals", "Funding Strategies", "Market Validation", "Product Development", "Scaling Strategies", "Exit Strategies"]
                        },
                        {
                            "name": f"Advanced Communication",
                            "topics": ["Public Speaking", "Negotiation Skills", "Crisis Communication", "Media Relations", "Cross-cultural Communication", "Digital Marketing", "Brand Management"]
                        }
                    ]
                },
                "year_4": {
                    "title": "Professional Year",
                    "description": f"Industry preparation and professional development in {data.interests}",
                    "courses": [
                        {
                            "name": f"Industry Capstone Project",
                            "topics": ["Project Planning", "Industry Collaboration", "Real-world Application", "Project Management", "Quality Assurance", "Documentation", "Presentation & Defense"]
                        },
                        {
                            "name": f"Professional Certification Preparation",
                            "topics": ["Industry Standards", "Certification Requirements", "Exam Preparation", "Professional Ethics", "Continuing Education", "License Requirements", "Career Advancement"]
                        },
                        {
                            "name": f"Internship/Practicum",
                            "topics": ["Workplace Integration", "Professional Networking", "Mentorship", "Performance Evaluation", "Career Development", "Industry Best Practices", "Professional Growth"]
                        },
                        {
                            "name": f"Advanced Specializations",
                            "topics": ["Emerging Technologies", "Research Opportunities", "Advanced Methodologies", "Innovation Labs", "Specialized Tools", "Expert Communities", "Thought Leadership"]
                        },
                        {
                            "name": f"Business Development",
                            "topics": ["Client Relations", "Business Strategy", "Market Expansion", "Partnership Development", "Revenue Models", "Business Analytics", "Strategic Planning"]
                        },
                        {
                            "name": f"Professional Leadership",
                            "topics": ["Executive Leadership", "Team Building", "Organizational Development", "Strategic Vision", "Change Leadership", "Executive Communication", "Board Relations"]
                        }
                    ]
                },
                "year_5": {
                    "title": "Capstone Year",
                    "description": f"Mastery achievement and career launch in {data.interests}",
                    "courses": [
                        {
                            "name": f"Master's Thesis/Project",
                            "topics": ["Research Design", "Data Collection", "Analysis & Findings", "Thesis Writing", "Defense Preparation", "Publication Process", "Academic Presentation"]
                        },
                        {
                            "name": f"Career Launch Program",
                            "topics": ["Job Search Strategies", "Interview Mastery", "Portfolio Development", "Networking Advanced", "Personal Branding", "Salary Negotiation", "Career Planning"]
                        },
                        {
                            "name": f"Industry Immersion",
                            "topics": ["Full-time Employment", "Industry Projects", "Mentorship Programs", "Professional Development", "Leadership Opportunities", "Industry Certifications", "Career Advancement"]
                        },
                        {
                            "name": f"Entrepreneurial Ventures",
                            "topics": ["Business Launch", "Product Development", "Market Entry", "Funding Acquisition", "Team Building", "Operations Management", "Growth Strategies"]
                        },
                        {
                            "name": f"Professional Mastery",
                            "topics": ["Expert Certification", "Thought Leadership", "Industry Speaking", "Consulting Opportunities", "Professional Networks", "Continuous Learning", "Legacy Building"]
                        }
                    ]
                }
            }

        return {
            "status": "Success",
            "curriculum": curriculum_data,
        }
    except Exception as e:
        print(f"AI Error: {str(e)}")
        return {
            "status": "Error",
            "curriculum": {},
            "message": f"Technical Error: {str(e)}",
        }


@app.post("/chat")
async def chat_with_mentor(request: ChatRequest) -> dict[str, str]:
    try:
        system_prompt = f"""
            You are an expert academic mentor. Create a 3-step learning roadmap for:
            - Education: {request.context.get('education')}
            - Interests: {request.context.get('interests')}
            - Barrier: {request.context.get('barriers')}

            RULES:
            1. Provide exactly 3 steps.
            2. Every step MUST include a clickable Markdown link to a real "free resource([Course Name](https://link.com))".
            3. If the barrier is 'No Laptop', suggest mobile-friendly resources.
            4. Return ONLY the 3 steps, one per line. No extra text.
            """

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                *request.history,
                {"role": "user", "content": request.message},
            ],
            max_tokens=500,
            temperature=0.7,
        )
        return {"reply": response.choices[0].message.content}
    except Exception as e:
        return {"error": str(e)}


@app.get("/generate-exam")
async def generate_exam(request: ExamRequest = Depends()) -> list[dict]:
    try:
        prompt = f"""
        You are the Admissions Dean for a Digital University.
        Create a 5-question Preliminary Diagnostic Exam for a student applying for: {request.major}.

        The questions must test:
        1. Foundational Logic
        2. Mathematical Reasoning
        3. Conceptual understanding of {request.major}

        Return ONLY a JSON list:
        [
          {{"id": 1, "question": "...", "options": ["A", "B", "C", "D"], "answer": "A", "category": "logic"}},
          ...
        ]
        """

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a helpful education assistant that returns valid JSON."},
                {"role": "user", "content": prompt},
            ],
            max_tokens=1000,
            temperature=0.7,
        )

        ai_text = response.choices[0].message.content.strip()

        # Validate JSON format before parsing
        if not ai_text.startswith('[') or not ai_text.endswith(']'):
            raise ValueError("AI response is not a valid JSON array")

        try:
            exam = json.loads(ai_text)
            # Validate structure
            if not isinstance(exam, list) or len(exam) == 0:
                raise ValueError("AI response is not a valid exam array")

            # Validate each question has required fields
            for i, question in enumerate(exam):
                required_fields = ['id', 'question', 'options', 'answer', 'category']
                if not all(field in question for field in required_fields):
                    raise ValueError(f"Question {i+1} missing required fields")

            return exam

        except json.JSONDecodeError as e:
            print(f"JSON parsing error: {e}")
            raise ValueError("AI response is not valid JSON")

    except Exception as e:
        print(f"AI Error in exam generation: {str(e)}")
        # Fallback exam
        return [
            {"id": 1, "question": "What is 2 + 2?", "options": ["3", "4", "5", "6"], "answer": "4", "category": "math"},
            {"id": 2, "question": "What does 'if A then B' mean?", "options": ["A implies B", "B implies A", "A and B", "A or B"], "answer": "A implies B", "category": "logic"},
            {"id": 3, "question": f"What is a key concept in {request.major}?", "options": ["Basic", "Intermediate", "Advanced", "Expert"], "answer": "Basic", "category": "concept"},
            {"id": 4, "question": "Solve for x: 2x = 10", "options": ["3", "4", "5", "6"], "answer": "5", "category": "math"},
            {"id": 5, "question": "What is logic?", "options": ["Thinking", "Reasoning", "Both", "None"], "answer": "Both", "category": "logic"},
        ]


@app.post("/evaluate-admissions-exam")
async def submit_exam(
    request: SubmitExamRequest, 
    current_user: Any = Depends(get_current_user)
) -> dict[str, Any]:
    pool = get_db_pool(app)
    
    # Securely get the ID from the authenticated user
    user_id = current_user["sub"]  # Assuming the token contains the user ID in "sub" claim
    
    # Calculate score
    score = sum(1 for r in request.results if getattr(r, 'is_correct', False))
    
    # Determine Track Duration and IQ Style
    if score >= 4:
        duration = 3
        iq_style = "Analytical/High Mastery"
    elif score == 3:
        duration = 4
        iq_style = "Balanced"
    else:
        duration = 5
        iq_style = "Step-by-Step/Fundamental"
    
    # Analyze strengths and weaknesses
    strengths = []
    weaknesses = []
    categories: dict[str, dict[str, int]] = {}
    for r in request.results:
        cat = getattr(r, 'category', 'unknown') or 'unknown'
        if cat not in categories:
            categories[cat] = {'correct': 0, 'total': 0}
        categories[cat]['total'] += 1
        if getattr(r, 'is_correct', False):
            categories[cat]['correct'] += 1
    
    for cat, data in categories.items():
        accuracy = data['correct'] / data['total']
        if accuracy >= 0.8:
            strengths.append(cat)
        elif accuracy < 0.5:
            weaknesses.append(cat)
    
    try:
        # Save to database
        profile = await insert_student_profile(
            pool,
            user_id,
            request.major,
            duration,
            iq_style,
            float(score),
            strengths,
            weaknesses,
            True
        )
        
        return {
            "score": score,
            "assigned_track": f"{duration} Years",
            "profile": iq_style,
            "strengths": strengths,
            "weaknesses": weaknesses,
            "message": "Welcome to the University. Your curriculum has been personalized.",
            "profile_id": profile.get("id"),
        }

    except Exception as e:
        # Catching the database error (like the UniqueViolation we saw earlier)
        if "unique constraint" in str(e).lower():
            raise HTTPException(
                status_code=400, 
                detail="A profile already exists for this user."
            )
        print(f"Database Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error during profile creation.")
if __name__ == "__main__":
    import uvicorn

    print("🚀 EduBridge Backend is starting on http://127.0.0.1:9000")
    uvicorn.run(app, host="127.0.0.1", port=9000)
