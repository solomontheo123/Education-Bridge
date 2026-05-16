"use client";

import { useEffect, useMemo, useState } from "react";

interface XPAnimationProps {
  xpEarned: number;
  bonusXp?: number;
}

export default function XPAnimation({ xpEarned, bonusXp = 0 }: XPAnimationProps) {
  const totalXp = xpEarned + bonusXp;
  const [displayXp, setDisplayXp] = useState(0);

  useEffect(() => {
    let start = 0;
    const increment = Math.max(1, Math.round(totalXp / 30));
    const interval = window.setInterval(() => {
      start += increment;
      if (start >= totalXp) {
        start = totalXp;
        window.clearInterval(interval);
      }
      setDisplayXp(start);
    }, 25);
    return () => window.clearInterval(interval);
  }, [totalXp]);

  const label = useMemo(() => {
    if (bonusXp > 0) {
      return `+${xpEarned} XP +${bonusXp} bonus`;
    }
    return `+${xpEarned} XP`;
  }, [bonusXp, xpEarned]);

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-950/80 dark:shadow-black/20">
      <p className="text-sm uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">XP reward</p>
      <div className="mt-4 flex items-baseline gap-3">
        <span className="text-5xl font-semibold text-slate-900 dark:text-white">{displayXp}</span>
        <span className="text-sm text-slate-500 dark:text-slate-400">XP earned</span>
      </div>
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{label}</p>
    </div>
  );
}
