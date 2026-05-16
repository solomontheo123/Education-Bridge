"use client";

import { motion } from "framer-motion";
import { Clock3, Database, GraduationCap, Sparkles } from "lucide-react";
import ProgressBadge from "./ProgressBadge";
import DependencyLine from "./DependencyLine";

interface RoadmapNodeProps {
  module: {
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
  };
  onComplete?: (moduleId: string) => void;
  isCompleting?: boolean;
}

export default function RoadmapNode({ module, onComplete, isCompleting }: RoadmapNodeProps) {
  const variantColor =
    module.status === "COMPLETED"
      ? "border-emerald-300 bg-emerald-50/80 dark:border-emerald-500/30 dark:bg-emerald-900/20"
      : module.status === "AVAILABLE"
      ? "border-blue-300 bg-blue-50/80 dark:border-blue-500/30 dark:bg-blue-900/20"
      : "border-slate-200 bg-white/80 dark:border-slate-700 dark:bg-slate-950/80";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`relative overflow-hidden rounded-[2rem] border p-6 shadow-xl shadow-slate-200/30 dark:shadow-black/20 ${variantColor}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap gap-2 items-center text-xs uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
            <span>{module.year_level} • Year</span>
            <span>Sem {module.semester}</span>
            <span>{module.module_code}</span>
          </div>
          <h3 className="mt-3 text-xl font-semibold text-slate-900 dark:text-white">{module.module_name}</h3>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            {module.description ?? "A structured module designed to advance the student through the curriculum graph."}
          </p>
        </div>
        <ProgressBadge status={module.status} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-3xl bg-slate-100 p-4 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-300">
          <div className="font-semibold">Difficulty</div>
          <div className="mt-2 text-lg font-bold">{module.difficulty_rank}/10</div>
        </div>
        <div className="rounded-3xl bg-slate-100 p-4 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-300">
          <div className="font-semibold">Type</div>
          <div className="mt-2 text-lg font-bold">{module.content_type}</div>
        </div>
        <div className="rounded-3xl bg-slate-100 p-4 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-300">
          <div className="font-semibold">Commitment</div>
          <div className="mt-2 flex items-center gap-2 text-lg font-bold">
            <Clock3 className="h-4 w-4" />
            {module.estimated_hours} hrs
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm text-slate-600 dark:text-slate-300">
        <span className="inline-flex items-center gap-2 rounded-3xl bg-slate-100 px-3 py-2 dark:bg-slate-900">
          <GraduationCap className="h-4 w-4" />
          {module.is_core ? "Core" : "Elective"}
        </span>
        <span className="inline-flex items-center gap-2 rounded-3xl bg-slate-100 px-3 py-2 dark:bg-slate-900">
          <Database className="h-4 w-4" />
          {module.dependencies.length} prereq{module.dependencies.length === 1 ? "" : "s"}
        </span>
        <span className="inline-flex items-center gap-2 rounded-3xl bg-slate-100 px-3 py-2 dark:bg-slate-900">
          <Sparkles className="h-4 w-4" />
          Sem {module.semester} · {module.estimated_hours} hrs
        </span>
      </div>

      {module.status === "AVAILABLE" && onComplete ? (
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => onComplete(module.id)}
            disabled={isCompleting}
            className="inline-flex items-center justify-center rounded-3xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
          >
            {isCompleting ? "Completing…" : "Mark as completed"}
          </button>
        </div>
      ) : null}

      <DependencyLine dependencies={module.dependencies} />
    </motion.article>
  );
}
