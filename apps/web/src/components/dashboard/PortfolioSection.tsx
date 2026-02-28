'use client';

import { useState } from 'react';
import { PoolPosition } from '@/lib/api';
import { PoolTransactions } from './PoolTransactions';

interface PortfolioSectionProps {
  pools: PoolPosition[];
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export function PortfolioSection({ pools }: PortfolioSectionProps) {
  const [expandedPool, setExpandedPool] = useState<string | null>(null);

  if (pools.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Your Pools
        </h3>
        <p className="text-sm text-gray-400 text-center py-4">No pool positions yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
        Your Pools
      </h3>
      <div className="space-y-3">
        {pools.map((position) => {
          const poolKey = `${position.pool.chain}|${position.pool.protocol}|${position.pool.asset}`;
          const isExpanded = expandedPool === poolKey;

          return (
            <div
              key={poolKey}
              className="border border-gray-100 rounded-lg overflow-hidden"
            >
              {/* Pool card header — clickable */}
              <button
                onClick={() => setExpandedPool(isExpanded ? null : poolKey)}
                className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {position.pool.asset} on {position.pool.protocol}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{position.pool.chain}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {position.latestApyPercent != null && (
                      <span className="text-[10px] font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        {position.latestApyPercent.toFixed(1)}% APY
                      </span>
                    )}
                    <span className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {position.allocationPercent}% alloc
                    </span>
                    <span className="text-gray-400 text-xs">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>

                {/* Metrics row */}
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="bg-gray-50 rounded-md p-2 text-center">
                    <p className="text-[10px] text-gray-400">Balance</p>
                    <p className="text-sm font-bold text-gray-800 mt-0.5">
                      {fmt(position.onChainBalanceUsd)}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-md p-2 text-center">
                    <p className="text-[10px] text-gray-400">Supplied</p>
                    <p className="text-sm font-bold text-gray-800 mt-0.5">
                      {fmt(position.totalSuppliedUsd)}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-md p-2 text-center">
                    <p className="text-[10px] text-gray-400">Earned</p>
                    <p className={`text-sm font-bold mt-0.5 ${position.earnedYieldUsd > 0 ? 'text-green-600' : 'text-gray-800'}`}>
                      {fmt(position.earnedYieldUsd)}
                    </p>
                  </div>
                </div>
              </button>

              {/* Expandable transaction history */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-4 pb-4 pt-3 bg-gray-50">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    Transaction history
                  </p>
                  <PoolTransactions actions={position.actions} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
