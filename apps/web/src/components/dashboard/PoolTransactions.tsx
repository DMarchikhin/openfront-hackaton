import { PoolAction } from '@/lib/api';

interface PoolTransactionsProps {
  actions: PoolAction[];
}

const ACTION_ICON: Record<string, string> = {
  supply: '↗',
  withdraw: '↙',
  rate_check: '◎',
  rebalance: '⇄',
};

const STATUS_CONFIG: Record<string, { badge: string; label: string }> = {
  executed: { badge: 'bg-green-100 text-green-700', label: 'Executed' },
  pending: { badge: 'bg-yellow-100 text-yellow-700', label: 'Pending' },
  skipped: { badge: 'bg-gray-100 text-gray-500', label: 'Skipped' },
  failed: { badge: 'bg-red-100 text-red-700', label: 'Failed' },
};

function formatTs(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function actionLabel(action: PoolAction) {
  if (action.actionType === 'rate_check') return 'Rate Check';
  if (action.actionType === 'rebalance') return 'Rebalance';
  const verb = action.actionType === 'supply' ? 'Supply' : 'Withdraw';
  const amt = action.amountUsd > 0 ? ` $${action.amountUsd.toFixed(2)} USDC` : '';
  return `${verb}${amt}`;
}

export function PoolTransactions({ actions }: PoolTransactionsProps) {
  if (actions.length === 0) {
    return (
      <p className="text-xs text-gray-400 text-center py-3">No transactions for this pool yet.</p>
    );
  }

  return (
    <div className="space-y-2.5 pt-1">
      {actions.map((action) => {
        const status = STATUS_CONFIG[action.status] ?? STATUS_CONFIG.pending;
        const icon = ACTION_ICON[action.actionType] ?? '·';

        return (
          <div key={action.id} className="flex gap-2.5">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-medium text-gray-800">{actionLabel(action)}</span>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${status.badge}`}>
                  {status.label}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2">{action.rationale}</p>
              <div className="flex items-center gap-3 mt-0.5 text-[10px] text-gray-400 flex-wrap">
                {action.expectedApyAfter != null && (
                  <span>{action.expectedApyAfter.toFixed(2)}% APY</span>
                )}
                {action.txHash && (
                  <span className="font-mono" title={action.txHash}>
                    tx: {action.txHash.slice(0, 8)}…
                  </span>
                )}
                <span className="ml-auto">{formatTs(action.executedAt)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
