'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  fetchActiveInvestment,
  fetchAgentActions,
  fetchPortfolio,
  sendAgentMessage,
  ActiveInvestment,
  AgentAction,
  PortfolioResponse,
} from '@/lib/api';
import { InvestmentSummary } from '@/components/dashboard/InvestmentSummary';
import { AgentChat } from '@/components/dashboard/AgentChat';
import { WalletSummary } from '@/components/dashboard/WalletSummary';
import { PortfolioSection } from '@/components/dashboard/PortfolioSection';
import { YieldProjection } from '@/components/dashboard/YieldProjection';

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
  const [userId] = useState(() => getUserId());

  const loadPortfolio = useCallback((userId: string) => {
    setPortfolioError(false);
    return fetchPortfolio(userId)
      .then(setPortfolio)
      .catch(() => setPortfolioError(true));
  }, []);

  useEffect(() => {
    const portfolioPromise = loadPortfolio(userId);

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
  }, [loadPortfolio, userId]);

  // Poll agent actions every 3s while agent is processing
  useEffect(() => {
    if (!investment) return;
    const isStillProcessing = actions.length === 0 ||
      actions.every((a) => a.status === 'pending');
    if (!isStillProcessing) return;

    const startTime = Date.now();
    const MAX_POLL_MS = 10 * 60 * 1000; // 10 minutes

    const poll = setInterval(() => {
      if (Date.now() - startTime > MAX_POLL_MS) {
        clearInterval(poll);
        return;
      }
      fetchAgentActions(investment.investmentId)
        .then((res) => {
          setActions(res.actions);
          const done = res.actions.some((a) => a.status === 'executed' || a.status === 'failed');
          if (done) clearInterval(poll);
        })
        .catch(() => {});
    }, 3_000);

    return () => clearInterval(poll);
  }, [investment, actions]);

  const handleRetryPortfolio = useCallback(() => {
    loadPortfolio(userId);
  }, [loadPortfolio, userId]);

  const smartAccountAddress =
    portfolio?.smartAccountAddress ??
    process.env.NEXT_PUBLIC_SMART_ACCOUNT_ADDRESS ??
    '';

  const handleSendMessage = useCallback((message: string) => {
    if (!investment) return;
    sendAgentMessage(investment.investmentId, userId, message, {
      strategyName: investment.strategy.name,
      strategyId: investment.strategy.id,
      riskLevel: investment.strategy.riskLevel,
      walletAddress: smartAccountAddress,
    }).catch(() => {});
  }, [investment, userId, smartAccountAddress]);

  // T086: no-wallet-setup — address is unknown and portfolio errored (or never loaded)
  const walletNotConfigured = !smartAccountAddress && (portfolioError || (!loading && portfolio === null));

  const walletSummaryProps = {
    walletBalanceUsd: portfolio?.walletBalanceUsd ?? 0,
    investedBalanceUsd: portfolio?.investedBalanceUsd ?? 0,
    totalValueUsd: portfolio?.totalValueUsd ?? 0,
    smartAccountAddress,
    error: portfolioError,
    onRetry: handleRetryPortfolio,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-gray-400">Loading your dashboard…</p>
      </div>
    );
  }

  // T086: wallet not set up — show setup prompt instead of balance/portfolio cards
  if (walletNotConfigured) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="border border-dashed border-blue-200 bg-blue-50 rounded-xl p-8 text-center">
          <p className="text-2xl mb-2">⚙️</p>
          <h2 className="text-base font-semibold text-gray-800">Wallet not set up</h2>
          <p className="text-sm text-gray-500 mt-1">
            Your smart account hasn't been configured yet. Run the setup script to get started.
          </p>
          <code className="block mt-3 text-xs bg-white border border-blue-200 rounded px-3 py-2 text-gray-600">
            pnpm run setup:account
          </code>
        </div>
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
    <div className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        <div className="lg:col-span-3 space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Your dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">Your savings are working automatically.</p>
          </div>
          <WalletSummary {...walletSummaryProps} />
          <InvestmentSummary investment={investment} />
          {portfolio && <PortfolioSection pools={portfolio.pools} />}
          {portfolio && portfolio.investedBalanceUsd > 0 && (() => {
            // Weighted-average APY from pool positions, fallback to strategy expectedApyMin
            const pools = portfolio.pools.filter((p) => p.latestApyPercent != null);
            const weightedApy = pools.length > 0
              ? pools.reduce((sum, p) => sum + (p.latestApyPercent ?? 0) * (p.allocationPercent / 100), 0)
              : investment.strategy.expectedApyMin;
            return <YieldProjection investedAmount={portfolio.investedBalanceUsd} apyPercent={weightedApy} />;
          })()}
        </div>
        <div className="lg:col-span-2 sticky top-6">
          <AgentChat
            investmentId={investment.investmentId}
            actions={actions}
            isProcessing={actions.length === 0 || actions.every((a) => a.status === 'pending')}
            onSendMessage={handleSendMessage}
            investment={investment}
          />
        </div>
      </div>
    </div>
  );
}
