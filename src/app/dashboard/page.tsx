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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-mono">
      <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mr-4"></div>
      Syncing Student Records...
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        
        <header className="mb-12 flex items-center gap-4">
          <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200">
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
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200 mb-10 flex flex-wrap gap-8 items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Academic Major</p>
                <h2 className="text-3xl font-black text-slate-900">{profile.major_applied}</h2>
              </div>
              <div className="flex gap-4">
                <div className="bg-blue-50 px-5 py-3 rounded-2xl border border-blue-100">
                  <p className="text-[10px] font-black text-blue-600 uppercase mb-1">Assigned Path</p>
                  <p className="font-black text-slate-800">{profile.assigned_track} Year Curriculum</p>
                </div>
                <div className="bg-purple-50 px-5 py-3 rounded-2xl border border-purple-100">
                  <p className="text-[10px] font-black text-purple-600 uppercase mb-1">Cognitive Style</p>
                  <p className="font-black text-slate-800">{profile.iq_style}</p>
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-8">Your Learning Path</h2>
            <div className={`grid grid-cols-1 md:grid-cols-${profile.assigned_track} gap-6`}>
              {Array.from({ length: profile.assigned_track }).map((_, i) => (
                <div key={i} className={`
                  relative p-8 rounded-[2.5rem] border-2 transition-all duration-500
                  ${i > 0 ? 'bg-slate-100/50 border-slate-200 opacity-40 grayscale' : 'bg-white border-blue-500 shadow-2xl scale-105 shadow-blue-100'}
                `}>
                  <div className="flex justify-between mb-8">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${i > 0 ? 'text-slate-400' : 'text-blue-600'}`}>
                      Year 0{i + 1}
                    </span>
                    {i > 0 ? <Lock size={18} className="text-slate-400" /> : <Unlock size={18} className="text-green-500" />}
                  </div>

                  <h3 className="text-2xl font-black text-slate-800 mb-4 leading-tight">
                    {i > 0 ? 'Advanced Concepts' : 'Academic Foundations'}
                  </h3>

                  {i === 0 ? (
                    <button className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all">
                      <PlayCircle size={22} /> Start Lessons
                    </button>
                  ) : (
                    <div className="py-3 px-4 bg-slate-200 text-slate-500 text-[10px] font-black rounded-xl text-center uppercase tracking-wider">
                      Prerequisites Unmet
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