import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

function textResult(data: unknown) {
  return { content: [{ type: 'text' as const, text: typeof data === 'string' ? data : JSON.stringify(data) }] };
}

export function createApiMcpServer(apiBaseUrl: string) {
  return createSdkMcpServer({
    name: 'api',
    version: '1.0.0',
    tools: [
      tool(
        'get_investment_actions',
        'Get the history of agent actions for the current investment (supply, withdraw, rebalance, rate_check). Returns status, rationale, amount, APY before/after, and tx hash for each action.',
        { investmentId: z.string().describe('The investment ID') },
        async ({ investmentId }) => {
          const res = await fetch(`${apiBaseUrl}/investments/${investmentId}/actions`, {
            signal: AbortSignal.timeout(10_000),
          });
          if (!res.ok) throw new Error(`API returned ${res.status}`);
          return textResult(await res.json());
        },
      ),
      tool(
        'get_portfolio',
        'Get the current portfolio state for a user: wallet USDC balance, invested balance in Aave, total value, earned yield, and per-pool breakdown with latest APY.',
        { userId: z.string().describe('The user ID') },
        async ({ userId }) => {
          const res = await fetch(`${apiBaseUrl}/investments/portfolio?userId=${userId}`, {
            signal: AbortSignal.timeout(10_000),
          });
          if (!res.ok) throw new Error(`API returned ${res.status}`);
          return textResult(await res.json());
        },
      ),
    ],
  });
}
