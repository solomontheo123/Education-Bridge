"use client";
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Unlock, PlayCircle, GraduationCap, Trophy, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface StudentProfile {
  assigned_track: number; 
  iq_style: string;
  preliminary_score: number;
  major_applied: string;
  is_admitted: boolean;
}

export default function Dashboard() {
  useAuth(); // Add authentication check

  const router = useRouter();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const fetched = useRef(false);
  const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000";

  useEffect(() => {
    if (!fetched.current) {
      const initPortal = async () => {
        const token = localStorage.getItem("eduBridgeToken");
        if (!token) {
          router.push("/login");
          return;
        }

        try {
          const res = await fetch(`${BACKEND_URL}/student-profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (res.ok) {
            const data = await res.json();
            // Only set profile if they have actually completed admission
            if (data.is_admitted) {
              setProfile(data);
            }
          }
        } catch (err) {
          console.error("Dashboard Sync Error:", err);
        } finally {
          setLoading(false);
        }
      };
      initPortal();
      fetched.current = true;
    }
  }, [router,BACKEND_URL]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-50 px-6">
      <div className="inline-flex items-center gap-4 rounded-3xl bg-white px-6 py-4 shadow-lg shadow-slate-200 dark:bg-slate-900 dark:shadow-slate-900/40">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
        <span className="font-semibold">Syncing student records...</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        
        <header className="mb-12 flex items-center gap-4">
          <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/40">
            <GraduationCap size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-black text-slate-900">EduBridge University</h1>
            <p className="text-slate-500 tracking-wide uppercase text-xs font-bold">Student Portal</p>
          </div>
        </header>

        {!profile ? (
          /* REDIRECT TO ADMISSIONS UI */
          <div className="max-w-2xl mx-auto bg-white p-12 rounded-[2.5rem] shadow-xl border border-slate-100 text-center animate-in fade-in zoom-in duration-500">
            <Trophy className="w-16 h-16 mx-auto mb-6 text-blue-600" />
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Admission Required</h2>
            <p className="text-slate-600 mb-8 font-medium">We couldn&apos;t find an active academic track for your account. You must pass the diagnostic entrance exam to begin.</p>
            
            <button 
              onClick={() => router.push('/admissions')}
              className="group w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-3"
            >
              Go to Admissions Office <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        ) : (
          /* ACTUAL ADMITTED STUDENT VIEW */
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-1000">
            <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-200 mb-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between dark:bg-slate-900 dark:border-slate-800">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500 dark:text-slate-400 mb-2">Academic Major</p>
                <h2 className="text-3xl font-semibold text-slate-900 dark:text-white">{profile.major_applied}</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-700 dark:bg-slate-950">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-600 mb-2">Assigned Path</p>
                  <p className="text-xl font-semibold text-slate-900 dark:text-white">{profile.assigned_track} Year Curriculum</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-700 dark:bg-slate-950">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-purple-600 mb-2">Cognitive Style</p>
                  <p className="text-xl font-semibold text-slate-900 dark:text-white">{profile.iq_style}</p>
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-semibold text-slate-900 mb-8 dark:text-slate-100">Your Learning Path</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {Array.from({ length: Math.max(1, profile.assigned_track) }).map((_, i) => (
                <div key={i} className={`relative p-8 rounded-[2rem] border transition-all duration-500 ${
                  i > 0 ? 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300' : 'border-blue-500 bg-white shadow-xl text-slate-900 dark:bg-slate-900 dark:text-white'
                }`}>
                  <div className="flex justify-between mb-6">
                    <span className={`text-xs font-semibold uppercase tracking-[0.35em] ${i > 0 ? 'text-slate-500 dark:text-slate-400' : 'text-blue-600'}`}>
                      Year {i + 1}
                    </span>
                    {i > 0 ? <Lock size={18} className="text-slate-400" /> : <Unlock size={18} className="text-green-500" />}
                  </div>

                  <h3 className="text-2xl font-semibold mb-4 leading-tight">{i === 0 ? 'Academic Foundations' : 'Advanced Concepts'}</h3>

                  {i === 0 ? (
                    <button className="w-full py-4 bg-blue-600 text-white rounded-3xl font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all">
                      <PlayCircle size={22} /> Start Lessons
                    </button>
                  ) : (
                    <div className="rounded-3xl bg-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-[0.25em] text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-center">
                      Prerequisites Lock
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}