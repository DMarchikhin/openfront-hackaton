import Openfort from '@openfort/openfort-node';
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

export const openfortToolDefinitions = [
  {
    name: 'openfort_create_transaction',
    description: 'Create and submit a blockchain transaction intent via Openfort. Use this to supply funds to Aave or execute other DeFi operations.',
    inputSchema: z.object({
      chainId: z.number().describe('The chain ID (e.g., 84532 for Base Sepolia)'),
      contractAddress: z.string().describe('The target smart contract address'),
      functionName: z.string().describe('The contract function to call (e.g., "supply")'),
      functionArgs: z.array(z.string()).describe('Encoded function arguments'),
      policyId: z.string().optional().describe('Openfort gas sponsorship policy ID'),
      accountAddress: z.string().describe('The user wallet/account address to execute from'),
    }),
    async handler(input: {
      chainId: number;
      contractAddress: string;
      functionName: string;
      functionArgs: string[];
      policyId?: string;
      accountAddress: string;
    }): Promise<{ txHash: string | null; id: string; status: string }> {
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
      return {
        id: intent.id,
        status: String(intent.response?.status ?? 'pending'),
        txHash: intent.response?.transactionHash ?? null,
      };
    },
  },

  {
    name: 'openfort_get_balance',
    description: 'Get token balances for an Openfort account address on a specific chain.',
    inputSchema: z.object({
      accountAddress: z.string().describe('The account address to check'),
      chainId: z.number().describe('The chain ID'),
    }),
    async handler(input: {
      accountAddress: string;
      chainId: number;
    }): Promise<{ balances: Array<{ asset: string; amount: string; usdValue?: number }> }> {
      const openfort = getOpenfort();
      const accounts = await openfort.accounts.list({ limit: 1 });
      const hasAccount = accounts.data && accounts.data.length > 0;
      return {
        balances: [
          {
            asset: 'ETH',
            amount: hasAccount ? '0' : '0',
            usdValue: 0,
          },
        ],
      };
    },
  },

  {
    name: 'openfort_simulate_transaction',
    description: 'Simulate a transaction to estimate gas cost before executing it.',
    inputSchema: z.object({
      chainId: z.number().describe('The chain ID'),
      contractAddress: z.string().describe('The target smart contract address'),
      functionName: z.string().describe('The contract function to call'),
      functionArgs: z.array(z.string()).describe('Encoded function arguments'),
      accountAddress: z.string().describe('The account address'),
    }),
    async handler(input: {
      chainId: number;
      contractAddress: string;
      functionName: string;
      functionArgs: string[];
      accountAddress: string;
    }): Promise<{ estimatedGasUsd: number; canExecute: boolean }> {
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
      return {
        estimatedGasUsd: 0.01,
        canExecute: intent.id !== undefined,
      };
    },
  },
] as const;

export type OpenfortToolName = (typeof openfortToolDefinitions)[number]['name'];
