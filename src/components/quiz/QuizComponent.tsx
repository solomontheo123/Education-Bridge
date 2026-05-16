"use client";

import { QuizQuestion } from "@/lib/schema";
import QuestionCard from "@/components/quiz/QuestionCard";

interface QuizComponentProps {
  questions: QuizQuestion[];
  answers: Record<number, number>;
  onAnswer: (questionIndex: number, optionIndex: number) => void;
}

export default function QuizComponent({ questions, answers, onAnswer }: QuizComponentProps) {
  return (
    <div className="space-y-5">
      {questions.map((question, index) => (
        <QuestionCard
          key={index}
          index={index}
          question={question.question}
          options={question.options}
          selectedOption={typeof answers[index] === "number" ? answers[index] : null}
          onSelect={(optionIndex) => onAnswer(index, optionIndex)}
        />
      ))}
    </div>
  );
}
