"use client";

import React, { useEffect, useState } from "react";
import { useUser } from "@/context/UserContext";
import { getRoadmap } from "@/lib/api";
import { motion } from "framer-motion";
import { CheckCircle, Clock, BookOpen } from "lucide-react";

export default function RoadmapPage() {
  const { userData } = useUser();
  const [roadmap, setRoadmap] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAIResult() {
      // Only fetch if we have user data
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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold mb-2">My Learning Roadmap</h1>
        <p className="text-gray-500">Tailored for your interest in {userData.interests}</p>
      </header>

      <div className="space-y-6">
        {roadmap.map((step, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.2 }}
            className="flex items-start gap-4 p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold">
              {index + 1}
            </div>
            <div>
              <p className="text-lg font-medium text-gray-800 dark:text-gray-100">
                {step}
              </p>
              <div className="flex gap-4 mt-3 text-sm text-gray-500">
                <span className="flex items-center gap-1"><Clock size={14}/> Flexible Time</span>
                <span className="flex items-center gap-1"><BookOpen size={14}/> Resources Provided</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
