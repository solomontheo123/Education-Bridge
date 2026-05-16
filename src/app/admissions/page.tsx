"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardCheck, GraduationCap, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Question {
  id: number;
  question: string;
  options: string[];
  answer: string;
  category: string;
}

interface ExamResult {
  score: number;
  assigned_track: string;
  profile: string;
  strengths: string[];
  weaknesses: string[];
  message: string;
  curriculum_count: number;
  major: string;
}

export default function AdmissionsExam() {
  const router = useRouter();
  // Add authentication check
  useAuth();
  const [examStarted, setExamStarted] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [major, setMajor] = useState('');
  const [examResult, setExamResult] = useState<ExamResult | null>(null);
  const [examSubmissionComplete, setExamSubmissionComplete] = useState(false);
  
  const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:9000";

  const startExam = async () => {
    if (!major.trim()) return alert('Please enter your intended major');
    
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/generate-exam?major=${encodeURIComponent(major)}`);
      const data = await response.json();
      
      // Safety: Ensure we actually got an array back before starting
      if (Array.isArray(data) && data.length > 0) {
        setQuestions(data);
        setExamStarted(true);
      } else {
        alert("The AI Faculty is busy. Please try a different major or retry.");
      }
    } catch (error) {
      console.error('Exam Generation Error:', error);
      alert('Failed to connect. Check your internet and Port 9000.');
    } finally {
      setLoading(false);
    }
  };

const submitExam = async () => {
  setLoading(true);
  const token = localStorage.getItem("eduBridgeToken");

  if (!token || token === 'null' || token === 'undefined') {
    alert('Please log in before submitting the exam.');
    setLoading(false);
    return;
  }

  try {
    // 1. Ensure data types are primitive (strings and booleans)
    const formattedResults = questions.map(q => ({
      category: String(q.category || 'General'),
      is_correct: Boolean(answers[q.id] === q.answer)
    }));

    const score = formattedResults.filter((result) => result.is_correct).length;
    const duration = score >= 4 ? 3 : score === 3 ? 4 : 5;
    const iq_style = score >= 4 ? "Analytical/High Mastery" : score === 3 ? "Balanced" : "Step-by-Step/Fundamental";

    // 2. Only send exactly what the SubmitExamRequest class has
    const payload = {
      major: String(major),
      results: formattedResults
    };

    console.log("Sending Payload:", payload);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const res = await fetch(`${BACKEND_URL}/evaluate-admissions-exam`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const curriculumCount = score >= 4 ? 3 : score === 3 ? 2 : 1;

      setExamResult({
        score,
        assigned_track: data.assigned_track || `${duration} Years`,
        profile: data.profile || iq_style,
        strengths: data.strengths || [],
        weaknesses: data.weaknesses || [],
        message: data.message || `Your score places you on a ${duration}-year track designed for steady academic growth.`,
        curriculum_count: curriculumCount,
        major: payload.major,
      });
      setExamSubmissionComplete(true);
      return;
    }

    let errorData;
    try {
      errorData = await res.json();
    } catch (error) {
      console.warn('Failed to parse error response as JSON:', error);
      errorData = { detail: await res.text() };
    }

    console.error('SERVER REJECTION DETAIL:', errorData);
    alert(`Error: ${errorData.detail || JSON.stringify(errorData)}`);
  } catch (error) {
    console.error('Fetch crashed:', error);
    if (error instanceof Error && error.name === 'AbortError') {
      alert('Request timed out. Please check your connection and try again.');
    } else {
      alert('Unable to submit exam. Please try again or log in again.');
    }
  } finally {
    setLoading(false);
  }
};

  // --- SAFETY GUARD: Ensure q is defined before rendering ---
  const q = questions.length > 0 ? questions[currentQuestion] : null;

  if (examSubmissionComplete && examResult) {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-[2rem] p-10">
          <div className="mb-10 text-center">
            <div className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-500/20">
              <GraduationCap size={28} />
            </div>
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-blue-600">Admissions Result</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">Your tailored path is ready</h1>
            <p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-400">We reviewed your exam performance and created a score-driven plan with the right duration, major recommendation, and curriculum packages.</p>
          </div>

          <section className="grid gap-4 md:grid-cols-2 mb-8">
            <article className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400 mb-3">Applied Major</p>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{examResult.major}</h2>
            </article>

            <article className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400 mb-3">Exam Score</p>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{examResult.score} / 5</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">Your score influences the recommended years and curriculum packages.</p>
            </article>
          </section>

          <section className="grid gap-4 md:grid-cols-3 mb-8">
            <article className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400 mb-3">Recommended Duration</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{examResult.assigned_track}</p>
            </article>
            <article className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400 mb-3">Curriculum Packages</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{examResult.curriculum_count}</p>
            </article>
            <article className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400 mb-3">Learning Style</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{examResult.profile}</p>
            </article>
          </section>

          <section className="rounded-[1.75rem] border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 p-6 mb-8">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">What this means</h3>
            <p className="text-sm leading-7 text-slate-600 dark:text-slate-400">{examResult.message}</p>
          </section>

          <section className="grid gap-4 md:grid-cols-2 mb-10">
            <article className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
              <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Strengths</h4>
              {examResult.strengths.length > 0 ? (
                <ul className="space-y-2 text-slate-700 dark:text-slate-300">
                  {examResult.strengths.map((skill) => (
                    <li key={skill} className="rounded-2xl bg-slate-100 dark:bg-slate-950 p-3">{skill}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm leading-7 text-slate-600 dark:text-slate-400">No clear strengths were detected yet. Focus on steady progress across the curriculum.</p>
              )}
            </article>

            <article className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
              <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Opportunities</h4>
              {examResult.weaknesses.length > 0 ? (
                <ul className="space-y-2 text-slate-700 dark:text-slate-300">
                  {examResult.weaknesses.map((weakness) => (
                    <li key={weakness} className="rounded-2xl bg-slate-100 dark:bg-slate-950 p-3">{weakness}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm leading-7 text-slate-600 dark:text-slate-400">You performed consistently. Use this insight to strengthen your focus areas.</p>
              )}
            </article>
          </section>

          <footer className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full sm:w-auto rounded-3xl border border-slate-300 bg-transparent px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              Open Dashboard
            </button>
            <button
              onClick={() => router.push('/curriculum')}
              className="w-full sm:w-auto rounded-3xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-700"
            >
              View Your Curriculum
            </button>
          </footer>
        </div>
      </div>
    );
  }

  if (!examStarted) {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-[2rem] p-10">
          <div className="mb-10">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-500/20">
              <GraduationCap size={28} />
            </div>
            <p className="mt-5 text-sm font-semibold uppercase tracking-[0.32em] text-blue-600">Entrance Exam</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">Begin your admission assessment</h1>
            <p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-400">Share your intended major and we’ll generate a tailored diagnostic exam that helps us understand your strengths and learning path.</p>
          </div>

          <div className="space-y-6">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Intended Major</label>
            <input
              type="text"
              placeholder="e.g., Software Engineering"
              value={major}
              onChange={(e) => setMajor(e.target.value)}
              className="w-full rounded-3xl border border-slate-300 bg-slate-50 px-5 py-4 text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-blue-400 dark:focus:ring-blue-900/30"
            />
            <p className="text-sm text-slate-500 dark:text-slate-400">Your major guides the exam questions and the career path we recommend.</p>
          </div>

          <button
            onClick={startExam}
            disabled={loading}
            className="mt-8 inline-flex w-full items-center justify-center rounded-3xl bg-blue-600 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Generating Exam…' : 'Generate Diagnostic Exam'}
          </button>
        </div>
      </div>
    );
  }

  // If examStarted is true but q is null (loading gap), show a spinner
  if (!q) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-[2rem] p-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-6 mb-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-blue-600">Admissions Exam</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">Question {currentQuestion + 1} of {questions.length}</h2>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 dark:bg-slate-950 dark:text-slate-300">
            <ClipboardCheck size={18} /> {q.category ? q.category.toUpperCase() : 'GENERAL'}
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <p className="text-xl font-semibold text-slate-900 dark:text-white leading-snug">{q.question}</p>
          </div>

          <fieldset className="grid gap-4">
            <legend className="sr-only">Answer options</legend>
            {q.options.map((option, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setAnswers(prev => ({ ...prev, [q.id]: option }))}
                className={`w-full rounded-3xl border px-5 py-4 text-left text-base font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                  answers[q.id] === option
                    ? 'border-blue-500 bg-blue-50 text-slate-900 dark:bg-blue-500/10 dark:text-white'
                    : 'border-slate-300 bg-white text-slate-900 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:border-slate-500'
                }`}
                aria-pressed={answers[q.id] === option}
              >
                {option}
              </button>
            ))}
          </fieldset>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => setCurrentQuestion(prev => prev - 1)}
              disabled={currentQuestion === 0}
              className="inline-flex items-center justify-center rounded-3xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:border-slate-500"
            >
              <ArrowLeft size={18} className="mr-2" /> Back
            </button>

            {currentQuestion === questions.length - 1 ? (
              <button
                type="button"
                onClick={submitExam}
                disabled={loading || !answers[q.id]}
                className="inline-flex items-center justify-center rounded-3xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Finalizing…' : 'Submit Admission Exam'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCurrentQuestion(prev => prev + 1)}
                disabled={!answers[q.id]}
                className="inline-flex items-center justify-center rounded-3xl border border-slate-300 bg-slate-100 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
              >
                Next Question
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}