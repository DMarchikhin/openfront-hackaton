import { Strategy } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type RiskLevel = 'conservative' | 'balanced' | 'growth';

interface StrategyCardProps {
  strategy: Strategy;
  isRecommended?: boolean;
  onClick?: () => void;
}

const RISK_BADGE_CLASS: Record<RiskLevel, string> = {
  conservative: 'bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-100',
  balanced: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-100',
  growth: 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100',
};

const RISK_LABEL: Record<RiskLevel, string> = {
  conservative: 'Conservative',
  balanced: 'Balanced',
  growth: 'Growth',
};

export function StrategyCard({ strategy, isRecommended = false, onClick }: StrategyCardProps) {
  const badgeClass = RISK_BADGE_CLASS[strategy.riskLevel as RiskLevel];
  const label = RISK_LABEL[strategy.riskLevel as RiskLevel];

  return (
    <Card
      onClick={onClick}
      className={cn(
        'cursor-pointer transition-all',
        isRecommended
          ? 'border-primary ring-1 ring-primary shadow-md'
          : 'hover:border-primary/40 hover:shadow-sm'
      )}
    >
      <CardContent className="p-5">
        {isRecommended && (
          <p className="text-xs font-semibold text-primary mb-2 uppercase tracking-wide">
            ✦ Recommended for you
          </p>
        )}

        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-bold">{strategy.name}</h3>
          <Badge className={badgeClass}>{label}</Badge>
        </div>

        <p className="mt-1 text-2xl font-bold">
          {strategy.expectedApyMin}–{strategy.expectedApyMax}%
          <span className="text-sm font-normal text-muted-foreground ml-1">APY</span>
        </p>

        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{strategy.description}</p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {strategy.allowedChains.map((chain) => (
            <Badge key={chain} variant="secondary" className="capitalize text-xs">
              {chain}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
