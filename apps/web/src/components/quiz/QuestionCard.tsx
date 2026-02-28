'use client';

import { QuizOption } from '@/lib/api';
import { cn } from '@/lib/utils';

interface QuestionCardProps {
  question: string;
  options: QuizOption[];
  selectedValue: number | null;
  onSelect: (value: number) => void;
}

export function QuestionCard({ question, options, selectedValue, onSelect }: QuestionCardProps) {
  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      <p className="text-xl font-semibold leading-snug">{question}</p>
      <div className="space-y-3">
        {options.map((option) => {
          const isSelected = selectedValue === option.value;
          return (
            <button
              key={option.value}
              onClick={() => onSelect(option.value)}
              className={cn(
                'w-full text-left px-5 py-4 rounded-lg border-2 text-sm font-medium transition-all',
                isSelected
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background hover:border-primary/50 hover:bg-accent'
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
