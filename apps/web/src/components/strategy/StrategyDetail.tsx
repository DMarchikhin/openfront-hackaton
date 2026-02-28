import Link from 'next/link';
import { Strategy } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type RiskLevel = 'conservative' | 'balanced' | 'growth';

interface StrategyDetailProps {
  strategy: Strategy;
  onStartInvesting?: () => void;
  onSwitchStrategy?: () => void;
  hasActiveInvestment?: boolean;
  isCurrentStrategy?: boolean;
  actionLoading?: boolean;
  userAmount?: string;
  onAmountChange?: (amount: string) => void;
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
  isCurrentStrategy = false,
  actionLoading = false,
  userAmount = '1000',
  onAmountChange,
}: StrategyDetailProps) {
  const riskDesc = RISK_DESCRIPTIONS[strategy.riskLevel as RiskLevel] ?? '';

  return (
    <div className="bg-muted/30 border border-border rounded-xl p-5 space-y-5">
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
          What this means for you
        </h4>
        <p className="text-sm leading-relaxed">{riskDesc}</p>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Where your money goes
        </h4>
        <div className="space-y-2">
          {strategy.poolAllocations.map((p, i) => (
            <div key={i}>
              <div className="flex justify-between text-sm mb-1">
                <span className="capitalize">
                  {p.protocol} on {p.chain}
                </span>
                <span className="font-semibold">{p.allocationPercentage}%</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${p.allocationPercentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Expected APY</p>
          <p className="font-semibold">
            {strategy.expectedApyMin}–{strategy.expectedApyMax}%
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Rebalance when</p>
          <p className="font-semibold">&gt;{strategy.rebalanceThreshold}% difference</p>
        </div>
      </div>

      {isCurrentStrategy ? (
        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          <span className="text-sm font-medium text-green-700">✓ This is your active strategy</span>
          <Link href="/dashboard" className="text-sm font-medium text-green-700 hover:text-green-900 underline underline-offset-2">
            View dashboard →
          </Link>
        </div>
      ) : (onStartInvesting || onSwitchStrategy) && (
        <div className="space-y-3">
          {onAmountChange && (
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Amount to invest (USD)</label>
              <Input
                type="number"
                min="1"
                step="100"
                value={userAmount}
                onChange={(e) => onAmountChange(e.target.value)}
              />
            </div>
          )}
          <Button
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
        </div>
      )}
    </div>
  );
}
