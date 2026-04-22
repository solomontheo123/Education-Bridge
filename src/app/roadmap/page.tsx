"use client";

import React, { useEffect, useState } from "react";
import { useUser } from "@/context/UserContext";
import { getRoadmap } from "@/lib/api";
import { motion } from "framer-motion";
import { Clock, BookOpen, Download, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function RoadmapPage() {
  const { userData } = useUser();
  const [roadmap, setRoadmap] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAIResult() {
      if (userData.interests) {
        const result = await getRoadmap(userData);
        if (result && result.custom_roadmap) {
          setRoadmap(result.custom_roadmap);
        }
      }
      setLoading(false);
    }
    fetchAIResult();
  }, [userData]);

  // Handle case where user arrives with no data
  if (!loading && (!userData.interests || roadmap.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold mb-4">No Roadmap Found</h2>
        <p className="text-gray-500 mb-6">Please complete the onboarding to generate your path.</p>
        <Link href="/onboarding" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
          Go to Onboarding
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mb-4"
        />
        <p className="text-gray-600 animate-pulse">AI Mentor is drafting your plan...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 pb-20">
      {/* Header Section */}
      <header className="mb-12 text-center pt-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Your Personal Growth Path
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
            A guide to mastering <span className="font-semibold text-blue-600">{userData.interests}</span> for 
            your <span className="font-semibold text-blue-600">{userData.education}</span> level, 
            built to help you navigate {userData.barriers}.
          </p>
        </motion.div>
      </header>

      {/* Roadmap List with Timeline Line */}
      <div className="relative space-y-12 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-300 before:to-transparent">
        {roadmap.map((step, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.2 }}
            className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group"
          >
            {/* The Dot/Number */}
            <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-blue-600 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 font-bold">
              {index + 1}
            </div>

            {/* The Card */}
            <div className="w-[calc(100%-4rem)] md:w-[45%] p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all">
              <p className="text-gray-800 dark:text-gray-100 leading-relaxed mb-4">
                {step}
              </p>
              <div className="flex flex-wrap gap-4 text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                <span className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                    <Clock size={12}/> Flexible
                </span>
                <span className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                    <BookOpen size={12}/> Free Resources
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Bottom Actions */}
      <footer className="mt-16 flex flex-col md:flex-row gap-4 items-center justify-center no-print">
        <button 
          onClick={() => window.print()}
          className="flex items-center gap-2 px-8 py-3 bg-gray-900 dark:bg-white dark:text-gray-900 text-white rounded-full font-bold hover:scale-105 transition-transform shadow-lg"
        >
          <Download size={18} /> Save as PDF
        </button>
        
        <Link href="/onboarding" className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors">
          <ArrowLeft size={16} /> Start Over
        </Link>
      </footer>
    </div>
  );
}