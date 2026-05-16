"use client";

interface ScoreSummaryProps {
  score: number;
  passed: boolean;
  correctCount?: number;
  totalQuestions?: number;
}

export default function ScoreSummary({ score, passed, correctCount, totalQuestions }: ScoreSummaryProps) {
  return (
    <div className="rounded-[2rem] border border-blue-200 bg-blue-50 p-6 text-slate-900 shadow-sm dark:border-blue-500/30 dark:bg-blue-950/80 dark:text-slate-100">
      <p className="text-sm uppercase tracking-[0.35em] text-blue-600 dark:text-blue-300">Mastery check</p>
      <h2 className="mt-3 text-3xl font-semibold">{passed ? "Mastery achieved" : "Keep going"}</h2>
      <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">You scored {score}% on this quiz.</p>
      <div className="mt-4 rounded-3xl bg-white p-4 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-200">
        {typeof correctCount === "number" && typeof totalQuestions === "number" ? (
          <div className="flex justify-between"><span>Correct answers</span><span>{correctCount}/{totalQuestions}</span></div>
        ) : (
          <div className="flex justify-between"><span>Performance</span><span>{score}%</span></div>
        )}
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500" style={{ width: `${score}%` }} />
        </div>
      </div>
    </div>
  );
}
