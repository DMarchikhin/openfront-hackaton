import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-8">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">
          Your money works while you sleep
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl">
          Take a 60-second quiz to discover your investment personality.
          We&apos;ll match you with the right strategy and let an AI agent
          handle the rest — automatically earning you the best yield on your USDC.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/quiz"
          className="px-8 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
        >
          Take the Quiz →
        </Link>
        <Link
          href="/strategies"
          className="px-8 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          Browse Strategies
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-6 mt-8 w-full max-w-2xl">
        {[
          { label: 'Conservative', apy: '3–5% APY', color: 'bg-sky-50 border-sky-200', badge: 'bg-sky-100 text-sky-700' },
          { label: 'Balanced', apy: '5–8% APY', color: 'bg-green-50 border-green-200', badge: 'bg-green-100 text-green-700' },
          { label: 'Growth', apy: '7–12% APY', color: 'bg-purple-50 border-purple-200', badge: 'bg-purple-100 text-purple-700' },
        ].map((s) => (
          <div key={s.label} className={`${s.color} border rounded-xl p-4 text-center`}>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${s.badge}`}>
              {s.label}
            </span>
            <p className="mt-2 text-lg font-bold text-gray-900">{s.apy}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
