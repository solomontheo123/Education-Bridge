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
    return { status: "error", custom_roadmap: [] };
  }
}

export async function downloadRoadmap(roadmap: string[]) {
  const content = roadmap.map((step, index) => `Step ${index + 1}: ${step}`).join("\n\n");
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "roadmap.txt";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}