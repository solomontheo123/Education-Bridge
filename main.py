from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class UserOnboarding(BaseModel):
    education: str
    interests: str
    barriers: str

@app.post("/generate-roadmap")
async def generate_roadmap(data: UserOnboarding):
    # --- START OF AI LOGIC ---
    
    # 1. Analyze the Education Level
    complexity = "Beginner" if "High School" in data.education else "Advanced"
    
    # 2. Tackle the Barriers
    barrier_solution = ""
    if "money" in data.barriers.lower() or "cost" in data.barriers.lower():
        barrier_solution = "Focus on free Open-Source tools and YouTube certifications."
    elif "time" in data.barriers.lower():
        barrier_solution = "Follow a micro-learning schedule (15 mins/day)."
    else:
        barrier_solution = "Standard intensive curriculum."

    # 3. Generate Custom Steps
    roadmap_steps = [
        f"Master the {complexity} fundamentals of {data.interests}.",
        f"Resource Strategy: {barrier_solution}",
        f"Build a portfolio project specifically involving {data.interests} to show employers."
    ]

    return {
        "status": "Success",
        "custom_roadmap": roadmap_steps,
        "recommendation_engine": "V1-Logic-Rules"
    }