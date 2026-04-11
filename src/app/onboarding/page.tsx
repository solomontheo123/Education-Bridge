"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, CheckCircle, RotateCcw } from "lucide-react";
import Link from "next/link";

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState(() => {
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
  const [errors, setErrors] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

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

  // Hour 1: Save formData to LocalStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("onboardingData", JSON.stringify(formData));
  }, [formData]);

  const validateStep = () => {
    setErrors("");

    if (currentStep === 1 && !formData.education) {
      setErrors("Please select your education level");
      return false;
    }
    if (currentStep === 2 && !formData.interests.trim()) {
      setErrors("Please tell us what subjects interest you");
      return false;
    }
    if (currentStep === 3 && !formData.barriers) {
      setErrors("Please select the barrier that resonates most");
      return false;
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
    if (currentStep === 4) {
      // Final submission - move to success
      setIsSubmitted(true);
      console.log("Form submitted:", formData);
    } else if (validateStep()) {
      // Move to review step
      setCurrentStep(4);
    }
  };

  // Hour 4.5: Reset form function
  const handleReset = () => {
    const resetData = {
      education: "",
      interests: "",
      barriers: "",
    };
    setFormData(resetData);
    localStorage.removeItem("onboardingData");
    setCurrentStep(1);
    setErrors("");
    setIsSubmitted(false);
  };

  const handleEducationChange = (value: string) => {
    setFormData({ ...formData, education: value });
    setErrors("");
  };

  const handleInterestsChange = (value: string) => {
    setFormData({ ...formData, interests: value });
    setErrors("");
  };

  const handleBarrierChange = (value: string) => {
    setFormData({ ...formData, barriers: value });
    setErrors("");
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-bridge-blue/5 to-blue-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center px-6 py-12">
        <div className="max-w-2xl w-full">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-12 text-center">
            <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-6" />
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Welcome to the Bridge!
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">
              Thank you for completing your profile.
            </p>
            <p className="text-gray-500 dark:text-gray-400 mb-8 text-lg">
              Based on your interest in <span className="font-bold text-bridge-blue">{formData.interests}</span>, we are preparing your personalized learning path to help you overcome <span className="font-bold text-bridge-blue">{formData.barriers.toLowerCase()}</span>.
            </p>
            <div className="space-y-3 mb-8">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-semibold">Your Education Level:</span> {formData.education}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/"
                className="inline-block px-8 py-3 bg-bridge-blue text-white rounded-lg hover:bg-bridge-blue/90 transition-colors duration-300 font-semibold"
              >
                Explore Courses
              </Link>
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-2 px-8 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-300 font-semibold justify-center"
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
    <div className="min-h-screen bg-gradient-to-br from-bridge-blue/5 to-blue-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center px-6 py-12">
      <div className="max-w-2xl w-full">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-3">
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">
              Step {currentStep} of 4
            </span>
            <span className="text-sm font-semibold text-bridge-blue">
              {Math.round((currentStep / 4) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-bridge-blue transition-all duration-500"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Let&apos;s Get to Know You
          </h2>

          {/* Step 1: Education */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-lg font-semibold text-gray-800 dark:text-white mb-4">
                  What is your current highest level of education?
                </label>
                <select
                  value={formData.education}
                  onChange={(e) => handleEducationChange(e.target.value)}
                  className="w-full px-6 py-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:border-bridge-blue transition-colors duration-300"
                >
                  <option value="">Select an option...</option>
                  {educationOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Step 2: Interests */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-lg font-semibold text-gray-800 dark:text-white mb-4">
                  What subjects make you lose track of time?
                </label>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Think about topics that fascinate you or projects you could work on endlessly.
                </p>
                <textarea
                  value={formData.interests}
                  onChange={(e) => handleInterestsChange(e.target.value)}
                  placeholder="e.g., Building mobile apps, analyzing data, creating art..."
                  className="w-full px-6 py-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:border-bridge-blue transition-colors duration-300 resize-none"
                  rows={5}
                ></textarea>
              </div>
            </div>
          )}

          {/* Step 3: Barriers */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <label className="block text-lg font-semibold text-gray-800 dark:text-white mb-4">
                  What is the biggest barrier between you and your dream job?
                </label>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  We want to help you overcome these obstacles.
                </p>
                <div className="space-y-3">
                  {barrierOptions.map((barrier) => (
                    <label
                      key={barrier}
                      className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all duration-300 ${
                        formData.barriers === barrier
                          ? "border-bridge-blue bg-bridge-blue/5 dark:bg-bridge-blue/10"
                          : "border-gray-300 dark:border-gray-600 hover:border-bridge-blue/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="barriers"
                        value={barrier}
                        checked={formData.barriers === barrier}
                        onChange={(e) => handleBarrierChange(e.target.value)}
                        className="w-5 h-5 text-bridge-blue cursor-pointer"
                      />
                      <span className="ml-4 text-gray-800 dark:text-white font-medium">
                        {barrier}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review & Summary */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Let&apos;s Review Your Profile
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Please verify your information before we begin
                </p>
              </div>

              <div className="space-y-4">
                {/* Education Review */}
                <div className="p-6 bg-gray-50 dark:bg-slate-700 rounded-lg border-l-4 border-bridge-blue">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Education Level</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {formData.education}
                  </p>
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="text-sm text-bridge-blue hover:text-bridge-blue/90 mt-2 font-medium"
                  >
                    Edit
                  </button>
                </div>

                {/* Interests Review */}
                <div className="p-6 bg-gray-50 dark:bg-slate-700 rounded-lg border-l-4 border-bridge-blue">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Your Interests</p>
                  <p className="text-lg text-gray-900 dark:text-white">
                    {formData.interests}
                  </p>
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="text-sm text-bridge-blue hover:text-bridge-blue/90 mt-2 font-medium"
                  >
                    Edit
                  </button>
                </div>

                {/* Barriers Review */}
                <div className="p-6 bg-gray-50 dark:bg-slate-700 rounded-lg border-l-4 border-bridge-blue">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Main Barrier</p>
                  <p className="text-lg text-gray-900 dark:text-white">
                    {formData.barriers}
                  </p>
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="text-sm text-bridge-blue hover:text-bridge-blue/90 mt-2 font-medium"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errors && (
            <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded">
              <p className="text-red-700 dark:text-red-400 font-medium">{errors}</p>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between gap-4 mt-12">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors duration-300 ${
                currentStep === 1
                  ? "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
              Previous
            </button>

            {currentStep < 4 ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-8 py-3 bg-bridge-blue text-white rounded-lg hover:bg-bridge-blue/90 font-semibold transition-colors duration-300"
              >
                {currentStep === 3 ? "Review" : "Next"}
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition-colors duration-300"
              >
                <CheckCircle className="w-5 h-5" />
                Confirm & Begin
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
