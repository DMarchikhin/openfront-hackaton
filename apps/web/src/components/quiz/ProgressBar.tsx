import { Progress } from '@/components/ui/progress';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  const pct = Math.round((currentStep / totalSteps) * 100);
  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">
          Question {currentStep} of {totalSteps}
        </span>
        <span className="text-sm text-muted-foreground">{pct}%</span>
      </div>
      <Progress value={pct} />
    </div>
  );
}
