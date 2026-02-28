import { Strategy } from '@/lib/api';

type RiskLevel = 'conservative' | 'balanced' | 'growth';

interface StrategyCardProps {
  strategy: Strategy;
  isRecommended?: boolean;
  onClick?: () => void;
}

const RISK_CONFIG: Record<RiskLevel, { badge: string; label: string }> = {
  conservative: { badge: 'bg-sky-100 text-sky-700', label: 'Conservative' },
  balanced: { badge: 'bg-green-100 text-green-700', label: 'Balanced' },
  growth: { badge: 'bg-purple-100 text-purple-700', label: 'Growth' },
};

export function StrategyCard({ strategy, isRecommended = false, onClick }: StrategyCardProps) {
  const config = RISK_CONFIG[strategy.riskLevel as RiskLevel];

  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-xl border-2 p-5 cursor-pointer transition-all
        ${isRecommended ? 'border-gray-900 shadow-md' : 'border-gray-200 hover:border-gray-400 hover:shadow-sm'}
      `}
    >
      {isRecommended && (
        <p className="text-xs font-semibold text-gray-900 mb-2 uppercase tracking-wide">
          ✦ Recommended for you
        </p>
      )}

      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-bold text-gray-900">{strategy.name}</h3>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${config.badge}`}>
          {config.label}
        </span>
      </div>

      <p className="mt-1 text-2xl font-bold text-gray-900">
        {strategy.expectedApyMin}–{strategy.expectedApyMax}%
        <span className="text-sm font-normal text-gray-500 ml-1">APY</span>
      </p>

      <p className="mt-2 text-sm text-gray-500 line-clamp-2">{strategy.description}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {strategy.allowedChains.map((chain) => (
          <span
            key={chain}
            className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize"
          >
            {chain}
          </span>
        ))}
      </div>
    </div>
  );
}
