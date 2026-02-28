# Openfort DeFi App — C4 Architecture Documentation

> Auto-generated from codebase exploration. Last updated: 2026-02-28

---

## Table of Contents

1. [Level 1 — System Context](#level-1--system-context)
2. [Level 2 — Container](#level-2--container)
3. [Level 3 — Component](#level-3--component)
   - [Web App](#web-app-components)
   - [API Server](#api-server-components)
   - [Agent Server](#agent-server-components)
4. [Level 4 — Code](#level-4--code)
   - [Domain Entities](#domain-entities)
   - [Enums](#enums)
   - [AllocationOptimizer](#allocationoptimizer)
   - [Investment Execution Sequence](#investment-execution-sequence)
5. [Data Flow Narrative](#data-flow-narrative)
6. [Key Design Patterns](#key-design-patterns)
7. [Environment Variables Reference](#environment-variables-reference)
8. [Database Schema Summary](#database-schema-summary)

---

## Level 1 — System Context

```mermaid
C4Context
  title Openfort DeFi App — System Context

  Person(user, "End User", "DeFi investor who wants guided, risk-appropriate yield")

  System_Boundary(openfort, "Openfort DeFi App") {
    System(app, "Openfort DeFi App", "Risk quiz, strategy selection, AI-driven Aave allocation")
  }

  System_Ext(anthropic, "Anthropic API", "Claude Sonnet 4.6 LLM — powers the investment agent reasoning")
  System_Ext(openfortPlatform, "Openfort Platform", "ERC-4337 smart accounts, gas sponsorship, transaction signing")
  System_Ext(aave, "Aave V3 Protocol", "On-chain yield supply and withdrawal (Base Mainnet data / Base Sepolia execution)")
  System_Ext(base, "Base Blockchain", "L2 chain — Sepolia testnet for execution, Mainnet for live rate data")

  Rel(user, app, "Takes risk quiz, browses strategies, views dashboard", "HTTPS")
  Rel(app, anthropic, "Agent queries Claude Sonnet 4.6", "HTTPS / Claude Agent SDK")
  Rel(app, openfortPlatform, "Create & submit ERC-4337 UserOperations", "HTTPS REST")
  Rel(app, aave, "Supply / withdraw USDC", "On-chain via Openfort")
  Rel(app, base, "Read APY data (mainnet) / execute txns (sepolia)", "RPC / on-chain")
```

---

## Level 2 — Container

```mermaid
C4Container
  title Openfort DeFi App — Containers

  Person(user, "End User")

  System_Boundary(openfort, "Openfort DeFi App") {
    Container(web, "Web App", "Next.js 15, React 19, Tailwind CSS", "Quiz flow, strategy browser, investment dashboard. Port 3000.")
    Container(api, "API Server", "NestJS 10, MikroORM 6, TypeScript", "Business logic, domain models, orchestrates agent. Port 3001.")
    Container(agent, "Agent Server", "Claude Agent SDK, Node.js 20", "AI investment executor — talks to Aave + Openfort. Port 3002.")
    ContainerDb(db, "PostgreSQL", "Relational DB", "Stores strategies, investments, quiz data, agent action logs. Port 5432.")
    Container(aaveMcp, "Aave MCP Server", "Node.js HTTP server", "Wraps Aave V3 on-chain data and interaction. Port 8080. External project.")
  }

  System_Ext(anthropic, "Anthropic API", "LLM — Claude Sonnet 4.6")
  System_Ext(openfortPlatform, "Openfort Platform", "ERC-4337 infra")
  System_Ext(base, "Base Blockchain", "Sepolia + Mainnet")

  Rel(user, web, "HTTPS", "Browser")
  Rel(web, api, "REST API calls", "HTTP JSON")
  Rel(api, db, "ORM queries", "TCP")
  Rel(api, agent, "POST /execute, POST /rebalance (fire-and-forget)", "HTTP JSON")
  Rel(agent, anthropic, "query() via Agent SDK", "HTTPS")
  Rel(agent, aaveMcp, "POST /mcp (tool calls)", "HTTP JSON")
  Rel(agent, openfortPlatform, "Create transactionIntents", "HTTPS REST")
  Rel(aaveMcp, base, "Read reserves, supply, withdraw", "RPC / on-chain")
  Rel(openfortPlatform, base, "Submit UserOperations", "On-chain")
```

---

## Level 3 — Component

### Web App Components

```mermaid
C4Component
  title Web App — Components (Next.js 15)

  Container_Ext(api, "API Server", "NestJS 10")

  Container_Boundary(web, "Web App (Next.js 15)") {
    Component(apiClient, "API Client", "lib/api.ts", "Typed fetch wrappers for all REST endpoints. Base URL from NEXT_PUBLIC_API_URL.")

    Component(quizStepper, "QuizStepper", "components/quiz/QuizStepper.tsx", "Orchestrates quiz state, loads questions, submits answers, persists userId in localStorage.")
    Component(questionCard, "QuestionCard", "components/quiz/QuestionCard.tsx", "Renders single question with multiple-choice options and selection feedback.")
    Component(progressBar, "ProgressBar", "components/quiz/ProgressBar.tsx", "Shows current step / total steps.")
    Component(riskResult, "RiskResult", "components/quiz/RiskResult.tsx", "Displays risk level badge, score percentage, description, and navigation links.")

    Component(strategyCard, "StrategyCard", "components/strategy/StrategyCard.tsx", "Strategy summary card — risk badge, APY range, chains, recommended highlight.")
    Component(strategyDetail, "StrategyDetail", "components/strategy/StrategyDetail.tsx", "Full strategy view with pool allocation bars, amount input, Start/Switch action button.")

    Component(investmentSummary, "InvestmentSummary", "components/dashboard/InvestmentSummary.tsx", "Active strategy info, APY, daily earnings estimate, pool allocation bars, live agent status.")
    Component(agentActions, "AgentActions", "components/dashboard/AgentActions.tsx", "Scrollable log of AgentAction records with status badges, tx hashes, APY before/after.")
  }

  Rel(quizStepper, questionCard, "renders each question")
  Rel(quizStepper, progressBar, "renders progress")
  Rel(quizStepper, riskResult, "renders on completion")
  Rel(quizStepper, apiClient, "fetchQuizQuestions(), submitQuiz()")
  Rel(strategyDetail, apiClient, "startInvesting(), switchStrategy()")
  Rel(investmentSummary, apiClient, "fetchActiveInvestment()")
  Rel(agentActions, apiClient, "fetchAgentActions()")
  Rel(apiClient, api, "HTTP REST")
```

### API Server Components

```mermaid
C4Component
  title API Server — Components (NestJS 10, Hexagonal Architecture)

  Container_Ext(web, "Web App")
  Container_Ext(agent, "Agent Server")
  Container_Ext(db, "PostgreSQL")

  Container_Boundary(api, "API Server (NestJS 10)") {

    Component(quizCtrl, "QuizController", "infrastructure/quiz.controller.ts", "GET /quiz/questions, POST /quiz/submit")
    Component(getQuestionsUC, "GetQuizQuestionsUseCase", "application/get-quiz-questions.use-case.ts", "Fetches questions ordered by displayOrder.")
    Component(submitQuizUC, "SubmitQuizUseCase", "application/submit-quiz.use-case.ts", "Scores answers, derives RiskLevel (0–33% conservative, 34–66% balanced, 67–100% growth), persists RiskAssessment.")
    Component(quizQuestionRepo, "QuizQuestionRepository", "infrastructure/quiz-question.repository.ts", "findAllOrdered()")
    Component(riskAssessmentRepo, "RiskAssessmentRepository", "infrastructure/risk-assessment.repository.ts", "save(assessment)")

    Component(strategyCtrl, "StrategyController", "infrastructure/strategy.controller.ts", "GET /strategies, GET /strategies/:id")
    Component(getStrategiesUC, "GetStrategiesUseCase", "application/get-strategies.use-case.ts", "Returns all strategies or filtered by riskLevel.")
    Component(strategyRepo, "StrategyRepository", "infrastructure/strategy.repository.ts", "findAll(), findByRiskLevel(), findById()")

    Component(investCtrl, "InvestmentController", "infrastructure/investment.controller.ts", "POST /investments/start, PATCH /investments/switch, GET /investments/active, POST /investments/execute, GET /investments/:id/actions")
    Component(startUC, "StartInvestingUseCase", "application/start-investing.use-case.ts", "Creates UserInvestment, validates uniqueness, fires ExecuteInvestmentUseCase async.")
    Component(switchUC, "SwitchStrategyUseCase", "application/switch-strategy.use-case.ts", "Deactivates old investment, creates new one, fires triggerRebalance() async.")
    Component(executeUC, "ExecuteInvestmentUseCase", "application/execute-investment.use-case.ts", "HTTP POST to Agent Server /execute or /rebalance. Saves AgentAction entities from response.")
    Component(investRepo, "InvestmentRepository", "infrastructure/investment.repository.ts", "save(), findActiveByUserId(), findById()")
    Component(agentActionRepo, "AgentActionRepository", "infrastructure/agent-action.repository.ts", "save(), findByInvestmentId()")
  }

  Rel(web, quizCtrl, "HTTP")
  Rel(web, strategyCtrl, "HTTP")
  Rel(web, investCtrl, "HTTP")

  Rel(quizCtrl, getQuestionsUC, "delegates")
  Rel(quizCtrl, submitQuizUC, "delegates")
  Rel(getQuestionsUC, quizQuestionRepo, "findAllOrdered()")
  Rel(submitQuizUC, riskAssessmentRepo, "save()")

  Rel(strategyCtrl, getStrategiesUC, "delegates")
  Rel(getStrategiesUC, strategyRepo, "findAll() / findByRiskLevel()")

  Rel(investCtrl, startUC, "delegates")
  Rel(investCtrl, switchUC, "delegates")
  Rel(startUC, executeUC, "fire-and-forget async")
  Rel(switchUC, executeUC, "fire-and-forget async")
  Rel(executeUC, agent, "POST /execute or /rebalance")
  Rel(executeUC, agentActionRepo, "save AgentAction records")
  Rel(startUC, investRepo, "save UserInvestment")
  Rel(switchUC, investRepo, "save / update")

  Rel(quizQuestionRepo, db, "MikroORM")
  Rel(riskAssessmentRepo, db, "MikroORM")
  Rel(strategyRepo, db, "MikroORM")
  Rel(investRepo, db, "MikroORM")
  Rel(agentActionRepo, db, "MikroORM")
```

### Agent Server Components

```mermaid
C4Component
  title Agent Server — Components (Claude Agent SDK)

  Container_Ext(api, "API Server")
  Container_Ext(anthropic, "Anthropic API")
  Container_Ext(aaveMcpServer, "Aave MCP Server :8080")
  Container_Ext(openfortPlatform, "Openfort Platform")

  Container_Boundary(agent, "Agent Server (Node.js 20)") {
    Component(httpServer, "HTTP Server", "server.ts", "Express-like HTTP server on port 3002. Routes: GET /health, POST /execute, POST /rebalance. Deletes CLAUDECODE env var at startup.")
    Component(agentExecutor, "Agent Executor", "index.ts", "executeInvestment() and rebalanceInvestment(). Iterates AsyncGenerator<SDKMessage> from SDK query(). Parses JSON result from agent output.")
    Component(agentPrompt, "Agent Prompts", "agent-prompt.ts", "buildAgentPrompt() and buildRebalancePrompt(). Contains chain-aware contract addresses, safety rules, JSON output schema.")
    Component(aaveMcpAdapter, "Aave MCP Adapter", "mcp/aave-tools.ts", "In-process MCP server wrapping POST /mcp HTTP endpoint. Tools: aave_get_reserves, get_gas_price, get_balance, aave_stake, aave_withdraw.")
    Component(openfortMcp, "Openfort MCP Tools", "mcp/openfort-tools.ts", "In-process MCP server. Tools: openfort_create_transaction (ERC-4337 or EOA fallback), openfort_get_balance, openfort_simulate_transaction.")
    Component(allocOptimizer, "AllocationOptimizer", "domain/allocation-optimizer.ts", "computeAllocations() — calculates per-pool USD amounts, checks gas vs annual yield, applies rebalance threshold.")
  }

  Rel(api, httpServer, "POST /execute, POST /rebalance")
  Rel(httpServer, agentExecutor, "delegates params")
  Rel(agentExecutor, agentPrompt, "buildAgentPrompt() / buildRebalancePrompt()")
  Rel(agentExecutor, aaveMcpAdapter, "registers as MCP server")
  Rel(agentExecutor, openfortMcp, "registers as MCP server")
  Rel(agentExecutor, anthropic, "query() via Claude Agent SDK")
  Rel(aaveMcpAdapter, aaveMcpServer, "POST /mcp (tool calls)")
  Rel(openfortMcp, openfortPlatform, "createTransactionIntent()")
  Rel(agentExecutor, allocOptimizer, "computeAllocations() for decision support")
```

---

## Level 4 — Code

### Domain Entities

```mermaid
classDiagram
  class QuizQuestion {
    +UUID id
    +string text
    +number displayOrder
    +QuizOption[] options
    +Date createdAt
  }

  class QuizOption {
    +string label
    +number scoreWeight
  }

  class RiskAssessment {
    +UUID id
    +string userId
    +QuizAnswer[] answers
    +number totalScore
    +RiskLevel riskLevel
    +Date completedAt
    +create(userId) RiskAssessment$
    +addAnswer(questionId, scoreWeight) void
    +complete(totalQuestions, maxPossibleScore) void
    +getRiskLevel() RiskLevel
  }

  class QuizAnswer {
    +string questionId
    +number score
  }

  class InvestmentStrategy {
    +UUID id
    +string name
    +RiskLevel riskLevel
    +string description
    +PoolAllocation[] poolAllocations
    +number expectedApyMin
    +number expectedApyMax
    +number rebalanceThreshold
    +string[] allowedChains
    +Date createdAt
    +matchesRiskLevel(level) boolean
    +validateAllocations() void
  }

  class PoolAllocation {
    +string chain
    +string protocol
    +string asset
    +number allocationPercentage
  }

  class UserInvestment {
    +UUID id
    +string userId
    +UUID strategyId
    +InvestmentStatus status
    +Date activatedAt
    +Date deactivatedAt
    +create(userId, strategyId) UserInvestment$
    +activate(strategyId) void
    +deactivate() void
  }

  class AgentAction {
    +UUID id
    +UUID investmentId
    +string userId
    +AgentActionType actionType
    +UUID strategyId
    +string chain
    +string protocol
    +string asset
    +string amount
    +number gasCostUsd
    +number expectedApyBefore
    +number expectedApyAfter
    +string rationale
    +AgentActionStatus status
    +string txHash
    +Date executedAt
    +create(params) AgentAction$
    +markExecuted(txHash) void
    +markFailed(reason) void
    +markSkipped(reason) void
  }

  QuizQuestion "1" *-- "many" QuizOption
  RiskAssessment "1" *-- "many" QuizAnswer
  InvestmentStrategy "1" *-- "many" PoolAllocation
  UserInvestment "many" --> "1" InvestmentStrategy : references strategyId
  AgentAction "many" --> "1" UserInvestment : references investmentId
```

### Enums

```mermaid
classDiagram
  class RiskLevel {
    <<enumeration>>
    CONSERVATIVE
    BALANCED
    GROWTH
  }

  class InvestmentStatus {
    <<enumeration>>
    ACTIVE
    INACTIVE
  }

  class AgentActionType {
    <<enumeration>>
    SUPPLY
    WITHDRAW
    REBALANCE
    RATE_CHECK
  }

  class AgentActionStatus {
    <<enumeration>>
    PENDING
    EXECUTED
    FAILED
    SKIPPED
  }
```

### AllocationOptimizer

```mermaid
classDiagram
  class AllocationOptimizer {
    +computeAllocations(params) AllocationDecision[]
  }

  class ComputeParams {
    +PoolAllocation[] poolAllocations
    +number totalAmountUsd
    +Map~string_number~ currentRates
    +number gasPrice
    +number rebalanceThreshold
    +number currentApy
  }

  class AllocationDecision {
    +PoolAllocation pool
    +number amountUsd
    +number expectedApy
    +number annualYieldUsd
    +boolean shouldExecute
    +string rationale
  }

  AllocationOptimizer ..> ComputeParams : accepts
  AllocationOptimizer ..> AllocationDecision : returns
```

### Investment Execution Sequence

```mermaid
sequenceDiagram
  participant User
  participant Web as Web App
  participant API as API Server
  participant Agent as Agent Server
  participant Claude as Anthropic API
  participant AaveMCP as Aave MCP :8080
  participant Openfort as Openfort Platform
  participant Chain as Base Blockchain

  User->>Web: Click "Start Investing" (amount, strategyId)
  Web->>API: POST /investments/start
  API->>API: StartInvestingUseCase — create UserInvestment
  API-->>Web: 201 {investmentId, status: active}

  Note over API,Agent: Fire-and-forget async

  API->>Agent: POST /execute {investmentId, strategy, userAmount, walletAddress}
  Agent->>Claude: query(prompt + MCP servers) via Agent SDK
  Claude->>AaveMCP: aave_get_reserves()
  AaveMCP->>Chain: Read Aave V3 reserves (Base Mainnet)
  AaveMCP-->>Claude: APY data per token/pool
  Claude->>AaveMCP: get_gas_price()
  AaveMCP-->>Claude: gasPrice gwei, USD cost per tx
  Note over Claude: AllocationOptimizer logic: skip if gas > annual yield
  Claude->>Openfort: openfort_create_transaction(aave_supply, USDC, amount)
  Openfort->>Chain: Submit ERC-4337 UserOperation (Base Sepolia)
  Chain-->>Openfort: txHash
  Openfort-->>Claude: {txHash, status: executed}
  Claude-->>Agent: JSON result {actions[], totalAllocated, averageApy, summary}
  Agent->>API: (response parsed)
  API->>API: Save AgentAction entities (EXECUTED, txHash)

  User->>Web: Open Dashboard
  Web->>API: GET /investments/active?userId=...
  API-->>Web: ActiveInvestment + last agent action
  Web->>API: GET /investments/:id/actions
  API-->>Web: AgentAction[] history
  Web-->>User: Dashboard with strategy info + agent log
```

---

## Data Flow Narrative

### 1. Risk Quiz

1. User opens `/quiz` — `QuizStepper` calls `GET /quiz/questions`
2. `QuizController` → `GetQuizQuestionsUseCase` → DB → returns `QuizQuestion[]` ordered by `displayOrder`
3. User answers each question; `QuizStepper` accumulates `{ questionId → scoreWeight }`
4. On final question, `POST /quiz/submit` → `SubmitQuizUseCase`:
   - Sums all `scoreWeight` values → `totalScore`
   - Calculates `scorePercentage = totalScore / maxPossibleScore`
   - Maps to `RiskLevel`: 0–33% → conservative, 34–66% → balanced, 67–100% → growth
   - Persists `RiskAssessment` to DB
5. `RiskResult` component displays level, score, description and links to `/strategies?riskLevel=...`

### 2. Strategy Selection

1. `/strategies?riskLevel=balanced` → `StrategyController` → `GetStrategiesUseCase`
2. Returns filtered `InvestmentStrategy[]` with APY ranges and `PoolAllocation[]`
3. User clicks a `StrategyCard` → `StrategyDetail` opens with allocation breakdown
4. User enters investment amount → clicks "Start Investing"

### 3. Investment Execution

1. `POST /investments/start` → `StartInvestingUseCase`:
   - Creates `UserInvestment` (validates no existing active investment)
   - Returns `investmentId` to client immediately
2. Async (fire-and-forget): `ExecuteInvestmentUseCase.execute()`:
   - HTTP POST to `AGENT_SERVICE_URL/execute` with investment params
   - If agent service not configured: creates PENDING `AgentAction` placeholder
   - On response: parses `actions[]` and saves each as `AgentAction` entity

### 4. Agent Reasoning (inside Agent Server)

1. `executeInvestment()` builds prompt via `buildAgentPrompt()` (chain-aware contract addresses)
2. Creates in-process MCP servers: `createAaveMcpServer()` + `createOpenfortMcpServer()`
3. Calls Claude Agent SDK `query()` — Claude iterates:
   - `aave_get_reserves()` → reads live APY from Base Mainnet
   - `get_gas_price()` → estimates tx cost in USD
   - Per pool: `AllocationOptimizer` logic — skip if `gasCostUsd > annualYieldUsd`
   - `openfort_create_transaction()` → ERC-4337 UserOp on Base Sepolia (or EOA fallback)
4. Agent outputs structured JSON → `AgentResult`

### 5. Strategy Switch / Rebalance

1. User picks new strategy → `PATCH /investments/switch`
2. `SwitchStrategyUseCase`: deactivates old `UserInvestment`, creates new one
3. Fire-and-forget: `ExecuteInvestmentUseCase.triggerRebalance()` → `POST /rebalance`
4. Agent follows `buildRebalancePrompt()`: withdraw from old pools, supply to new pools

### 6. Dashboard

1. `GET /investments/active?userId=...` → active strategy + last agent action
2. `GET /investments/:id/actions` → full `AgentAction[]` history
3. `InvestmentSummary` shows strategy, APY, pool allocations
4. `AgentActions` shows chronological log with status badges and tx hashes

---

## Key Design Patterns

### Hexagonal Architecture (Ports & Adapters)

All NestJS modules follow hexagonal architecture:
- **Domain** (`domain/`) — entities with rich methods, no framework dependencies
- **Application** (`application/`) — use cases injecting repository **ports** (interfaces)
- **Infrastructure** (`infrastructure/`) — controllers (primary adapters) + MikroORM repositories (secondary adapters)

This keeps business logic testable and decoupled from NestJS/MikroORM specifics.

### Fire-and-Forget Agent Invocation

The API never awaits agent completion for user-facing requests. Pattern:
```
POST /investments/start → 201 immediately
             └─ async ─→ POST /execute (agent server)
                              └─ AI runs for 30–120s
                                   └─ API saves AgentActions to DB
```
This prevents HTTP timeouts while still persisting agent results for dashboard display.

### In-Process MCP Server (Aave SSE Workaround)

The external Aave MCP server uses a non-standard SSE transport incompatible with the Claude Agent SDK. Solution: `createAaveMcpServer()` in `mcp/aave-tools.ts` creates an in-process MCP server that:
1. Receives tool calls from Claude Agent SDK via standard stdio/in-process protocol
2. Translates them to `POST http://localhost:8080/mcp` HTTP calls
3. Returns results back to the agent

### Hybrid Chain Strategy

| Concern | Chain | Reason |
|---------|-------|--------|
| Aave APY data | Base Mainnet (8453) | Live real rates, not testnet dummy values |
| Transaction execution | Base Sepolia (84532) | Openfort test API key only works on testnet |
| Contract addresses | Chain-specific in `agent-prompt.ts` | Agent prompt receives correct addresses per `CHAIN_ID` |

### ERC-4337 with EOA Fallback

`openfort_create_transaction()` in `mcp/openfort-tools.ts`:
1. **Primary path**: If `OPENFORT_SMART_ACCOUNT_ID` + `OPENFORT_GAS_POLICY_ID` configured → creates Openfort `transactionIntent` (gas-sponsored UserOp, batched USDC approve + Aave supply)
2. **Fallback path**: If smart account not configured → uses `viem` with EOA private key signing

---

## Environment Variables Reference

### apps/api/.env
| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/openfort` |
| `AGENT_SERVICE_URL` | Agent server base URL (optional) | `http://localhost:3002` |
| `WALLET_ADDRESS` | Default wallet for agent actions | `0x...` |

### apps/agent/.env
| Variable | Description | Example |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | **Required**. Claude API key | `sk-ant-...` |
| `OPENFORT_API_KEY` | Openfort platform API key | `pk_...` |
| `OPENFORT_WALLET_SECRET` | Openfort wallet secret | `...` |
| `OPENFORT_SMART_ACCOUNT_ID` | ERC-4337 smart account ID | `sam_...` |
| `OPENFORT_GAS_POLICY_ID` | Gas sponsorship policy ID | `gac_...` |
| `OPENFORT_AAVE_CONTRACT_ID` | Openfort contract ID for Aave Pool | `con_...` |
| `OPENFORT_USDC_CONTRACT_ID` | Openfort contract ID for USDC | `con_...` |
| `OPENFORT_BACKEND_ACCOUNT_ADDRESS` | Backend signer EOA address | `0x...` |
| `BASE_SEPOLIA_RPC_URL` | Base Sepolia RPC endpoint | `https://sepolia.base.org` |
| `AAVE_MCP_URL` | Aave MCP server URL | `http://localhost:8080/mcp/sse` |
| `CHAIN_ID` | Execution chain ID | `84532` (Base Sepolia) |
| `AGENT_PORT` | Agent HTTP server port | `3002` |

### apps/web/.env.local
| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | NestJS API base URL | `http://localhost:3001/api` |

---

## Database Schema Summary

### investment_strategy
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | varchar UNIQUE | e.g. "Conservative Stable" |
| risk_level | enum | conservative / balanced / growth |
| description | text | |
| pool_allocations | jsonb | Array of `{chain, protocol, asset, allocationPercentage}` |
| expected_apy_min | decimal | |
| expected_apy_max | decimal | |
| rebalance_threshold | decimal | Min APY delta to trigger rebalance |
| allowed_chains | text[] | e.g. `["8453", "84532"]` |
| created_at | timestamp | |

### user_investment
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | varchar | External user ID |
| strategy_id | UUID FK → investment_strategy | |
| status | enum | active / inactive |
| activated_at | timestamp | |
| deactivated_at | timestamp NULL | |

### agent_action
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| investment_id | UUID FK → user_investment | |
| user_id | varchar | |
| action_type | enum | supply / withdraw / rebalance / rate_check |
| strategy_id | UUID | |
| chain | varchar | Chain ID as string |
| protocol | varchar | e.g. "aave-v3" |
| asset | varchar | e.g. "USDC" |
| amount | varchar | String to avoid float precision issues |
| gas_cost_usd | decimal NULL | |
| expected_apy_before | decimal NULL | |
| expected_apy_after | decimal NULL | |
| rationale | varchar(1000) | Agent's reasoning |
| status | enum | pending / executed / failed / skipped |
| tx_hash | varchar NULL | On-chain transaction hash |
| executed_at | timestamp | Set on record creation |

### quiz_question
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| text | varchar(500) | |
| display_order | int UNIQUE | Ordering for quiz flow |
| options | jsonb | Array of `{label, scoreWeight}` |
| created_at | timestamp | |

### risk_assessment
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | varchar | |
| answers | jsonb | Array of `{questionId, score}` |
| total_score | int | |
| risk_level | enum NULL | Computed on completion |
| completed_at | timestamp NULL | |

---

## Contract Addresses Reference

### Base Mainnet (Chain ID: 8453) — Rate data only
| Contract | Address |
|----------|---------|
| Aave V3 Pool | `0xA238Dd80C259a72e81d7e4664a9801593F98d1c5` |
| USDC | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| WETH | `0x4200000000000000000000000000000000000006` |

### Base Sepolia Testnet (Chain ID: 84532) — Execution
| Contract | Address |
|----------|---------|
| Aave V3 Pool | `0x07eA79F68B2B3df564D0A34F8e19D9B1e339814b` |
| USDC | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| WETH | `0x4200000000000000000000000000000000000006` |
| Pool Addresses Provider | `0xd449FeD49d9C443688d6816fE6872F21402e41de` |

---

## Service Startup Reference

```bash
# 1. PostgreSQL (system service — must be running)

# 2. Aave MCP Server (external project)
cd /Users/dm/Projects/aave-mcp && npm start   # port 8080

# 3. NestJS API
cd apps/api && pnpm dev                        # port 3001

# 4. Agent Server (CRITICAL: use env -u CLAUDECODE to allow child claude CLI)
cd apps/agent && env -u CLAUDECODE tsx src/server.ts   # port 3002

# 5. Next.js Web
cd apps/web && pnpm dev                        # port 3000
```

> **Note:** The `CLAUDECODE` environment variable is unset before starting the agent server because the Claude CLI refuses to spawn child processes inside an existing Claude Code session. The agent server's `server.ts` also calls `delete process.env.CLAUDECODE` at startup for the same reason.
