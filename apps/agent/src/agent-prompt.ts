export interface PoolAllocationContext {
  chain: string;
  protocol: string;
  asset: string;
  allocationPercentage: number;
}

export interface RebalanceContext {
  investmentId: string;
  userId: string;
  walletAddress: string;
  chainId: number;
  totalAmountUsd: number;
  previousStrategy: {
    id: string;
    name: string;
    poolAllocations: PoolAllocationContext[];
  };
  newStrategy: {
    id: string;
    name: string;
    riskLevel: string;
    poolAllocations: PoolAllocationContext[];
    rebalanceThreshold: number;
  };
}

export function buildRebalancePrompt(context: RebalanceContext): string {
  const chainName = context.chainId === 84532 ? 'Base Sepolia' : 'the target chain';

  const oldPools = context.previousStrategy.poolAllocations
    .map((p) => `  - ${p.allocationPercentage}% in ${p.protocol} on ${p.chain} (${p.asset})`)
    .join('\n');

  const newPools = context.newStrategy.poolAllocations
    .map(
      (p) =>
        `  - ${p.allocationPercentage}% → ${p.protocol} on ${p.chain} (asset: ${p.asset}, amount: $${(context.totalAmountUsd * p.allocationPercentage / 100).toFixed(2)})`,
    )
    .join('\n');

  return `You are an autonomous DeFi rebalancing agent. The user has switched investment strategies and you must safely reallocate their funds.

## Rebalance Context
- Investment ID: ${context.investmentId}
- Wallet Address: ${context.walletAddress}
- Chain ID: ${context.chainId}
- Total Amount: ~$${context.totalAmountUsd.toFixed(2)} USD
- Rebalance Threshold: ${context.newStrategy.rebalanceThreshold}% APY difference minimum

## Previous Strategy: ${context.previousStrategy.name}
Current positions to withdraw from:
${oldPools}

## New Strategy: ${context.newStrategy.name} (${context.newStrategy.riskLevel} risk)
Target allocations to supply into:
${newPools}

## Your Task

Execute the following steps **in order**:

1. **Check gas prices**: Call \`get_gas_price\` on ${chainName} before doing anything.

2. **Check current Aave rates**: For each pool in the NEW strategy, call \`aave_get_reserves\` to get current supply APY.

3. **For each PREVIOUS pool**:
   - Check if this pool exists in the new strategy at the same or higher allocation
   - If NOT in new strategy (or at lower allocation): withdraw the difference via \`openfort_create_transaction\` with \`functionName: "withdraw"\`
   - Skip the withdrawal if gas cost exceeds projected benefit

4. **For each NEW pool**:
   - Supply the target allocation amount via \`openfort_create_transaction\` with \`functionName: "supply"\`
   - Skip if gas cost exceeds projected annual yield improvement

5. **Return structured result** as JSON:
\`\`\`json
{
  "investmentId": "${context.investmentId}",
  "actions": [
    {
      "actionType": "withdraw|supply|rebalance",
      "pool": { "chain": "...", "protocol": "...", "asset": "..." },
      "amountUsd": 0,
      "expectedApy": 0,
      "gasCostUsd": 0,
      "status": "executed|skipped|failed",
      "txHash": "0x...",
      "rationale": "..."
    }
  ],
  "totalAllocated": 0,
  "averageApy": 0,
  "summary": "Rebalanced from ${context.previousStrategy.name} to ${context.newStrategy.name}."
}
\`\`\`

## Safety Rules (NON-NEGOTIABLE)

- **Only** interact with the pools listed above — no other contracts
- **Never** withdraw more than the user's position balance
- **Always** log a rationale for every action (executed, skipped, or failed)
- **Prioritize capital preservation**: withdraw before supplying to avoid overexposure
- **Never** retry a failed transaction more than once
- If any critical error occurs, stop and report in the result JSON
`;
}

export interface InvestmentContext {
  investmentId: string;
  userId: string;
  strategyName: string;
  riskLevel: string;
  totalAmountUsd: number;
  walletAddress: string;
  chainId: number;
  poolAllocations: PoolAllocationContext[];
  rebalanceThreshold: number;
  currentApy?: number;
}

export function buildAgentPrompt(context: InvestmentContext): string {
  const allocationList = context.poolAllocations
    .map(
      (p) =>
        `  - ${p.allocationPercentage}% → ${p.protocol} on ${p.chain} (asset: ${p.asset}, amount: $${(context.totalAmountUsd * p.allocationPercentage / 100).toFixed(2)})`,
    )
    .join('\n');

  return `You are an autonomous DeFi investment agent managing savings for a user. Your role is to allocate funds into yield-generating pools based on pre-approved strategy parameters.

## Investment Context
- Investment ID: ${context.investmentId}
- Strategy: ${context.strategyName} (${context.riskLevel} risk)
- Total Amount: $${context.totalAmountUsd.toFixed(2)} USD
- Wallet Address: ${context.walletAddress}
- Chain ID: ${context.chainId}
- Rebalance Threshold: ${context.rebalanceThreshold}% APY difference minimum

## Approved Pool Allocations
${allocationList}
${context.currentApy !== undefined ? `\n## Current APY\nUser is currently earning ${context.currentApy}% APY. Only rebalance if improvement exceeds ${context.rebalanceThreshold}%.` : ''}

## Your Task

Execute the following steps **in order**:

1. **Check current Aave rates**: For each pool in the approved allocations, call \`aave_get_reserves\` to get the current supply APY.

2. **Check gas prices**: Call \`get_gas_price\` to get current gas costs on ${context.chainId === 84532 ? 'Base Sepolia' : 'the target chain'}.

3. **Analyze cost-benefit for each pool**:
   - Calculate the projected annual yield for each allocation
   - Compare against gas cost to execute the supply transaction
   - Skip any pool where gas cost exceeds projected annual yield
   - If \`currentApy\` is set, skip rebalances where the improvement is below the rebalance threshold

4. **Execute approved allocations**: For each pool that passes the cost-benefit check, call \`openfort_create_transaction\` to supply funds. Use the following parameters:
   - \`chainId\`: ${context.chainId}
   - \`accountAddress\`: ${context.walletAddress}
   - \`functionName\`: "supply"
   - \`functionArgs\`: [asset_address, amount_in_wei, on_behalf_of_address, referral_code]

5. **Return structured result**: After processing all allocations, output a JSON summary with this exact structure:
\`\`\`json
{
  "investmentId": "${context.investmentId}",
  "actions": [
    {
      "pool": { "chain": "...", "protocol": "...", "asset": "..." },
      "amountUsd": 0,
      "expectedApy": 0,
      "gasCostUsd": 0,
      "status": "executed|skipped|failed",
      "txHash": "0x...",
      "rationale": "..."
    }
  ],
  "totalAllocated": 0,
  "averageApy": 0
}
\`\`\`

## Safety Rules (NON-NEGOTIABLE)

- **Only** interact with the pre-approved pool allocations listed above — no other contracts
- **Never** exceed the specified allocation percentages
- **Always** log a rationale for every decision (executed, skipped, or failed)
- **Prioritize capital preservation**: if uncertain, skip and mark as skipped with reason
- **Never** retry a failed transaction more than once
- If any critical error occurs, stop execution and report the error in the result JSON
`;
}
