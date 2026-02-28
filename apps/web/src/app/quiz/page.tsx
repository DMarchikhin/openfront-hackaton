import { QuizStepper } from '@/components/quiz/QuizStepper';

export default function QuizPage() {
  return (
    <div className="flex flex-col items-center py-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">What kind of saver are you?</h1>
        <p className="mt-2 text-gray-500 text-sm">5 quick questions · about 60 seconds</p>
      </div>
      <QuizStepper />
    </div>
  );
}
