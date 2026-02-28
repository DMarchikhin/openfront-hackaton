'use client';

import { useEffect, useState } from 'react';
import { fetchQuizQuestions, submitQuiz, QuizQuestion, QuizResult } from '@/lib/api';
import { QuestionCard } from './QuestionCard';
import { ProgressBar } from './ProgressBar';
import { RiskResult } from './RiskResult';
import { Button } from '@/components/ui/Button';

function getUserId(): string {
  if (typeof window === 'undefined') return 'user-ssr';
  let id = localStorage.getItem('userId');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('userId', id);
  }
  return id;
}

export function QuizStepper() {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);

  useEffect(() => {
    fetchQuizQuestions()
      .then((data) => setQuestions(data.questions))
      .catch(() => setError('Could not load quiz questions. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  const currentQuestion = questions[currentIndex];
  const selectedValue = currentQuestion ? selectedAnswers[currentQuestion.id] ?? null : null;

  function handleSelect(value: number) {
    if (!currentQuestion) return;
    setSelectedAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
  }

  async function handleNext() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setSubmitting(true);
      try {
        const answers = questions.map((q) => ({
          questionId: q.id,
          selectedValue: selectedAnswers[q.id],
        }));
        const data = await submitQuiz({ userId: getUserId(), answers });
        setResult(data);
      } catch {
        setError('Could not submit your answers. Please try again.');
      } finally {
        setSubmitting(false);
      }
    }
  }

  function handleBack() {
    setCurrentIndex((i) => Math.max(0, i - 1));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-gray-400">Loading questions…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <p className="text-red-500">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Try again
        </Button>
      </div>
    );
  }

  if (result) {
    return (
      <RiskResult
        riskLevel={result.riskLevel as 'conservative' | 'balanced' | 'growth'}
        description={result.description}
        totalScore={result.totalScore}
        maxPossibleScore={result.maxPossibleScore}
      />
    );
  }

  if (!currentQuestion) return null;

  const isLast = currentIndex === questions.length - 1;
  const canProceed = selectedValue !== null;

  return (
    <div className="w-full max-w-xl mx-auto space-y-8">
      <ProgressBar currentStep={currentIndex + 1} totalSteps={questions.length} />

      <QuestionCard
        question={currentQuestion.text}
        options={currentQuestion.options}
        selectedValue={selectedValue}
        onSelect={handleSelect}
      />

      <div className="flex justify-between">
        <Button
          variant="outline"
          size="md"
          onClick={handleBack}
          disabled={currentIndex === 0}
        >
          ← Back
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={handleNext}
          disabled={!canProceed || submitting}
        >
          {submitting ? 'Calculating…' : isLast ? 'See my profile →' : 'Next →'}
        </Button>
      </div>
    </div>
  );
}
