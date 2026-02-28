'use client';

interface YieldProjectionProps {
  investedAmount: number;
  apyPercent: number;
}

function calcYield(principal: number, apy: number, months: number): number {
  return principal * (apy / 100) * (months / 12);
}

function fmt(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const MILESTONES = [
  { label: '1 mo', months: 1 },
  { label: '3 mo', months: 3 },
  { label: '6 mo', months: 6 },
  { label: '12 mo', months: 12 },
];

export function YieldProjection({ investedAmount, apyPercent }: YieldProjectionProps) {
  if (investedAmount <= 0 || apyPercent <= 0) return null;

  const values = MILESTONES.map(({ months }) => calcYield(investedAmount, apyPercent, months));
  const max = values[values.length - 1] ?? 1;

  // SVG sparkline: 4 points across width=200, height=40
  const W = 200;
  const H = 40;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - (v / max) * H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const polyline = points.join(' ');

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Projected Earnings</h3>
        <span className="text-xs text-gray-400">{apyPercent.toFixed(2)}% APY</span>
      </div>

      {/* Sparkline */}
      <div className="mb-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-8" preserveAspectRatio="none">
          <polyline
            points={polyline}
            fill="none"
            stroke="#16a34a"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {values.map((v, i) => {
            const x = (i / (values.length - 1)) * W;
            const y = H - (v / max) * H;
            return <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r="3" fill="#16a34a" />;
          })}
        </svg>
      </div>

      {/* Milestone columns */}
      <div className="grid grid-cols-4 gap-2">
        {MILESTONES.map(({ label, months }, i) => (
          <div key={label} className="text-center">
            <div className="text-xs text-green-700 font-semibold">{fmt(values[i] ?? calcYield(investedAmount, apyPercent, months))}</div>
            <div className="text-xs text-gray-400 mt-0.5">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
