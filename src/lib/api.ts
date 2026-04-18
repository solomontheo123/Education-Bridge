import { OnboardingData } from "./schema";

export async function getRoadmap(userData: OnboardingData) {
  console.log("Sending to Python:", userData);
  try {
    const response = await fetch("http://127.0.0.1:8000/generate-roadmap", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch roadmap");
    }

    return await response.json();
  } catch (error) {
    console.error("API Error:", error);
    return null;
  }
}