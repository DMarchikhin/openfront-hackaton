# Data Model: Risk Quiz & Investment Strategies

**Date**: 2026-02-28
**Branch**: `001-risk-quiz-strategies`

## Entities

### QuizQuestion

Represents a single risk assessment question displayed to the user.

| Field        | Type             | Constraints          |
|--------------|------------------|----------------------|
| id           | UUID             | PK, auto-generated   |
| text         | string           | Required, max 500    |
| displayOrder | number           | Required, unique     |
| options      | QuizOption[]     | Embedded, min 2      |
| createdAt    | Date             | Auto-set             |

**QuizOption** (embedded type, not a separate entity):

| Field       | Type   | Constraints       |
|-------------|--------|-------------------|
| label       | string | Required, max 200 |
| scoreWeight | number | Required, 0-10    |

**Domain Logic**:
- None. QuizQuestion is a data-carrying entity. Business logic
  for scoring resides on RiskAssessment.

---

### RiskAssessment

Represents a completed quiz submission with scoring and risk
level calculation. This is the primary domain entity with
business logic.

| Field      | Type                          | Constraints           |
|------------|-------------------------------|-----------------------|
| id         | UUID                          | PK, auto-generated    |
| userId     | string                        | Required              |
| answers    | QuizAnswer[]                  | Embedded              |
| totalScore | number                        | Computed              |
| riskLevel  | enum(conservative, balanced, growth) | Computed       |
| completedAt| Date                          | Auto-set on complete  |

**QuizAnswer** (embedded type):

| Field      | Type   | Constraints |
|------------|--------|-------------|
| questionId | UUID   | Required    |
| score      | number | Required    |

