'use client';

import { QuizOption } from '@/lib/api';

interface QuestionCardProps {
  question: string;
  options: QuizOption[];
  selectedValue: number | null;
  onSelect: (value: number) => void;
}

export function QuestionCard({ question, options, selectedValue, onSelect }: QuestionCardProps) {
  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      <p className="text-xl font-semibold text-gray-900 leading-snug">{question}</p>
      <div className="space-y-3">
        {options.map((option) => {
          const isSelected = selectedValue === option.value;
          return (
            <button
              key={option.value}
              onClick={() => onSelect(option.value)}
              className={`
                w-full text-left px-5 py-4 rounded-xl border-2 font-medium transition-all
                ${
                  isSelected
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                }
              `}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
