"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import confetti from "canvas-confetti";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import { useModule } from "@/hooks/useModule";
import { useCompleteModule } from "@/hooks/useCompleteModule";
import { useAuth } from "@/hooks/useAuth";
import { heartbeatModuleSession } from "@/lib/api/modules";
import QuizComponent from "@/components/quiz/QuizComponent";
import ScoreSummary from "@/components/quiz/ScoreSummary";
import XPAnimation from "@/components/quiz/XPAnimation";
// AchievementToast intentionally omitted until achievements UI refined
import "katex/dist/katex.min.css";

export default function ModulePage() {
  useAuth();
  const params = useParams();
  const rawModuleId = params?.id;
  const moduleId = typeof rawModuleId === "string" ? rawModuleId : Array.isArray(rawModuleId) ? rawModuleId[0] : "";
  const { data: module, isLoading, error } = useModule(moduleId);
  const completeMutation = useCompleteModule(moduleId);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [watchSeconds, setWatchSeconds] = useState(0);
  interface Achievement { title: string; description?: string }
  interface SubmissionResult {
    passed: boolean;
    xp_earned?: number;
    score?: number;
    new_achievements?: Achievement[];
    next_module?: { id: string; title?: string } | null;
  }

  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);
  const displayWatchSeconds = Math.max(watchSeconds, module?.total_watch_seconds ?? 0);

  const questions = module?.quiz_data?.questions ?? [];
  const answerArray = questions.map((_, index) => answers[index] ?? -1);
  const allAnswered = questions.length > 0 && answerArray.every((choice) => choice >= 0);

  useEffect(() => {
    if (submissionResult?.passed) {
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [submissionResult]);

  useEffect(() => {
    if (!moduleId) return;
    const interval = window.setInterval(async () => {
      setWatchSeconds((current) => current + 30);
      try {
        await heartbeatModuleSession(moduleId, {
          progress_percent: module?.progress_percent ?? 0,
          watch_seconds: 30,
        });
      } catch (err) {
        console.warn("Heartbeat failed", err);
      }
    }, 30000);
    return () => window.clearInterval(interval);
  }, [moduleId, module?.progress_percent]);

  const handleAnswer = (questionIndex: number, optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionIndex]: optionIndex }));
  };

  const handleComplete = async () => {
    if (!moduleId) return;
    completeMutation.mutate(
      {
        answers: answerArray,
        time_spent_seconds: watchSeconds,
      },
      {
        onSuccess: (data) => {
          setSubmissionResult(data as SubmissionResult);
        },
      }
    );
  };

  const progressLabel = module?.status === "COMPLETED" ? "Mastered" : module?.status;

  return (
    <section className="min-h-[calc(100vh-6rem)] bg-slate-100 py-10 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 rounded-[2rem] border border-slate-200 bg-white/95 p-8 shadow-xl shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-slate-950/40">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.32em] text-blue-600 dark:text-blue-300">Classroom Experience</p>
              <h1 className="mt-4 text-4xl font-semibold text-slate-900 dark:text-white">{module?.module_name ?? "Loading module..."}</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">
                Learn in focused mode with checkpoints, lesson content, assessment, and session persistence.
              </p>
            </div>
            <div className="rounded-3xl bg-slate-50 px-5 py-4 text-slate-700 shadow-sm dark:bg-slate-950 dark:text-slate-200">
              <div className="text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">Session metrics</div>
              <div className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{watchSeconds}s</div>
              <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">engaged so far</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
            <Link href="/roadmap" className="text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200">
              Roadmap
            </Link>
            <span>›</span>
            <span>{module?.module_code ?? "Module"}</span>
            <span>›</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs uppercase tracking-[0.3em] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {progressLabel}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-16 text-center shadow-xl shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-slate-950/40">
            <p className="text-xl font-semibold text-slate-900 dark:text-white">Loading learning session…</p>
            <p className="mt-2 text-slate-600 dark:text-slate-400">Preparing your module, session state, and content.</p>
          </div>
        ) : error ? (
          <div className="rounded-[2rem] border border-red-200 bg-red-50/80 p-10 text-center text-red-900 shadow-sm dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-200">
            <p className="text-xl font-semibold">Unable to open this module</p>
            <p className="mt-2 text-sm leading-6">{error instanceof Error ? error.message : "Please return to the roadmap."}</p>
            <Link href="/roadmap" className="mt-4 inline-flex rounded-full bg-blue-600 px-5 py-3 text-sm text-white hover:bg-blue-700">
              Back to roadmap
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
            <article className="space-y-8 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/30 dark:border-slate-800 dark:bg-slate-950/80 dark:shadow-black/20">
              <div className="space-y-6">
                <div className="rounded-3xl bg-slate-100 p-6 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  <p className="text-sm uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">Lesson brief</p>
                  <p className="mt-4 text-base leading-7 text-slate-700 dark:text-slate-300">{module?.dependencies.length ?? 0} prerequisite{module?.dependencies.length === 1 ? "" : "s"} completed</p>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Progress is stored continuously while you learn.</p>
                </div>

                <div className="prose max-w-none prose-slate dark:prose-invert">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeHighlight, rehypeKatex]}
                  >
                    {module?.markdown_content || "## No lesson content is available."}
                  </ReactMarkdown>
                </div>
              </div>

              {module?.video_url ? (
                <div className="rounded-[1.75rem] border border-slate-200 bg-slate-950/5 overflow-hidden shadow-lg dark:border-slate-800">
                  <div className="aspect-video bg-black/5">
                    <iframe
                      src={module.video_url}
                      title="Lesson video"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="h-full w-full"
                    />
                  </div>
                </div>
              ) : null}

              {questions.length ? (
                <div className="space-y-6 rounded-[2rem] border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">Quiz challenge</p>
                      <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">Check your understanding</h2>
                    </div>
                    <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-white">
                      {questions.length} questions
                    </span>
                  </div>

                  <QuizComponent questions={questions} answers={answers} onAnswer={handleAnswer} />

                  {submissionResult?.passed ? (
                    <div className="space-y-4 rounded-[2rem] border border-emerald-200 bg-emerald-50 p-6 text-slate-900 dark:border-emerald-500/30 dark:bg-emerald-950/80 dark:text-slate-100">
                      <p className="text-sm uppercase tracking-[0.35em] text-emerald-600 dark:text-emerald-300">Momentum unlocked</p>
                      <h3 className="text-2xl font-semibold">Quiz passed</h3>
                      <p className="text-sm text-slate-700 dark:text-slate-300">You earned {submissionResult.xp_earned} XP and opened the next challenge.</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <XPAnimation xpEarned={submissionResult.xp_earned ?? 0} />
                        <ScoreSummary score={submissionResult.score ?? 0} passed={submissionResult.passed} correctCount={0} totalQuestions={questions.length} />
                      </div>
                      {submissionResult.new_achievements?.length ? (
                        <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-950">
                          <p className="font-semibold">New achievements</p>
                          <ul className="mt-3 space-y-2 text-slate-600 dark:text-slate-300">
                            {submissionResult.new_achievements?.map((achievement) => (
                              <li key={achievement.title}>⭐ {achievement.title}: {achievement.description}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </article>

            <aside className="space-y-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/20 dark:border-slate-800 dark:bg-slate-950/80 dark:shadow-black/20">
              <div className="rounded-3xl bg-slate-100 p-5 dark:bg-slate-900">
                <p className="text-sm uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">Session snapshot</p>
                <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                  <p>Progress: <span className="font-semibold text-slate-900 dark:text-white">{module?.progress_percent}%</span></p>
                  <p>Status: <span className="font-semibold">{module?.status}</span></p>
                  <p>Watch time: <span className="font-semibold">{displayWatchSeconds}s</span></p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleComplete}
                disabled={completeMutation.status === "pending" || module?.status !== "AVAILABLE" || !allAnswered}
                className="w-full rounded-3xl bg-blue-600 px-5 py-4 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {completeMutation.status === "pending" ? "Submitting answers…" : "Submit Answers"}
              </button>

              {completeMutation.isError ? (
                <p className="text-sm text-red-600 dark:text-red-400">{completeMutation.error instanceof Error ? completeMutation.error.message : "Submission failed."}</p>
              ) : null}

              {submissionResult?.passed ? (
                <div className="rounded-[2rem] border border-blue-200 bg-blue-50 p-5 text-slate-900 shadow-sm dark:border-blue-500/30 dark:bg-blue-950/80 dark:text-slate-100">
                  <p className="text-sm uppercase tracking-[0.35em] text-blue-600 dark:text-blue-300">Continue momentum</p>
                  <h3 className="mt-3 text-xl font-semibold">Next up</h3>
                  <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">Maintain your flow by moving to the next unlocked module.</p>
                  {submissionResult.next_module ? (
                    <div className="mt-4 rounded-3xl bg-white p-4 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                      <p className="font-semibold">{submissionResult.next_module.title}</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">ID: {submissionResult.next_module.id}</p>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">Roadmap has been updated with your progress.</p>
                  )}
                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <Link href="/roadmap" className="inline-flex w-full items-center justify-center rounded-3xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950">
                      View roadmap
                    </Link>
                    {submissionResult.next_module ? (
                      <Link href={`/modules/${submissionResult.next_module.id}`} className="inline-flex w-full items-center justify-center rounded-3xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700">
                        Continue to next module
                      </Link>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}
