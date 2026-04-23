import os
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# --- 1. FIXED CORS SETTINGS ---
# Using "*" during development ensures your browser doesn't block the request
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
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

# --- 2. FIXED ENDPOINT NAME ---
# Changed from "/generate_roadmap" to "/generate-roadmap" to match your frontend fetch
@app.post("/generate-roadmap")
async def generate_roadmap(data: UserOnboarding):
    try:
        prompt = f"""
        You are an expert career counselor. Create a 3-step learning roadmap for:
        - Education: {data.education}
        - Interests: {data.interests}
        - Current Barrier: {data.barriers}
        
        Keep steps concise and actionable. Mention one free resource per step, and also suggest a befitting course(s) to study on our platform.
        Return ONLY the 3 steps, each on a new line, no numbers or bullets.
        """

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


class ChatRequest(BaseModel):
    message: str
    context: dict
    history: list = []


@app.post("/chat")
async def chat_with_mentor(request: ChatRequest):
    try:
        system_prompt = f"""
        You are an expert academic mentor for a student interested in {request.context.get('interests')}.
        Your goal is to provide deep-dive explanations for their roadmap.

        CRITICAL RULE: Whenever you mention a website, tool, or book, you MUST provide a 
        clickable Markdown link. 
        Example: "You should check out [Coursera](https://www.coursera.org) for this."
        Always suggest 1-2 real-world free resources in every response.
        """

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                *request.history,
                {"role": "user", "content": request.message}
            ],
            max_tokens=500,
            temperature=0.7
        )
        return {"reply": response.choices[0].message.content}
    except Exception as e:
        return {"error": str(e)}

# --- 3. ADDED SERVER START BLOCK ---
# This ensures the script stays open and runs the server
if __name__ == "__main__":
    import uvicorn
    print("🚀 EduBridge Backend is starting on http://127.0.0.1:8000")
    uvicorn.run(app, host="127.0.0.1", port=8000)