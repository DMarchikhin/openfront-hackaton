'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  fetchActiveInvestment,
  fetchAgentActions,
  fetchPortfolio,
  ActiveInvestment,
  AgentAction,
  PortfolioResponse,
} from '@/lib/api';
import { InvestmentSummary } from '@/components/dashboard/InvestmentSummary';
import { AgentActions } from '@/components/dashboard/AgentActions';
import { WalletSummary } from '@/components/dashboard/WalletSummary';
import { PortfolioSection } from '@/components/dashboard/PortfolioSection';

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
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
  const [portfolioError, setPortfolioError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = getUserId();

    const portfolioPromise = fetchPortfolio(userId)
      .then(setPortfolio)
      .catch(() => setPortfolioError(true));

    const investmentPromise = fetchActiveInvestment(userId)
      .then((inv) => {
        setInvestment(inv);
        return fetchAgentActions(inv.investmentId).catch(() => ({
          investmentId: inv.investmentId,
          actions: [],
        }));
      })
      .then((res) => setActions(res.actions))
      .catch(() => setInvestment(null));

    Promise.all([portfolioPromise, investmentPromise]).finally(() => setLoading(false));
  }, []);

  const smartAccountAddress =
    portfolio?.smartAccountAddress ??
    process.env.NEXT_PUBLIC_SMART_ACCOUNT_ADDRESS ??
    '';

  const walletSummaryProps = {
    walletBalanceUsd: portfolio?.walletBalanceUsd ?? 0,
    investedBalanceUsd: portfolio?.investedBalanceUsd ?? 0,
    totalValueUsd: portfolio?.totalValueUsd ?? 0,
    smartAccountAddress,
    error: portfolioError,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-gray-400">Loading your dashboard…</p>
      </div>
    );
  }

  if (!investment) {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <WalletSummary {...walletSummaryProps} />
        <div className="flex flex-col items-center gap-4 text-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">No active investment yet</h1>
            <p className="mt-1 text-gray-500">Take the quiz to find your strategy, then start investing.</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/quiz"
              className="px-5 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors text-sm"
            >
              Take the quiz →
            </Link>
            <Link
              href="/strategies"
              className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm"
            >
              Browse strategies
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Your dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Your savings are working automatically.</p>
      </div>
      <WalletSummary {...walletSummaryProps} />
      <InvestmentSummary investment={investment} />
      {portfolio && <PortfolioSection pools={portfolio.pools} />}
      <AgentActions actions={actions} />
    </div>
  );
}
