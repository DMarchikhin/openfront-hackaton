import Link from 'next/link';
import { ActiveInvestment } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type RiskLevel = 'conservative' | 'balanced' | 'growth';

interface InvestmentSummaryProps {
  investment: ActiveInvestment;
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

export function InvestmentSummary({ investment }: InvestmentSummaryProps) {
  const { strategy } = investment;
  const badgeClass = RISK_BADGE_CLASS[strategy.riskLevel as RiskLevel];
  const label = RISK_LABEL[strategy.riskLevel as RiskLevel];
  const activatedDate = new Date(investment.activatedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const midApy = ((strategy.expectedApyMin + strategy.expectedApyMax) / 2).toFixed(1);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Active strategy</p>
              <CardTitle className="text-2xl">{strategy.name}</CardTitle>
            </div>
            <Badge className={badgeClass}>{label}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Expected APY</p>
              <p className="text-xl font-bold mt-0.5">
                {strategy.expectedApyMin}–{strategy.expectedApyMax}%
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Est. daily on $1,000</p>
              <p className="text-xl font-bold mt-0.5">
                ${((1000 * parseFloat(midApy)) / 100 / 365).toFixed(2)}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="text-xl font-bold text-green-600 mt-0.5 capitalize">{investment.status}</p>
            </div>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">Activated on {activatedDate}</p>

          {investment.agentMessage && (
            <div className="mt-4 flex items-center gap-2 text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
              </span>
              {investment.agentMessage}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Where your money is working
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {strategy.poolAllocations.map((p, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="capitalize">
                    {p.protocol} · {p.chain}
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
        </CardContent>
      </Card>

      <Link
        href={`/strategies?riskLevel=${strategy.riskLevel}`}
        className="block text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Change strategy →
      </Link>
    </div>
  );
}
