'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchActiveInvestment, fetchAgentActions, ActiveInvestment, AgentAction } from '@/lib/api';
import { InvestmentSummary } from '@/components/dashboard/InvestmentSummary';
import { AgentActions } from '@/components/dashboard/AgentActions';

function getUserId(): string {
  if (typeof window === 'undefined') return 'user-ssr';
  let id = localStorage.getItem('userId');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('userId', id);
  }
  return id;
}

export default function DashboardPage() {
  const [investment, setInvestment] = useState<ActiveInvestment | null>(null);
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveInvestment(getUserId())
      .then((inv) => {
        setInvestment(inv);
        return fetchAgentActions(inv.investmentId).catch(() => ({ investmentId: inv.investmentId, actions: [] }));
      })
      .then((res) => setActions(res.actions))
      .catch(() => setInvestment(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-gray-400">Loading your dashboard…</p>
      </div>
    );
  }

  if (!investment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-6 text-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">No active investment yet</h1>
          <p className="mt-2 text-gray-500">Take the quiz to find your strategy, then start investing.</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/quiz"
            className="px-6 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
          >
            Take the quiz →
          </Link>
          <Link
            href="/strategies"
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Browse strategies
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Your dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Your savings are working automatically.</p>
      </div>
      <InvestmentSummary investment={investment} />
      <div className="mt-4">
        <AgentActions actions={actions} />
      </div>
    </div>
  );
}
