import Link from 'next/link';

type RiskLevel = 'conservative' | 'balanced' | 'growth';

interface RiskResultProps {
  riskLevel: RiskLevel;
  description: string;
  totalScore: number;
  maxPossibleScore: number;
}

const RISK_CONFIG: Record<RiskLevel, { label: string; badge: string; card: string }> = {
  conservative: {
    label: 'Conservative',
    badge: 'bg-sky-100 text-sky-700',
    card: 'bg-sky-50 border-sky-200',
  },
  balanced: {
    label: 'Balanced',
    badge: 'bg-green-100 text-green-700',
    card: 'bg-green-50 border-green-200',
  },
  growth: {
    label: 'Growth',
    badge: 'bg-purple-100 text-purple-700',
    card: 'bg-purple-50 border-purple-200',
  },
};

export function RiskResult({ riskLevel, description, totalScore, maxPossibleScore }: RiskResultProps) {
  const config = RISK_CONFIG[riskLevel];
  const percentage = Math.round((totalScore / maxPossibleScore) * 100);

  return (
    <div className="w-full max-w-xl mx-auto space-y-6 text-center">
      <div>
        <p className="text-sm font-medium text-gray-500 mb-2">Your investment personality</p>
        <div className={`inline-block border rounded-2xl px-8 py-6 ${config.card}`}>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${config.badge}`}>
            {config.label}
          </span>
          <p className="mt-3 text-4xl font-bold text-gray-900">{percentage}%</p>
          <p className="mt-1 text-sm text-gray-500">risk score</p>
        </div>
      </div>

      <p className="text-gray-600 text-base leading-relaxed">{description}</p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href={`/strategies?riskLevel=${riskLevel}`}
          className="px-8 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
        >
          View matching strategies →
        </Link>
        <Link
          href="/strategies"
          className="px-8 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          Browse all strategies
        </Link>
      </div>
    </div>
  );
}
