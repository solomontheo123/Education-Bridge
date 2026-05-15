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
      router.push('/dashboard');
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

  if (!examStarted) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md text-center">
          <GraduationCap className="mx-auto mb-6 text-blue-500" size={64} />
          <h1 className="text-4xl font-black mb-4">Entrance Exam</h1>
          <p className="text-slate-400 mb-8">Enter your major to generate a diagnostic exam tailored to your field.</p>
          <input
            type="text"
            placeholder="e.g., Software Engineering"
            value={major}
            onChange={(e) => setMajor(e.target.value)}
            className="w-full px-6 py-4 bg-slate-800 border border-slate-700 rounded-2xl text-white mb-6 focus:border-blue-500 outline-none transition-all"
          />
          <button 
            onClick={startExam}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl font-bold text-lg transition-all"
          >
            {loading ? 'Analyzing Major...' : 'Begin Assessment'}
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
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-slate-800 p-10 rounded-[2.5rem] shadow-2xl border border-slate-700">
        <div className="flex justify-between items-center mb-8">
          <span className="text-blue-400 font-black text-xs uppercase tracking-widest">
            Step {currentQuestion + 1} of {questions.length}
          </span>
          <ClipboardCheck className="text-slate-500" size={20} />
        </div>

        <h2 className="text-2xl font-bold mb-8 leading-tight">{q.question}</h2>
        
        <div className="grid gap-4 mb-10">
          {q.options.map((option, idx) => (
            <button
              key={idx}
              onClick={() => setAnswers(prev => ({ ...prev, [q.id]: option }))}
              className={`p-5 rounded-2xl border-2 text-left font-bold transition-all ${
                answers[q.id] === option ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <div className="flex justify-between">
          <button 
            onClick={() => setCurrentQuestion(prev => prev - 1)}
            disabled={currentQuestion === 0}
            className="flex items-center gap-2 text-slate-500 font-bold disabled:opacity-0"
          >
            <ArrowLeft size={18} /> Back
          </button>
          
          {currentQuestion === questions.length - 1 ? (
            <button 
              onClick={submitExam}
              disabled={loading || !answers[q.id]}
              className="px-10 py-4 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-900/20"
            >
              {loading ? 'Finalizing...' : 'Submit Admission Exam'}
            </button>
          ) : (
            <button 
              onClick={() => setCurrentQuestion(prev => prev + 1)}
              disabled={!answers[q.id]}
              className="px-10 py-4 bg-white text-slate-900 rounded-2xl font-bold hover:bg-slate-100 transition-all"
            >
              Next Question
            </button>
          )}
        </div>
      </div>
    </div>
  );
}