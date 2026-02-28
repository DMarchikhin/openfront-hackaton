'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface WalletSummaryProps {
  walletBalanceUsd: number;
  investedBalanceUsd: number;
  totalValueUsd: number;
  smartAccountAddress: string;
  error?: boolean;
  onRetry?: () => void;
  investmentId?: string | null;
  onInvestMore?: (amount: number) => Promise<void>;
  isAgentRunning?: boolean;
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
  onRetry,
  investmentId,
  onInvestMore,
  isAgentRunning,
}: WalletSummaryProps) {
  const [copied, setCopied] = useState(false);
  const [showInvestForm, setShowInvestForm] = useState(false);
  const [investAmount, setInvestAmount] = useState('');
  const [investLoading, setInvestLoading] = useState(false);
  const [investError, setInvestError] = useState<string | null>(null);

  const copyAddress = async () => {
    if (!smartAccountAddress) return;
    await navigator.clipboard.writeText(smartAccountAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (error) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-5 text-center space-y-2">
          <p className="text-sm text-muted-foreground">Unable to load balance. Please try again.</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-xs font-medium underline underline-offset-2 transition-colors hover:text-foreground"
            >
              Try again
            </button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Zero-balance funding prompt
  if (totalValueUsd === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6">
          <div className="text-center mb-4">
            <p className="text-3xl font-bold">$0.00</p>
            <p className="text-sm text-muted-foreground mt-1">Total Value</p>
            <p className="text-sm text-muted-foreground mt-2 font-medium">Fund your wallet to start investing</p>
          </div>
          {smartAccountAddress && (
            <div className="bg-muted/40 border rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Your wallet address</p>
              <div className="flex items-start justify-between gap-2">
                <code className="text-xs break-all leading-relaxed">{smartAccountAddress}</code>
                <button
                  onClick={copyAddress}
                  className="shrink-0 text-xs font-medium hover:text-foreground transition-colors"
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Funded state
  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        {/* 3 metric tiles */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Available</p>
            <p className="text-base font-bold mt-0.5">{fmt(walletBalanceUsd)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Invested</p>
            <p className="text-base font-bold mt-0.5">{fmt(investedBalanceUsd)}</p>
          </div>
          <div className="bg-primary text-primary-foreground rounded-lg p-3 text-center">
            <p className="text-xs opacity-80">Total Value</p>
            <p className="text-lg font-extrabold mt-0.5">{fmt(totalValueUsd)}</p>
          </div>
        </div>

        {/* Address bar */}
        {smartAccountAddress && (
          <div className="flex items-center justify-between bg-muted/40 border rounded-lg px-3 py-2">
            <span className="text-xs text-muted-foreground font-mono">{truncateAddress(smartAccountAddress)}</span>
            <button
              onClick={copyAddress}
              className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {copied ? '✓ Copied!' : 'Copy address'}
            </button>
          </div>
        )}

        {/* Invest More */}
        {investmentId && onInvestMore && (
          <div>
            {!showInvestForm ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => { setShowInvestForm(true); setInvestError(null); }}
                disabled={isAgentRunning}
              >
                {isAgentRunning ? 'Agent running…' : '+ Invest More'}
              </Button>
            ) : (
              <div className="border rounded-lg p-3 space-y-3 bg-muted/20">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={investAmount}
                      onChange={(e) => { setInvestAmount(e.target.value); setInvestError(null); }}
                      placeholder="0.00"
                      disabled={investLoading}
                      className="pl-7"
                    />
                  </div>
                  <button
                    onClick={() => setInvestAmount(String(walletBalanceUsd))}
                    disabled={investLoading}
                    className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-2 disabled:opacity-50"
                  >
                    Max
                  </button>
                </div>
                {investError && (
                  <p className="text-xs text-destructive">{investError}</p>
                )}
                {Number(investAmount) > walletBalanceUsd && Number(investAmount) > 0 && !investError && (
                  <p className="text-xs text-muted-foreground">Amount exceeds available balance</p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    onClick={() => { setShowInvestForm(false); setInvestAmount(''); setInvestError(null); }}
                    disabled={investLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={investLoading || !investAmount || Number(investAmount) <= 0}
                    onClick={async () => {
                      const amt = Number(investAmount);
                      if (!amt || amt <= 0) return;
                      setInvestLoading(true);
                      setInvestError(null);
                      try {
                        await onInvestMore(amt);
                        setShowInvestForm(false);
                        setInvestAmount('');
                      } catch {
                        setInvestError('Failed to start investment. Please try again.');
                      } finally {
                        setInvestLoading(false);
                      }
                    }}
                  >
                    {investLoading ? 'Investing…' : 'Confirm'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