**Domain Logic** (tell don't ask):
- `addAnswer(questionId, scoreWeight)`: Records an answer and
  accumulates the total score. Throws if question already
  answered.
- `complete(totalQuestions)`: Finalizes the assessment. Throws
  if not all questions are answered. Calculates riskLevel from
  totalScore using threshold ranges.
- `getRiskLevel()`: Returns the computed risk level. Throws if
  assessment is not complete.

**Score → Risk Level mapping** (domain rule):
- 0-33% of max possible score → Conservative
- 34-66% of max possible score → Balanced
- 67-100% of max possible score → Growth

---

### InvestmentStrategy

Represents a pre-defined investment strategy that maps to a risk
level. Strategies are seeded data, not user-created.

| Field              | Type               | Constraints         |
|--------------------|--------------------|---------------------|
| id                 | UUID               | PK, auto-generated  |
| name               | string             | Required, unique    |
| riskLevel          | enum(conservative, balanced, growth) | Required |
| description        | string             | Required, max 1000  |
| poolAllocations    | PoolAllocation[]   | Embedded, min 1     |
| expectedApyMin     | number             | Required, percentage|
| expectedApyMax     | number             | Required, percentage|
| rebalanceThreshold | number             | Required, percentage|
| allowedChains      | string[]           | Required, min 1     |
| createdAt          | Date               | Auto-set            |

**PoolAllocation** (embedded type):

| Field                | Type   | Constraints          |
|----------------------|--------|----------------------|
| chain                | string | Required             |
| protocol             | string | Required (e.g. Aave) |
| asset                | string | Required (e.g. USDC) |
| allocationPercentage | number | Required, 0-100      |

**Domain Logic** (tell don't ask):
- `matchesRiskLevel(level)`: Returns true if strategy's risk
  level matches the given level.
- `validateAllocations()`: Throws if pool allocation
  percentages don't sum to 100.

**Invariant**: Sum of all poolAllocation percentages MUST equal
100 for any strategy.

---

### UserInvestment

Represents the binding between a user and their chosen investment
strategy. Tracks active/inactive status.

| Field       | Type                    | Constraints          |
|-------------|-------------------------|----------------------|
| id          | UUID                    | PK, auto-generated   |
| userId      | string                  | Required             |
| strategyId  | UUID                    | FK → InvestmentStrategy |
| status      | enum(active, inactive)  | Required             |
| activatedAt | Date                    | Set on activation    |
| deactivatedAt | Date | null            | Set on deactivation  |

**Domain Logic** (tell don't ask):
- `activate(strategyId)`: Sets status to active, records
  activatedAt. Throws if already active.
- `switchStrategy(newStrategyId)`: Deactivates current, creates
  new active binding. Returns the new UserInvestment.
- `deactivate()`: Sets status to inactive, records
  deactivatedAt. Throws if already inactive.

**Invariant**: A user MUST have at most one active UserInvestment
at any time.

---

## Relationships

```
QuizQuestion (1) ──contains──> (*) QuizOption [embedded]

RiskAssessment (1) ──contains──> (*) QuizAnswer [embedded]
RiskAssessment (*) ──references──> (1) QuizQuestion [via questionId in answers]

InvestmentStrategy (1) ──contains──> (*) PoolAllocation [embedded]

UserInvestment (*) ──references──> (1) InvestmentStrategy [via strategyId]
```

---

### AgentAction

Represents a single action taken by the investment agent. Provides
an audit trail of all autonomous decisions (constitution principle I
and IV).

| Field         | Type                          | Constraints          |
|---------------|-------------------------------|----------------------|
| id            | UUID                          | PK, auto-generated   |
| investmentId  | UUID                          | FK → UserInvestment  |
| userId        | string                        | Required             |
| actionType    | enum(supply, withdraw, rebalance, rate_check) | Required |
| strategyId    | UUID                          | FK → InvestmentStrategy |
| chain         | string                        | Required             |
| protocol      | string                        | Required             |
| asset         | string                        | Required             |
| amount        | string                        | Required (wei string)|
| gasCostUsd    | number | null                 | Estimated gas in USD |
| expectedApyBefore | number | null             | APY before action    |
| expectedApyAfter  | number | null             | APY after action     |
| rationale     | string                        | Required, max 1000   |
| status        | enum(pending, executed, failed, skipped) | Required |
| txHash        | string | null                 | On-chain tx hash     |
| executedAt    | Date                          | Auto-set             |

**Domain Logic**:
- `create(...)`: Static factory. Records all decision context at
  creation time.
- `markExecuted(txHash)`: Sets status to executed, records tx hash.
- `markFailed(reason)`: Sets status to failed, appends reason to
  rationale.
- `markSkipped(reason)`: Sets status to skipped (e.g., gas too high).

**Invariant**: Every agent action MUST have a non-empty rationale
explaining why the action was taken or skipped.

---

## Relationships (updated)

```
QuizQuestion (1) ──contains──> (*) QuizOption [embedded]

RiskAssessment (1) ──contains──> (*) QuizAnswer [embedded]
RiskAssessment (*) ──references──> (1) QuizQuestion [via questionId in answers]

InvestmentStrategy (1) ──contains──> (*) PoolAllocation [embedded]

UserInvestment (*) ──references──> (1) InvestmentStrategy [via strategyId]

AgentAction (*) ──references──> (1) UserInvestment [via investmentId]
AgentAction (*) ──references──> (1) InvestmentStrategy [via strategyId]
```

## Seed Data

Three pre-defined strategies MUST be seeded on first run:

1. **Safe Harbor** (Conservative): 100% Aave USDC on Ethereum.
   Expected APY: 3-5%. Rebalance threshold: 2%. Chains: [Ethereum].

2. **Steady Growth** (Balanced): 60% Aave USDC on Ethereum, 40%
   Aave USDC on Base. Expected APY: 5-8%. Rebalance threshold:
   1.5%. Chains: [Ethereum, Base].

3. **Max Yield** (Growth): 40% Aave USDC on Base, 40% Aave USDC
   on Polygon, 20% Aave USDC on Ethereum. Expected APY: 7-12%.
   Rebalance threshold: 1%. Chains: [Ethereum, Base, Polygon].

Five quiz questions MUST be seeded (see spec FR-001).

---

## Phase 3: Portfolio Response Types (computed, not persisted)

### PortfolioResponse

Returned by `GET /api/investments/portfolio?userId=...`. Computed at query time from AgentAction records + on-chain aToken balances.

```typescript
interface PortfolioResponse {
  investmentId: string;
  strategyName: string;
  riskLevel: string;
  totalValueUsd: number;       // Sum of on-chain pool balances
  totalInvestedUsd: number;    // Sum of net invested (supply - withdraw)
  totalEarnedUsd: number;      // totalValue - totalInvested
  pools: PoolPosition[];
}
```

### PoolPosition

One entry per unique (chain, protocol, asset) combination with executed actions.

```typescript
interface PoolPosition {
  pool: {
    chain: string;             // "Base Sepolia"
    protocol: string;          // "Aave V3"
    asset: string;             // "USDC"
  };
  onChainBalanceUsd: number;   // Current aToken balance
  totalSuppliedUsd: number;    // Sum of executed supply amounts
  totalWithdrawnUsd: number;   // Sum of executed withdraw amounts
  netInvestedUsd: number;      // totalSupplied - totalWithdrawn
  earnedYieldUsd: number;      // onChainBalance - netInvested
  latestApyPercent: number | null;
  allocationPercent: number;   // From strategy definition
  actions: PoolAction[];       // Tx history for this pool
}
```

### PoolAction

Subset of AgentAction for display in per-pool transaction history.

```typescript
interface PoolAction {
  id: string;
  actionType: string;
  amountUsd: number;
  expectedApyAfter: number | null;
  status: string;
  txHash: string | null;
  rationale: string;
  executedAt: string;          // ISO timestamp
}
```

### Computation Logic

```
For each unique (chain, protocol, asset) in AgentAction records:
  1. totalSupplied = SUM(amount) WHERE actionType='supply' AND status='executed'
  2. totalWithdrawn = SUM(amount) WHERE actionType='withdraw' AND status='executed'
  3. netInvested = totalSupplied - totalWithdrawn
  4. onChainBalance = readContract(aTokenAddress, 'balanceOf', [smartAccount]) / 1e6
  5. earnedYield = onChainBalance - netInvested
  6. latestApy = most recent action with non-null expectedApyAfter
  7. actions = all AgentAction records for this pool, ordered by executedAt DESC
```

### aToken Lookup Map

```typescript
const ATOKEN_MAP: Record<string, `0x${string}`> = {
  '84532:0x036cbd53842c5426634e7929541ec2318f3dcf7e': '0xf53B60F4006cab2b3C4688ce41fD5362427A2A66',
};
// Key: ${chainId}:${underlyingAssetAddress.toLowerCase()}
```
