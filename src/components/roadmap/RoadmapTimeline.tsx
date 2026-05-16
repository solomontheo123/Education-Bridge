"use client";

import { AnimatePresence } from "framer-motion";
import RoadmapNode from "./RoadmapNode";

interface RoadmapTimelineProps {
  modules: Array<{
    id: string;
    module_name: string;
    module_code: string;
    year_level: number;
    semester: number;
    difficulty_rank: number;
    content_type: string;
    estimated_hours: number;
    is_core: boolean;
    status: string;
    dependencies: string[];
    description?: string | null;
  }>;
  onComplete?: (moduleId: string) => void;
  completingModuleId?: string;
}

export default function RoadmapTimeline({ modules, onComplete, completingModuleId }: RoadmapTimelineProps) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50/90 p-6 shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-950/80 dark:shadow-slate-950/50">
      <div className="pointer-events-none absolute left-12 top-8 bottom-8 w-px bg-gradient-to-b from-blue-500/50 to-transparent" />

      <div className="space-y-6">
        <AnimatePresence mode="popLayout">
          {modules.map((module) => (
            <div key={module.id} className="relative pl-10">
              <div className="absolute left-3 top-10 h-4 w-4 rounded-full border-4 border-white bg-blue-500 shadow-lg shadow-blue-500/20 dark:border-slate-950" />
              <RoadmapNode
                module={module}
                onComplete={onComplete}
                isCompleting={completingModuleId === module.id}
              />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
