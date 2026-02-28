// Contract addresses by chain ID (same as agent-prompt.ts)
const CHAIN_CONTRACTS: Record<number, { aavePool: string; usdc: string; name: string }> = {
  8453: {
    name: 'Base Mainnet',
    aavePool: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  },
  84532: {
    name: 'Base Sepolia (Testnet)',
    aavePool: '0x07eA79F68B2B3df564D0A34F8e19D9B1e339814b',
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  },
};

export interface ChatContext {
  message: string;
  strategyName: string;
  strategyId: string;
  riskLevel: string;
  walletAddress: string;
  chainId: number;
  investmentId: string;
  userId: string;
}

// Read-only tools available for conversational queries (no transaction execution)
export const chatToolsAllowList = [
  'mcp__aave__aave_get_reserves',
  'mcp__aave__get_gas_price',
  'mcp__aave__get_balance',
  'mcp__openfort__openfort_get_balance',
  'mcp__api__get_investment_actions',
  'mcp__api__get_portfolio',
];

export function buildChatPrompt(context: ChatContext): string {
  const contracts = CHAIN_CONTRACTS[context.chainId] ?? CHAIN_CONTRACTS[8453];

  return `You are a friendly DeFi assistant for CondorFlow. The user is checking in on their investment.

## User Context
- Investment ID: ${context.investmentId}
- User ID: ${context.userId}
- Current Strategy: ${context.strategyName} (${context.riskLevel} risk)
- Wallet: ${context.walletAddress}
- Network: ${contracts.name} (Chain ID: ${context.chainId})
- Aave V3 Pool: ${contracts.aavePool}

## Your Role
Answer the user's question concisely (2-3 sentences max). Use the available tools to fetch live data when needed:
- \`aave_get_reserves\` — get current supply APY rates across pools
- \`get_gas_price\` — get current gas prices on the network
- \`get_balance\` / \`openfort_get_balance\` — check on-chain wallet balance
- \`get_investment_actions\` — get agent action history (supply/withdraw/rebalance) with rationale, status, amounts, APY before/after
- \`get_portfolio\` — get portfolio state: wallet balance, invested balance, earned yield, per-pool breakdown with latest APY

## Response Style
- Plain English, no DeFi jargon
- Be direct and specific (quote actual APY percentages, gas costs, balances)
- If you don't know something, say so briefly
- Do NOT execute any transactions — this is read-only mode

## Important
If the user asks to execute an action (e.g. "invest more", "withdraw"), politely explain they should use the main dashboard to start a new investment, as you can only answer questions here.

## User's Message
${context.message}`;
}
