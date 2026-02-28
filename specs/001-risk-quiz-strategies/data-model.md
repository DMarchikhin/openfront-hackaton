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
