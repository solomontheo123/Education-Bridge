import { OnboardingData, RoadmapNode, StudentProfile } from "./schema";

const getAuthToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("eduBridgeToken");
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:9000';

export const authFetch = async (url: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  if (!token) {
    throw new Error("No auth token found. Please log in.");
  }

  const headers = new Headers(options.headers as HeadersInit);
  headers.set("Content-Type", "application/json");
  headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${url}`, { ...options, headers, credentials: "same-origin" });
  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("eduBridgeToken");
      localStorage.removeItem("eduBridgeEmail");
      window.location.href = "/login";
    }
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }
  return await response.json();
};

export async function getCurriculum(userData: OnboardingData) {
  console.log("Sending to Python:", userData);

  // Check cache first
  const cacheKey = `curriculum_${userData.education}_${userData.interests}_${userData.barriers}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const parsedCache = JSON.parse(cached);
      if (parsedCache.timestamp && (Date.now() - parsedCache.timestamp) < 24 * 60 * 60 * 1000) { // 24 hours
        console.log("Using cached curriculum");
        return parsedCache.data;
      }
    } catch (e) {
      console.warn("Failed to parse cached curriculum:", e);
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}/generate-curriculum`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`Curriculum service returned ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    // Cache the successful result
    if (result.status === "Success" && result.curriculum) {
      localStorage.setItem(cacheKey, JSON.stringify({
        data: result,
        timestamp: Date.now()
      }));
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("API Error:", error);
    return { status: "error", curriculum: {}, message };
  }
}

export async function login(email: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Login failed");
  }

  return await response.json();
}

export async function getSavedRoadmaps() {
  return authFetch("/roadmaps");
}

export async function saveRoadmap(payload: {
  education: string;
  interests: string;
  barriers: string;
  custom_roadmap: string[];
}) {
  return authFetch("/roadmaps", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteRoadmapById(id: number) {
  return authFetch(`/roadmaps/${id}`, {
    method: "DELETE",
  });
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

export async function enrollStudent(interests: string) {
  return authFetch("http://127.0.0.1:9000/enroll", {
    method: "POST",
    body: JSON.stringify({ interests }),
  });
}

export async function getEnrollment() {
  return authFetch("http://127.0.0.1:9000/enrollment");
}

export async function getUserStats() {
  return authFetch("http://127.0.0.1:9000/user-stats");
}

export async function checkYearAccess(year: number) {
  return authFetch(`http://127.0.0.1:9000/check-year-access/${year}`, {
    method: "POST",
  });
}

export async function bootstrapProfile(): Promise<StudentProfile> {
  return authFetch("/profile/bootstrap", {
    method: "POST",
  });
}

export async function fetchRoadmap(): Promise<RoadmapNode[]> {
  return authFetch("/roadmap");
}

export async function completeModule(moduleId: string): Promise<RoadmapNode[]> {
  return authFetch("/roadmap/complete-module", {
    method: "POST",
    body: JSON.stringify({ module_id: moduleId }),
  });
}
