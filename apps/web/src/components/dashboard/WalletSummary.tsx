'use client';

import { useState } from 'react';

interface WalletSummaryProps {
  walletBalanceUsd: number;
  investedBalanceUsd: number;
  totalValueUsd: number;
  smartAccountAddress: string;
  error?: boolean;
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function truncateAddress(addr: string) {
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

export function WalletSummary({
  walletBalanceUsd,
  investedBalanceUsd,
  totalValueUsd,
  smartAccountAddress,
  error,
}: WalletSummaryProps) {
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    if (!smartAccountAddress) return;
    await navigator.clipboard.writeText(smartAccountAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (error) {
    return (
      <div className="border border-dashed border-gray-300 rounded-xl p-5 text-center">
        <p className="text-sm text-gray-500">Unable to load balance. Please try again.</p>
      </div>
    );
  }

  // Zero-balance funding prompt (T080)
  if (totalValueUsd === 0) {
    return (
      <div className="border border-dashed border-amber-200 bg-amber-50 rounded-xl p-6">
        <div className="text-center mb-4">
          <p className="text-3xl font-bold text-gray-800">$0.00</p>
          <p className="text-sm text-gray-500 mt-1">Total Value</p>
          <p className="text-sm text-amber-700 mt-2 font-medium">Fund your wallet to start investing</p>
        </div>
        {smartAccountAddress && (
          <div className="mt-4 bg-white border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-1">Your wallet address</p>
            <div className="flex items-start justify-between gap-2">
              <code className="text-xs text-gray-700 break-all leading-relaxed">{smartAccountAddress}</code>
              <button
                onClick={copyAddress}
                className="shrink-0 text-xs font-medium text-amber-700 hover:text-amber-900 transition-colors"
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Funded state: 3 metric tiles + truncated address copy (T079)
  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-700 rounded-xl p-6 text-white shadow-lg">
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white/10 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-300">Available</p>
          <p className="text-lg font-bold mt-0.5">{fmt(walletBalanceUsd)}</p>
        </div>
        <div className="bg-white/10 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-300">Invested</p>
          <p className="text-lg font-bold mt-0.5">{fmt(investedBalanceUsd)}</p>
        </div>
        <div className="bg-white/20 rounded-lg p-3 text-center border border-white/20">
          <p className="text-xs text-gray-200">Total Value</p>
          <p className="text-xl font-extrabold mt-0.5">{fmt(totalValueUsd)}</p>
        </div>
      </div>

      {smartAccountAddress && (
        <div className="flex items-center justify-between bg-white/10 rounded-lg px-3 py-2">
          <span className="text-xs text-gray-300 font-mono">{truncateAddress(smartAccountAddress)}</span>
          <button
            onClick={copyAddress}
            className="text-xs font-medium text-white/70 hover:text-white transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy address'}
          </button>
        </div>
      )}
    </div>
  );
}
