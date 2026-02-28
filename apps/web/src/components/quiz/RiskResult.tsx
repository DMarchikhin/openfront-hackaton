import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type RiskLevel = 'conservative' | 'balanced' | 'growth';

interface RiskResultProps {
  riskLevel: RiskLevel;
  description: string;
  totalScore: number;
  maxPossibleScore: number;
}

const RISK_CONFIG: Record<RiskLevel, { label: string; card: string }> = {
  conservative: {
    label: 'Conservative',
    card: 'bg-sky-50 border-sky-200',
  },
  balanced: {
    label: 'Balanced',
    card: 'bg-green-50 border-green-200',
  },
  growth: {
    label: 'Growth',
    card: 'bg-purple-50 border-purple-200',
  },
};

export function RiskResult({ riskLevel, description, totalScore, maxPossibleScore }: RiskResultProps) {
  const config = RISK_CONFIG[riskLevel];
  const percentage = Math.round((totalScore / maxPossibleScore) * 100);

  return (
    <div className="w-full max-w-xl mx-auto space-y-6 text-center">
      <div>
        <p className="text-sm text-muted-foreground mb-2">Your investment personality</p>
        <div className={`inline-block border rounded-2xl px-8 py-6 ${config.card}`}>
          <Badge variant="secondary">{config.label}</Badge>
          <p className="mt-3 text-4xl font-bold">{percentage}%</p>
          <p className="mt-1 text-sm text-muted-foreground">risk score</p>
        </div>
      </div>

      <p className="text-muted-foreground text-base leading-relaxed">{description}</p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button asChild size="lg">
          <Link href={`/strategies?riskLevel=${riskLevel}`}>
            View matching strategies →
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/strategies">Browse all strategies</Link>
        </Button>
      </div>
    </div>
  );
}
