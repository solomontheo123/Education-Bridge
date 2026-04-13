"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, CheckCircle, RotateCcw } from "lucide-react";
import Link from "next/link";
import { OnboardingData, onboardingSchema } from "@/lib/schema";

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Lazy initialization of state with LocalStorage
  const [formData, setFormData] = useState<OnboardingData>(() => {
    if (typeof window !== "undefined") {
      const savedData = localStorage.getItem("onboardingData");
      if (savedData) {
        try {
          return JSON.parse(savedData);
        } catch (error) {
          console.error("Error loading onboarding data:", error);
        }
      }
    }
    return {
      education: "",
      interests: "",
      barriers: "",
    };
  });

  const educationOptions = [
    "High School",
    "Bachelor's Degree",
    "Master's Degree",
    "PhD",
    "Diploma/Certification",
    "Self-Taught",
  ];

  const barrierOptions = [
    "Lack of time",
    "Limited resources",
    "Unclear career path",
    "Imposter syndrome",
    "Limited access to quality education",
    "Language barriers",
  ];

  // Persistence: Save data whenever it changes
  useEffect(() => {
    localStorage.setItem("onboardingData", JSON.stringify(formData));
  }, [formData]);

  // Zod "Bouncer" logic for step validation
  const validateStep = () => {
    setErrors("");
    const result = onboardingSchema.safeParse(formData);

    if (!result.success) {
      const stepFields: Record<number, string> = {
        1: formData.education,
        2: formData.interests,
        3: formData.barriers,
      };

      const currentFieldName = stepFields[currentStep];
    
    // Look for errors ONLY for this specific step
    const hasErrorThisStep = result.error.issues.find(
      (issue) => issue.path[0] === currentFieldName
    );

    if (hasErrorThisStep) {
      setErrors(hasErrorThisStep.message);
      return false;
    }
  }
  return true;
};

  const handleNext = () => {
    if (validateStep()) {
      if (currentStep < 4) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setErrors("");
    }
  };

  const handleSubmit = () => {
    const result = onboardingSchema.safeParse(formData);

    if (!result.success) {
      // Changed .errors to .issues to fix the property error
      const firstError = result.error.issues[0].message;
      setErrors(`Wait! Review your answers before submitting. ${firstError}`);
      return;
    }

    if (currentStep === 4) {
      setIsSubmitted(true);
      console.log("Clean Data for AI:", result.data);
    } else {
      setCurrentStep(4);
    }
  };

  const handleReset = () => {
    setFormData({
      education: "",
      interests: "",
      barriers: "",
    });
    localStorage.removeItem("onboardingData");
    setCurrentStep(1);
    setErrors("");
    setIsSubmitted(false);
  };

  // Helper to update state and clear step errors
  const updateField = (field: keyof OnboardingData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors("");
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center px-6 py-12">
        <div className="max-w-2xl w-full">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-12 text-center border border-gray-100 dark:border-slate-700">
            <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-6" />
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Welcome to the Bridge!
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8 text-lg">
              Based on your interest in <span className="font-bold text-blue-600">{formData.interests}</span>, we are preparing your path to overcome <span className="font-bold text-blue-600">{formData.barriers.toLowerCase()}</span>.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/"
                className="inline-block px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold shadow-lg shadow-blue-200"
              >
                Explore Courses
              </Link>
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-2 px-8 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 transition-all font-semibold justify-center"
              >
                <RotateCcw className="w-5 h-5" />
                Start Over
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center px-6 py-12">
      <div className="max-w-2xl w-full">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-3">
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">
              Step {currentStep} of 4
            </span>
            <span className="text-sm font-semibold text-blue-600">
              {Math.round((currentStep / 4) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-500"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-10 border border-gray-100 dark:border-slate-700">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Let&apos;s Get to Know You
          </h2>

          {currentStep === 1 && (
            <div className="space-y-6">
              <label className="block text-lg font-semibold text-gray-800 dark:text-white mb-4">
                What is your current highest level of education?
              </label>
              <select
                value={formData.education}
                onChange={(e) => updateField("education", e.target.value)}
                className="w-full px-6 py-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 transition-all"
              >
                <option value="">Select an option...</option>
                {educationOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <label className="block text-lg font-semibold text-gray-800 dark:text-white mb-4">
                What subjects make you lose track of time?
              </label>
              <textarea
                value={formData.interests}
                onChange={(e) => updateField("interests", e.target.value)}
                placeholder="e.g., Building mobile apps, analyzing data..."
                className="w-full px-6 py-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 transition-all resize-none"
                rows={5}
              ></textarea>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <label className="block text-lg font-semibold text-gray-800 dark:text-white mb-4">
                What is the biggest barrier between you and your dream job?
              </label>
              <div className="grid gap-3">
                {barrierOptions.map((barrier) => (
                  <label
                    key={barrier}
                    className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      formData.barriers === barrier
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-100 dark:border-gray-700 hover:border-blue-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="barriers"
                      value={barrier}
                      checked={formData.barriers === barrier}
                      onChange={(e) => updateField("barriers", e.target.value)}
                      className="w-5 h-5 text-blue-600 cursor-pointer"
                    />
                    <span className="ml-4 text-gray-800 dark:text-white font-medium">{barrier}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">Review Profile</h3>
              <div className="space-y-4">
                {[
                  { label: "Education", value: formData.education, step: 1 },
                  { label: "Interests", value: formData.interests, step: 2 },
                  { label: "Main Barrier", value: formData.barriers, step: 3 },
                ].map((item) => (
                  <div key={item.label} className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl border-l-4 border-blue-500">
                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">{item.label}</p>
                    <p className="text-gray-900 dark:text-white font-medium">{item.value}</p>
                    <button onClick={() => setCurrentStep(item.step)} className="text-sm text-blue-600 mt-2 hover:underline">Edit</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {errors && (
            <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg">
              <p className="text-red-700 dark:text-red-400 font-medium text-sm">{errors}</p>
            </div>
          )}

          <div className="flex justify-between gap-4 mt-12">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50"
            >
              <ChevronLeft className="w-5 h-5" /> Previous
            </button>

            {currentStep < 4 ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold transition-all shadow-lg shadow-blue-100"
              >
                {currentStep === 3 ? "Review" : "Next"} <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 font-semibold transition-all shadow-lg shadow-green-100"
              >
                <CheckCircle className="w-5 h-5" /> Confirm & Begin
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}