"use client";

import { CheckCircle2, Lock, Sparkles } from "lucide-react";

interface ProgressBadgeProps {
  status: string;
}

const STATUSES = {
  COMPLETED: {
    label: "Completed",
    className: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-200",
    icon: CheckCircle2,
  },
  AVAILABLE: {
    label: "Available",
    className: "bg-blue-100 text-blue-900 dark:bg-blue-900/20 dark:text-blue-200",
    icon: Sparkles,
  },
  LOCKED: {
    label: "Locked",
    className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    icon: Lock,
  },
};

export default function ProgressBadge({ status }: ProgressBadgeProps) {
  const config = STATUSES[status as keyof typeof STATUSES] || STATUSES.LOCKED;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${config.className}`}>
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
}
