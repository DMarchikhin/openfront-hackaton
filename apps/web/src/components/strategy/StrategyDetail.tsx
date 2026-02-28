import { Strategy } from '@/lib/api';
import { Button } from '@/components/ui/Button';

type RiskLevel = 'conservative' | 'balanced' | 'growth';

interface StrategyDetailProps {
  strategy: Strategy;
  onStartInvesting?: () => void;
  onSwitchStrategy?: () => void;
  hasActiveInvestment?: boolean;
  actionLoading?: boolean;
}

const RISK_DESCRIPTIONS: Record<RiskLevel, string> = {
  conservative: 'Steady, predictable returns with minimal movement across networks.',
  balanced: 'A mix of stability and growth potential across two established networks.',
  growth: 'Maximum yield potential by moving funds wherever the best rate is available.',
};

export function StrategyDetail({
  strategy,
  onStartInvesting,
  onSwitchStrategy,
  hasActiveInvestment = false,
  actionLoading = false,
}: StrategyDetailProps) {
  const riskDesc = RISK_DESCRIPTIONS[strategy.riskLevel as RiskLevel] ?? '';

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-5">
      <div>
        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">
          What this means for you
        </h4>
        <p className="text-gray-700 text-sm leading-relaxed">{riskDesc}</p>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Where your money goes
        </h4>
        <div className="space-y-2">
          {strategy.poolAllocations.map((p, i) => (
            <div key={i}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700 capitalize">
                  {p.protocol} on {p.chain}
                </span>
                <span className="font-semibold text-gray-900">{p.allocationPercentage}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gray-800 rounded-full"
                  style={{ width: `${p.allocationPercentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-4 text-sm">
        <div>
          <p className="text-gray-500">Expected APY</p>
          <p className="font-semibold text-gray-900">
            {strategy.expectedApyMin}–{strategy.expectedApyMax}%
          </p>
        </div>
        <div>
          <p className="text-gray-500">Rebalance when</p>
          <p className="font-semibold text-gray-900">&gt;{strategy.rebalanceThreshold}% difference</p>
        </div>
      </div>

      {(onStartInvesting || onSwitchStrategy) && (
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          disabled={actionLoading}
          onClick={hasActiveInvestment ? onSwitchStrategy : onStartInvesting}
        >
          {actionLoading
            ? 'Starting…'
            : hasActiveInvestment
            ? 'Switch to this strategy'
            : 'Start investing with this strategy →'}
        </Button>
      )}
    </div>
  );
}
