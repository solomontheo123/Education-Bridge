"use client";

import React from "react";

interface QuestionCardProps {
  index: number;
  question: string;
  options: string[];
  selectedOption: number | null;
  onSelect: (choice: number) => void;
}

export default function QuestionCard({
  index,
  question,
  options,
  selectedOption,
  onSelect,
}: QuestionCardProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <p className="font-semibold text-slate-900 dark:text-white">{index + 1}. {question}</p>
      <div className="mt-4 grid gap-3">
        {options.map((option, optionIndex) => (
          <button
            key={optionIndex}
            type="button"
            onClick={() => onSelect(optionIndex)}
            className={`rounded-3xl border px-4 py-3 text-left text-sm transition ${
              selectedOption === optionIndex
                ? "border-blue-600 bg-blue-600/10 text-blue-900 dark:border-blue-400 dark:bg-blue-400/10 dark:text-blue-100"
                : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
