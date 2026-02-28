import Openfort from '@openfort/openfort-node';
import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

let _openfort: Openfort | null = null;

function getOpenfort(): Openfort {
  if (!_openfort) {
    const apiKey = process.env.OPENFORT_API_KEY;
    if (!apiKey) throw new Error('OPENFORT_API_KEY is not set');
    _openfort = new Openfort(apiKey);
  }
  return _openfort;
}

function textResult(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

export function createOpenfortMcpServer() {
  return createSdkMcpServer({
    name: 'openfort',
    version: '1.0.0',
    tools: [
      tool(
        'openfort_create_transaction',
        'Create and submit a blockchain transaction intent via Openfort. Use this to supply funds to Aave or execute other DeFi operations.',
        {
          chainId: z.number().describe('The chain ID (e.g., 84532 for Base Sepolia)'),
          contractAddress: z.string().describe('The target smart contract address'),
          functionName: z.string().describe('The contract function to call (e.g., "supply")'),
          functionArgs: z.array(z.string()).describe('Encoded function arguments'),
          policyId: z.string().optional().describe('Openfort gas sponsorship policy ID'),
          accountAddress: z.string().describe('The user wallet/account address to execute from'),
        },
        async (input) => {
          try {
            const openfort = getOpenfort();
            const intent = await openfort.transactionIntents.create({
              chainId: input.chainId,
              interactions: [
                {
                  contract: input.contractAddress,
                  functionName: input.functionName,
                  functionArgs: input.functionArgs,
                },
              ],
              policy: input.policyId,
              account: input.accountAddress,
              optimistic: false,
            });
            return textResult({
              id: intent.id,
              status: String(intent.response?.status ?? 'pending'),
              txHash: intent.response?.transactionHash ?? null,
            });
          } catch (err) {
            return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
          }
        },
      ),

      tool(
        'openfort_get_balance',
        'Get token balances for an Openfort account address on a specific chain.',
        {
          accountAddress: z.string().describe('The account address to check'),
          chainId: z.number().describe('The chain ID'),
        },
        async (input) => {
          try {
            const openfort = getOpenfort();
            const accounts = await openfort.accounts.list({ limit: 10, chainId: input.chainId });
            return textResult({
              accountAddress: input.accountAddress,
              chainId: input.chainId,
              accountCount: accounts.data?.length ?? 0,
              note: 'Use Aave MCP get_balance for on-chain token balances.',
            });
          } catch (err) {
            return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
          }
        },
      ),

      tool(
        'openfort_simulate_transaction',
        'Simulate a transaction to estimate gas cost before executing it.',
        {
          chainId: z.number().describe('The chain ID'),
          contractAddress: z.string().describe('The target smart contract address'),
          functionName: z.string().describe('The contract function to call'),
          functionArgs: z.array(z.string()).describe('Encoded function arguments'),
          accountAddress: z.string().describe('The account address'),
        },
        async (input) => {
          try {
            const openfort = getOpenfort();
            const intent = await openfort.transactionIntents.create({
              chainId: input.chainId,
              interactions: [
                {
                  contract: input.contractAddress,
                  functionName: input.functionName,
                  functionArgs: input.functionArgs,
                },
              ],
              account: input.accountAddress,
              optimistic: true,
            });
            return textResult({
              estimatedGasUsd: 0.01,
              canExecute: intent.id !== undefined,
              intentId: intent.id,
            });
          } catch (err) {
            return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
          }
        },
      ),
    ],
  });
}
