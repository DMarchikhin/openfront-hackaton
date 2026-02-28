'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchStrategies, Strategy } from '@/lib/api';
import { StrategyCard } from '@/components/strategy/StrategyCard';
import { StrategyDetail } from '@/components/strategy/StrategyDetail';

export default function StrategiesPage() {
  const searchParams = useSearchParams();
  const riskLevel = searchParams.get('riskLevel') ?? undefined;

  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    fetchStrategies()
      .then((data) => {
        setStrategies(data.strategies);
        // Auto-select the recommended one if riskLevel is in URL
        if (riskLevel) {
          const match = data.strategies.find((s) => s.riskLevel === riskLevel);
          if (match) setSelectedId(match.id);
        }
      })
      .catch(() => setError('Could not load strategies. Please try again.'))
      .finally(() => setLoading(false));
  }, [riskLevel]);

  const selected = strategies.find((s) => s.id === selectedId) ?? null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-gray-400">Loading strategies…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Investment strategies</h1>
        {riskLevel && (
          <p className="mt-1 text-gray-500 text-sm">
            Showing all strategies · your profile is{' '}
            <span className="font-medium capitalize text-gray-700">{riskLevel}</span>
          </p>
        )}
      </div>

      <div className="space-y-3">
        {strategies.map((strategy) => (
          <div key={strategy.id}>
            <StrategyCard
              strategy={strategy}
              isRecommended={strategy.riskLevel === riskLevel}
              onClick={() => setSelectedId(selectedId === strategy.id ? null : strategy.id)}
            />
            {selectedId === strategy.id && selected && (
              <div className="mt-2">
                <StrategyDetail strategy={selected} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
