import os
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# Security Handshake for Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Groq Client
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

class UserOnboarding(BaseModel):
    education: str
    interests: str
    barriers: str

@app.post("/generate-roadmap")
async def generate_roadmap(data: UserOnboarding):
    try:
        # The AI Instruction
        prompt = f"""
        You are an expert career counselor. Create a 3-step learning roadmap for:
        - Education: {data.education}
        - Interests: {data.interests}
        - Current Barrier: {data.barriers}
        
        Keep steps concise and actionable. Mention one free resource per step,and also suggest a befitting course(s) to study on our platform.
        Return ONLY the 3 steps, each on a new line, no numbers or bullets.
        """

        # Call Groq (using Llama 3 - a powerful open-source model)
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile", 
            messages=[
                {"role": "system", "content": "You are a helpful education assistant."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=300,
            temperature=0.7
        )

        ai_text = response.choices[0].message.content
        steps = [step.strip() for step in ai_text.strip().split('\n') if step.strip()]

        return {
            "status": "Success",
            "custom_roadmap": steps[:3],
            "recommendation_engine": "Groq Llama-3.3"
        }

    except Exception as e:
        print(f"AI Error: {str(e)}")
        return {
            "status": "Error", 
            "custom_roadmap": [f"Technical Error: {str(e)}"]
        }