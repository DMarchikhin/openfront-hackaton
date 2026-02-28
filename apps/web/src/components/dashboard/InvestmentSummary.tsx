import Link from 'next/link';
import { ActiveInvestment } from '@/lib/api';

type RiskLevel = 'conservative' | 'balanced' | 'growth';

interface InvestmentSummaryProps {
  investment: ActiveInvestment;
}

const RISK_CONFIG: Record<RiskLevel, { badge: string; label: string }> = {
  conservative: { badge: 'bg-sky-100 text-sky-700', label: 'Conservative' },
  balanced: { badge: 'bg-green-100 text-green-700', label: 'Balanced' },
  growth: { badge: 'bg-purple-100 text-purple-700', label: 'Growth' },
};

export function InvestmentSummary({ investment }: InvestmentSummaryProps) {
  const { strategy } = investment;
  const config = RISK_CONFIG[strategy.riskLevel as RiskLevel];
  const activatedDate = new Date(investment.activatedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const midApy = ((strategy.expectedApyMin + strategy.expectedApyMax) / 2).toFixed(1);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">Active strategy</p>
            <h2 className="text-2xl font-bold text-gray-900">{strategy.name}</h2>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${config.badge}`}>
            {config.label}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">Expected APY</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">
              {strategy.expectedApyMin}–{strategy.expectedApyMax}%
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">Est. daily on $1,000</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">
              ${((1000 * parseFloat(midApy)) / 100 / 365).toFixed(2)}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">Status</p>
            <p className="text-xl font-bold text-green-600 mt-0.5 capitalize">{investment.status}</p>
          </div>
        </div>

        <p className="mt-4 text-xs text-gray-400">Activated on {activatedDate}</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Where your money is working
        </h3>
        <div className="space-y-2">
          {strategy.poolAllocations.map((p, i) => (
            <div key={i}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700 capitalize">
                  {p.protocol} · {p.chain}
                </span>
                <span className="font-semibold text-gray-900">{p.allocationPercentage}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gray-800 rounded-full"
                  style={{ width: `${p.allocationPercentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <Link
        href={`/strategies?riskLevel=${strategy.riskLevel}`}
        className="block text-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        Change strategy →
      </Link>
    </div>
  );
}
