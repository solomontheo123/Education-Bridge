"use client";

interface DependencyLineProps {
  dependencies: string[];
}

export default function DependencyLine({ dependencies }: DependencyLineProps) {
  if (dependencies.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
      <div className="font-semibold text-slate-900 dark:text-white mb-2">Prerequisite Modules</div>
      <ul className="space-y-1">
        {dependencies.map((dependency) => (
          <li key={dependency} className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-500 dark:bg-slate-300" />
            <span>{dependency}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
