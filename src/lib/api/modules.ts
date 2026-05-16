import { authFetch } from "@/lib/api";
import { ModuleDetail } from "@/lib/schema";

export async function fetchModuleDetail(moduleId: string): Promise<ModuleDetail> {
  return authFetch(`/modules/${moduleId}`);
}

export async function submitQuiz(moduleId: string, payload: { answers: number[]; time_spent_seconds: number }) {
  return authFetch(`/modules/${moduleId}/submit-quiz`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function completeModuleSession(moduleId: string, payload: { quiz_score: number; time_spent_seconds: number }) {
  return authFetch(`/modules/${moduleId}/complete`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function heartbeatModuleSession(moduleId: string, payload: { progress_percent: number; watch_seconds: number }) {
  return authFetch(`/modules/${moduleId}/heartbeat`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
