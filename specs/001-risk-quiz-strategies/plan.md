# Implementation Plan: Portfolio Dashboard — Current Pools & Transaction History

**Branch**: `001-risk-quiz-strategies` | **Date**: 2026-02-28 | **Spec**: [spec.md](./spec.md)
**Input**: User request: "Adding current portfolio showing what pools we have and transaction history linked to each pool to dashboard."

## Summary

Add a **portfolio section** to the existing dashboard that shows the user's current on-chain positions (aToken balances per pool) and a per-pool transaction history view. The system reads live aToken balances from the blockchain, correlates them with `AgentAction` records from the database, and renders a pool-centric portfolio view with drill-down transaction history.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20+)
**Primary Dependencies**: Next.js 15 (App Router), NestJS 10, MikroORM 6.4, viem, Tailwind CSS
**Storage**: PostgreSQL (existing `agent_action`, `user_investment`, `investment_strategy` tables)
**Testing**: Manual integration testing (hackathon scope)
**Target Platform**: Web (localhost:3000 dashboard)
**Project Type**: Monorepo web application (apps/web + apps/api + apps/agent)
**Constraints**: Base Sepolia testnet only, USDC only, Aave V3 only

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Security-First | PASS | Read-only on-chain calls (balanceOf). No new write operations. All tx data from existing audit trail. |
| II. Zero-Friction UX | PASS | Portfolio shows balances in plain USD. No hex addresses visible to user. Pools labeled by protocol+chain+asset. |
| III. Guardrailed Autonomy | N/A | No new agent actions. Portfolio is read-only display. |
| IV. Transparency & Trust | PASS | This feature directly supports transparency — users can see exactly where their funds are and what the agent did. Per-pool tx history provides the "Why?" screen. |
| V. Simplicity (YAGNI) | PASS | Minimal additions: 1 new API endpoint, 2 new UI components. No new DB tables. Uses existing AgentAction data. |

## Project Structure

### Documentation (this feature)

```text
specs/001-risk-quiz-strategies/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api-endpoints.md
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
apps/api/src/
├── modules/
│   └── investment/
│       ├── application/
│       │   └── get-portfolio.use-case.ts     # NEW — reads on-chain balances + computes portfolio
│       └── infrastructure/
│           └── investment.controller.ts       # MODIFY — add GET /portfolio endpoint
│
apps/web/src/
├── app/
│   └── dashboard/
│       └── page.tsx                           # MODIFY — add PortfolioSection
├── components/
│   └── dashboard/
│       ├── PortfolioSection.tsx               # NEW — pool cards with balances
│       └── PoolTransactions.tsx               # NEW — per-pool transaction history
├── lib/
│   └── api.ts                                 # MODIFY — add fetchPortfolio()
```

**Structure Decision**: Extends existing monorepo structure. New use case in API, new components in web. No new modules or entities needed.

## Architecture

### Data Flow

```
Dashboard → fetchPortfolio(userId)
  → API: GET /api/investments/portfolio?userId=...
    → GetPortfolioUseCase
      1. Find active UserInvestment + Strategy
      2. Find all AgentAction records (status=executed, actionType=supply/withdraw)
      3. Read on-chain aToken balances via viem (Base Sepolia RPC)
      4. Compute per-pool positions:
         - pool: { chain, protocol, asset }
         - onChainBalance: aToken balance in USD
         - totalSupplied: sum of supply actions
         - totalWithdrawn: sum of withdraw actions
         - earnedYield: onChainBalance - (totalSupplied - totalWithdrawn)
         - latestApy: from last agent rate_check or supply action
         - actionCount: number of actions for this pool
      5. Return PortfolioResponse
  → Frontend renders PortfolioSection with pool cards
    → Click pool card → expand PoolTransactions (filtered agent actions)
```

### On-Chain Balance Reading

```typescript
// aToken addresses (Base Sepolia, Aave V3 Pool 0x07eA...)
const ATOKEN_MAP: Record<string, `0x${string}`> = {
  'USDC': '0xf53B60F4006cab2b3C4688ce41fD5362427A2A66',
};

// Read balance via standard ERC-20 balanceOf
const balance = await publicClient.readContract({
  address: atokenAddress,
  abi: parseAbi(['function balanceOf(address) view returns (uint256)']),
  functionName: 'balanceOf',
  args: [smartAccountAddress],
});
```

### Frontend Layout

```
Dashboard Page
├── InvestmentSummary (existing — strategy name, allocations, APY range)
├── PortfolioSection (NEW)
│   ├── Total Portfolio Value card
│   ├── Pool Card: "USDC on Aave V3 (Base Sepolia)"
│   │   ├── Current Balance: $10.50
│   │   ├── Supplied: $10.00 | Earned: $0.50
│   │   ├── Current APY: 8.5%
│   │   └── [expand] → PoolTransactions
│   │       ├── Supply $10.00 — Feb 28, 2:30 PM — tx: 0x965...
│   │       └── Rate Check — Feb 28, 3:00 PM — 8.5% APY
│   └── Pool Card: (additional pools if multi-pool strategy)
└── AgentActions (existing — full timeline, kept as-is)
```

## Complexity Tracking

> No constitution violations. No complexity justifications needed.
