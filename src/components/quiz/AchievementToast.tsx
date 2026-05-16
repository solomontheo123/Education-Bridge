"use client";

import { useEffect, useState } from "react";

interface AchievementToastProps {
  achievements: Array<{ title: string; description: string }>;
}

export default function AchievementToast({ achievements }: AchievementToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (achievements.length > 0) {
      setVisible(true);
      const timeout = window.setTimeout(() => setVisible(false), 6500);
      return () => window.clearTimeout(timeout);
    }
  }, [achievements]);

  if (achievements.length === 0 || !visible) {
    return null;
  }

  return (
    <div className="fixed right-6 top-6 z-50 w-full max-w-sm space-y-3">
      {achievements.map((achievement) => (
        <div key={achievement.title} className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-xl shadow-emerald-200/20 dark:border-emerald-500/30 dark:bg-emerald-950/90 dark:text-emerald-100">
          <p className="text-xs uppercase tracking-[0.35em] text-emerald-600 dark:text-emerald-300">Achievement unlocked</p>
          <h3 className="mt-2 text-lg font-semibold">{achievement.title}</h3>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{achievement.description}</p>
        </div>
      ))}
    </div>
  );
}
