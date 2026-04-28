"use client";
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import ReactMarkdown from 'react-markdown';

interface Roadmap {
  id: number;
  interests: string;
  custom_roadmap: string[];
  created_at: string;
  user_id: string;
}

export default function Dashboard() {
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [loading, setLoading] = useState(true);
  const fetched = useRef(false); // 👈 This prevents the double-call

  useEffect(() => {
    // Only run if we haven't fetched yet
    if (!fetched.current) {
      const getData = async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          
          if (user) {
            const { data, error } = await supabase
              .from('roadmaps')
              .select('*')
              .eq('user_id', user.id) // 👈 Ensure you only get YOUR data
              .order('created_at', { ascending: false });

            if (!error) setRoadmaps(data || []);
          }
        } catch (err) {
          console.error("Lock error caught:", err);
        } finally {
          setLoading(false);
        }
      };

      getData();
      fetched.current = true; // 👈 Mark as done
    }
  }, []);

  if (loading) return <div className="p-10 text-center font-mono">Syncing with your library...</div>;

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-4xl font-extrabold mb-8 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
        My Learning Library
      </h1>
      
      {roadmaps.length === 0 ? (
        <div className="text-center p-20 border-2 border-dashed rounded-3xl">
          <p className="text-gray-500">Your library is empty. Let&apos;s build your first roadmap!</p>
          <a href="/roadmap" className="mt-4 inline-block text-blue-600 font-bold underline">Generate Now</a>
        </div>
      ) : (
        <div className="grid gap-8">
          {roadmaps.map((rm: Roadmap) => (
            <div key={rm.id} className="group p-8 border border-slate-200 rounded-3xl bg-white shadow-sm hover:shadow-xl transition-all duration-300">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                  {rm.interests}
                </h2>
                <span className="text-xs font-medium px-3 py-1 bg-blue-50 text-blue-600 rounded-full">
                  {new Date(rm.created_at).toLocaleDateString()}
                </span>
              </div>
              
              <div className="prose prose-slate max-w-none">
                {rm.custom_roadmap.map((step: string, i: number) => (
                  <div key={i} className="mb-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-200 transition-colors">
                    <ReactMarkdown>{step}</ReactMarkdown>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}