import 'dotenv/config';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { buildAgentPrompt, InvestmentContext } from './agent-prompt.js';
import { createOpenfortMcpServer } from './mcp/openfort-tools.js';

export interface StrategyParam {
  id: string;
  name: string;
  riskLevel: string;
  poolAllocations: Array<{
    chain: string;
    protocol: string;
    asset: string;
    allocationPercentage: number;
  }>;
  rebalanceThreshold: number;
  allowedChains: string[];
}

export interface ExecuteInvestmentParams {
  investmentId: string;
  userId: string;
  strategy: StrategyParam;
  userAmount: number;
  walletAddress: string;
}

export interface AgentActionResult {
  pool?: { chain: string; protocol: string; asset: string };
  actionType: string;
  amountUsd?: number;
  expectedApy?: number;
  gasCostUsd?: number;
  status: 'executed' | 'skipped' | 'failed';
  txHash?: string | null;
  rationale: string;
}

export interface AgentResult {
  investmentId: string;
  actions: AgentActionResult[];
  totalAllocated: number;
  averageApy: number;
  summary: string;
  rawResult?: string;
}

export async function executeInvestment(params: ExecuteInvestmentParams): Promise<AgentResult> {
  const chainId = parseInt(process.env.CHAIN_ID ?? '84532', 10);

  const context: InvestmentContext = {
    investmentId: params.investmentId,
    userId: params.userId,
    strategyName: params.strategy.name,
    riskLevel: params.strategy.riskLevel,
    totalAmountUsd: params.userAmount,
    walletAddress: params.walletAddress,
    chainId,
    poolAllocations: params.strategy.poolAllocations,
    rebalanceThreshold: params.strategy.rebalanceThreshold,
  };

  const prompt = buildAgentPrompt(context);
  const aaveMcpUrl = process.env.AAVE_MCP_URL ?? 'http://localhost:8080/mcp/sse';
  const openfortServer = createOpenfortMcpServer();

  let resultText = '';

  try {
    const agentQuery = query({
      prompt,
      options: {
        mcpServers: {
          aave: { type: 'sse', url: aaveMcpUrl },
          openfort: openfortServer,
        },
        allowedTools: [
          'mcp__aave__aave_get_reserves',
          'mcp__aave__get_gas_price',
          'mcp__aave__aave_stake',
          'mcp__aave__get_balance',
          'mcp__openfort__openfort_create_transaction',
          'mcp__openfort__openfort_simulate_transaction',
          'mcp__openfort__openfort_get_balance',
        ],
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
        maxTurns: 10,
        model: 'claude-sonnet-4-6',
      },
    });

    for await (const message of agentQuery) {
      if (message.type === 'result' && message.subtype === 'success') {
        resultText = message.result;
      }
    }
  } catch (err) {
    const errorMessage = (err as Error).message;
    return {
      investmentId: params.investmentId,
      actions: [
        {
          actionType: 'rate_check',
          status: 'failed',
          rationale: `Agent execution failed: ${errorMessage}`,
        },
      ],
      totalAllocated: 0,
      averageApy: 0,
      summary: `Agent failed: ${errorMessage}`,
      rawResult: errorMessage,
    };
  }

  return parseAgentResult(params.investmentId, resultText);
}

function parseAgentResult(investmentId: string, resultText: string): AgentResult {
  try {
    const jsonMatch = resultText.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : resultText.trim();
    const parsed = JSON.parse(jsonStr) as {
      actions?: AgentActionResult[];
      totalAllocated?: number;
      averageApy?: number;
      summary?: string;
    };
    return {
      investmentId,
      actions: parsed.actions ?? [],
      totalAllocated: parsed.totalAllocated ?? 0,
      averageApy: parsed.averageApy ?? 0,
      summary: parsed.summary ?? 'Agent completed execution.',
      rawResult: resultText,
    };
  } catch {
    return {
      investmentId,
      actions: [],
      totalAllocated: 0,
      averageApy: 0,
      summary: 'Agent completed. Could not parse structured result.',
      rawResult: resultText,
    };
  }
}

async function main() {
  console.log('Investment agent ready.');
}

main().catch(console.error);
