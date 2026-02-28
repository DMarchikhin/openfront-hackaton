import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

/**
 * Calls the Aave MCP HTTP endpoint directly (bypasses SSE transport).
 * The aave-mcp SSE transport is non-standard; the POST /mcp endpoint works correctly.
 */
async function callAaveMcp(toolName: string, args: Record<string, unknown> = {}): Promise<string> {
  const aaveMcpBase = (process.env.AAVE_MCP_URL ?? 'http://localhost:8080/mcp/sse').replace('/mcp/sse', '/mcp');

  const response = await fetch(aaveMcpBase, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method: 'tools/call', params: { name: toolName, arguments: args } }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) throw new Error(`Aave MCP returned ${response.status}`);
  const result = (await response.json()) as { content?: Array<{ text?: string }>; error?: string };
  if (result.error) throw new Error(result.error);
  return result.content?.[0]?.text ?? JSON.stringify(result);
}

function textResult(data: unknown) {
  return { content: [{ type: 'text' as const, text: typeof data === 'string' ? data : JSON.stringify(data) }] };
}

export function createAaveMcpServer() {
  return createSdkMcpServer({
    name: 'aave',
    version: '1.0.0',
    tools: [
      tool(
        'aave_get_reserves',
        'Get current Aave V3 reserve data including supply APY for all supported tokens on Base network.',
        {},
        async () => {
          const result = await callAaveMcp('aave_get_reserves');
          return textResult(result);
        },
      ),

      tool(
        'get_gas_price',
        'Get current gas price on Base network in gwei and estimated USD cost per transaction.',
        {},
        async () => {
          const result = await callAaveMcp('get_gas_price');
          return textResult(result);
        },
      ),

      tool(
        'get_balance',
        'Get token balance for a wallet address on Base network.',
        {
          walletAddress: z.string().describe('The wallet address to check'),
          token: z.string().describe('Token symbol e.g. USDC, WETH, ETH'),
        },
        async (input) => {
          const result = await callAaveMcp('get_balance', { walletAddress: input.walletAddress, token: input.token });
          return textResult(result);
        },
      ),

      tool(
        'aave_stake',
        'Supply/stake tokens into Aave V3 on Base network to earn yield.',
        {
          asset: z.string().describe('Token to supply e.g. USDC'),
          amount: z.string().describe('Amount to supply as a string number'),
          walletAddress: z.string().describe('Wallet address supplying the tokens'),
        },
        async (input) => {
          const result = await callAaveMcp('aave_stake', {
            asset: input.asset,
            amount: input.amount,
            walletAddress: input.walletAddress,
          });
          return textResult(result);
        },
      ),

      tool(
        'aave_withdraw',
        'Withdraw tokens from Aave V3 on Base network.',
        {
          asset: z.string().describe('Token to withdraw e.g. USDC'),
          amount: z.string().describe('Amount to withdraw as a string number'),
          walletAddress: z.string().describe('Wallet address to withdraw to'),
        },
        async (input) => {
          const result = await callAaveMcp('aave_withdraw', {
            asset: input.asset,
            amount: input.amount,
            walletAddress: input.walletAddress,
          });
          return textResult(result);
        },
      ),
    ],
  });
}
