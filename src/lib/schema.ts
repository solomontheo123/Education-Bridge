import { z } from "zod";

export const onboardingSchema = z.object({
  // Matches Step 1
  education: z.string().min(1, "Please select an education level"),
  interests: z.string().min(5, "Please tell us a bit more about your interests"),
  barriers: z.string().min(1, "Please select the barrier that resonates most"),
});

// The Magic Line stays exactly the same
export interface OnboardingData {
  education: string;
  interests: string;
  barriers: string;
}

export type RoadmapStatus = "LOCKED" | "AVAILABLE" | "COMPLETED";

export interface RoadmapNode {
  id: string;
  module_name: string;
  module_code: string;
  year_level: number;
  semester: number;
  difficulty_rank: number;
  content_type: string;
  estimated_hours: number;
  is_core: boolean;
  status: RoadmapStatus;
  dependencies: string[];
  description?: string;
}

export interface StudentProfile {
  user_id: string;
  major_applied: string;
  assigned_track: number;
  iq_style: string;
  preliminary_score: number;
  strengths: string[];
  weaknesses: string[];
  is_admitted: boolean;
}

export interface QuizQuestion {
  question: string;
  options: string[];
}

export interface QuizData {
  questions: QuizQuestion[];
}

export interface ModuleDependency {
  requires_id: string;
  requires_name: string;
}

export interface ModuleDetail {
  id: string;
  module_name: string;
  module_code: string;
  markdown_content: string;
  video_url: string;
  quiz_data: QuizData;
  status: RoadmapStatus;
  progress_percent: number;
  completed: boolean;
  session_started_at?: string;
  last_heartbeat?: string;
  total_watch_seconds: number;
  dependencies: ModuleDependency[];
}

