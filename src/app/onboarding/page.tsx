"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, CheckCircle, RotateCcw } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion"; // Day 9: Animation Tools
import { OnboardingData, onboardingSchema } from "@/lib/schema";
import { useUser } from "@/context/UserContext";

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState("");

  const { onboardingComplete, setOnboardingComplete } = useUser();

  const [formData, setFormData] = useState<OnboardingData>(() => {
    if (typeof window !== "undefined") {
      const savedData = localStorage.getItem("onboardingData");
      if (savedData) {
        try { return JSON.parse(savedData); } catch (e) { console.error(e); }
      }
    }
    return { education: "", interests: "", barriers: "" };
  });

  const educationOptions = ["High School", "Bachelor's Degree", "Master's Degree", "PhD", "Diploma/Certification", "Self-Taught"];
  const barrierOptions = ["Lack of time", "Limited resources", "Unclear career path", "Imposter syndrome", "Limited access to quality education", "Language barriers"];

  useEffect(() => {
    localStorage.setItem("onboardingData", JSON.stringify(formData));
  }, [formData]);

  const validateStep = () => {
    setErrors("");
    const result = onboardingSchema.safeParse(formData);
    if (!result.success) {
      const stepFields: Record<number, string> = { 1: "education", 2: "interests", 3: "barriers" };
      const fieldName = stepFields[currentStep];
      const fieldError = result.error.issues.find((err) => err.path[0] === fieldName);
      if (fieldError) {
        setErrors(fieldError.message);
        return false;
      }
    }
    return true;
  };

  const handleNext = () => { if (validateStep() && currentStep < 4) setCurrentStep(currentStep + 1); };
  const handlePrevious = () => { if (currentStep > 1) { setCurrentStep(currentStep - 1); setErrors(""); } };

  const handleSubmit = () => {
    const result = onboardingSchema.safeParse(formData);
    if (!result.success) {
      setErrors(`Wait! ${result.error.issues[0].message}`);
      return;
    }
    if (currentStep === 4) setOnboardingComplete(true);
    else setCurrentStep(4);
  };

  const handleReset = () => {
    setFormData({ education: "", interests: "", barriers: "" });
    localStorage.removeItem("onboardingData");
    localStorage.removeItem("onboardingComplete");
    setCurrentStep(1);
    setErrors("");
    setOnboardingComplete(false);
  };

  const updateField = (field: keyof OnboardingData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors("");
  };

  // SUCCESS STATE WITH "POP" ANIMATION
  if (onboardingComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 flex items-top justify-center px-6 py-12">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} 
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl w-full bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-12 text-center border border-gray-100 dark:border-slate-700"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1] }}
            transition={{ duration: 0.6, times: [0, 0.7, 1] }}
          >
            <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-6" />
          </motion.div>
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Welcome to the Bridge!</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8 text-lg">
            We are preparing your path to overcome <span className="font-bold text-blue-600">{formData.barriers.toLowerCase()}</span>.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/" className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-lg">Explore Courses</Link>
            <button onClick={handleReset} className="inline-flex items-center gap-2 px-8 py-3 bg-gray-100 dark:bg-gray-700 rounded-lg font-semibold"><RotateCcw className="w-5 h-5" /> Start Over</button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 flex items-top justify-center px-6 py-12">
      <div className="max-w-2xl w-full">
        {/* PROGRESS BAR WITH GLOW EFFECT */}
        <div className="mb-8">
          <div className="flex justify-between mb-3 text-sm font-semibold">
            <span className="text-gray-600 dark:text-gray-300">Step {currentStep} of 4</span>
            <span className="text-blue-600">{Math.round((currentStep / 4) * 100)}%</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative">
            <motion.div
              className="h-full bg-blue-600 relative"
              initial={{ width: 0 }}
              animate={{ width: `${(currentStep / 4) * 100}%` }}
              transition={{ duration: 0.5 }}
            >
              <motion.div 
                className="absolute inset-0 bg-white/30"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
              />
            </motion.div>
          </div>
        </div>

        {/* ANIMATED FORM CARD */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-10 border border-gray-100 dark:border-slate-700 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4 }}
            >
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">We would love to Know You</h2>

              {currentStep === 1 && (
                <div className="space-y-6">
                  <label className="block text-lg font-semibold text-gray-800 dark:text-white">Highest Education Level?</label>
                  <select value={formData.education} onChange={(e) => updateField("education", e.target.value)} className="w-full px-6 py-4 border-2 rounded-xl dark:bg-slate-700 focus:border-blue-500 outline-none">
                    <option value="">Select an option...</option>
                    {educationOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6">
                  <label className="block text-lg font-semibold text-gray-800 dark:text-white">What subjects interest you?</label>
                  <textarea value={formData.interests} onChange={(e) => updateField("interests", e.target.value)} className="w-full px-6 py-4 border-2 rounded-xl dark:bg-slate-700 focus:border-blue-500 outline-none resize-none" rows={5} placeholder="e.g. AI, Farming, Design..." />
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-4">
                  <label className="block text-lg font-semibold text-gray-800 dark:text-white">What is your biggest barrier?</label>
                  <div className="grid gap-3">
                    {barrierOptions.map((bar) => (
                      <label key={bar} className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${formData.barriers === bar ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-100 dark:border-gray-700"}`}>
                        <input type="radio" name="barriers" value={bar} checked={formData.barriers === bar} onChange={(e) => updateField("barriers", e.target.value)} className="w-5 h-5 text-blue-600" />
                        <span className="ml-4 text-gray-800 dark:text-white font-medium">{bar}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold text-center">Review Profile</h3>
                  <div className="space-y-4">
                    {[{ l: "Education", v: formData.education, s: 1 }, { l: "Interests", v: formData.interests, s: 2 }, { l: "Barrier", v: formData.barriers, s: 3 }].map((i) => (
                      <div key={i.l} className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl border-l-4 border-blue-500">
                        <p className="text-xs uppercase font-bold text-gray-500">{i.l}</p>
                        <p className="font-medium">{i.v}</p>
                        <button onClick={() => setCurrentStep(i.s)} className="text-sm text-blue-600 mt-1">Edit</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {errors && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg text-red-700 dark:text-red-400 text-sm font-medium">
              {errors}
            </motion.div>
          )}

          <div className="flex justify-between gap-4 mt-12">
            <button onClick={handlePrevious} disabled={currentStep === 1} className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold bg-gray-100 dark:bg-gray-700 disabled:opacity-50"><ChevronLeft className="w-5 h-5" /> Previous</button>
            {currentStep < 4 ? (
              <button onClick={handleNext} className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold shadow-lg shadow-blue-100">{currentStep === 3 ? "Review" : "Next"} <ChevronRight className="w-5 h-5" /></button>
            ) : (
              <button onClick={handleSubmit} className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 font-semibold shadow-lg shadow-green-100"><CheckCircle className="w-5 h-5" /> Confirm & Begin</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}