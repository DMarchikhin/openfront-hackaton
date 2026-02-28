import { AgentAction } from '@/lib/api';

interface AgentActionsProps {
  actions: AgentAction[];
}

const ACTION_ICON: Record<string, string> = {
  supply: '↗',
  withdraw: '↙',
  rebalance: '⇄',
  rate_check: '◎',
};

const STATUS_CONFIG: Record<string, { badge: string; label: string }> = {
  executed: { badge: 'bg-green-100 text-green-700', label: 'Executed' },
  pending: { badge: 'bg-yellow-100 text-yellow-700', label: 'Pending' },
  skipped: { badge: 'bg-gray-100 text-gray-500', label: 'Skipped' },
  failed: { badge: 'bg-red-100 text-red-700', label: 'Failed' },
};

export function AgentActions({ actions }: AgentActionsProps) {
  if (actions.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Agent activity
        </h3>
        <p className="text-sm text-gray-400 text-center py-4">No agent actions yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
        Agent activity
      </h3>
      <div className="space-y-3">
        {actions.map((action) => {
          const status = STATUS_CONFIG[action.status] ?? STATUS_CONFIG.pending;
          const icon = ACTION_ICON[action.actionType] ?? '·';
          const ts = new Date(action.executedAt).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <div key={action.id} className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-base font-bold text-gray-600">
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-800 capitalize">
                    {action.actionType.replace('_', ' ')} · {action.protocol} on {action.chain}
                  </span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${status.badge}`}>
                    {status.label}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{action.rationale}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                  {action.amount !== '0' && (
                    <span>${parseFloat(action.amount).toLocaleString()} {action.asset}</span>
                  )}
                  {action.expectedApyAfter != null && (
                    <span>{action.expectedApyAfter.toFixed(2)}% APY</span>
                  )}
                  {action.txHash && (
                    <span className="font-mono truncate max-w-[120px]" title={action.txHash}>
                      tx: {action.txHash.slice(0, 8)}…
                    </span>
                  )}
                  <span className="ml-auto">{ts}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
