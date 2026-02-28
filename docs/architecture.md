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
flowchart TB
    User(["👤 End User\nDeFi investor"])

    subgraph App["Openfort DeFi App"]
        Core["Openfort DeFi App\nRisk quiz · Strategy selection · AI allocation"]
    end

    Anthropic["☁️ Anthropic API\nClaude Sonnet 4.6"]
    Openfort["☁️ Openfort Platform\nERC-4337 · Gas sponsorship"]
    Aave["⛓️ Aave V3 Protocol\nYield supply & withdrawal"]
    Base["⛓️ Base Blockchain\nSepolia (exec) · Mainnet (rates)"]

    User -- "Quiz · Strategies · Dashboard\nHTTPS" --> Core
    Core -- "Agent SDK\nHTTPS" --> Anthropic
    Core -- "UserOperations\nHTTPS REST" --> Openfort
    Core -- "Supply / Withdraw USDC\nOn-chain" --> Aave
    Core -- "APY data · Transactions\nRPC / On-chain" --> Base
```

---

## Level 2 — Container

```mermaid
flowchart TB
    User(["👤 End User"])

    subgraph System["Openfort DeFi App"]
        Web["🌐 Web App\nNext.js 15 · React 19\nPort 3000"]
        API["⚙️ API Server\nNestJS 10 · MikroORM 6\nPort 3001"]
        Agent["🤖 Agent Server\nClaude Agent SDK · Node 20\nPort 3002"]
        DB[("🗄️ PostgreSQL\nPort 5432")]
        AaveMCP["🔌 Aave MCP Server\nNode.js HTTP\nPort 8080 · External"]
    end

    Anthropic["☁️ Anthropic API"]
    Openfort["☁️ Openfort Platform"]
    Base["⛓️ Base Blockchain"]

    User -- "HTTPS" --> Web
    Web -- "HTTP JSON" --> API
    API -- "TCP / ORM" --> DB
    API -- "HTTP JSON\nfire-and-forget" --> Agent
    Agent -- "HTTPS\nAgent SDK" --> Anthropic
    Agent -- "HTTP JSON\ntool calls" --> AaveMCP
    Agent -- "HTTPS REST" --> Openfort
    AaveMCP -- "RPC / On-chain" --> Base
    Openfort -- "On-chain\nUserOperations" --> Base
```

---

## Level 3 — Component

### Web App Components

```mermaid
flowchart LR
    API(["⚙️ API Server"])

    subgraph Web["Web App — Next.js 15"]
        direction TB
        ApiClient["API Client\nlib/api.ts"]

        subgraph Quiz["Quiz Flow"]
            QuizStepper["QuizStepper\nOrchestrates state"]
            QuestionCard["QuestionCard\nRender question"]
            ProgressBar["ProgressBar"]
            RiskResult["RiskResult\nScore & level"]
        end

        subgraph Strategies["Strategies"]
            StrategyCard["StrategyCard\nSummary card"]
            StrategyDetail["StrategyDetail\nAmount input · Start"]
        end

        subgraph Dashboard["Dashboard"]
            InvestmentSummary["InvestmentSummary\nAPY · Allocations"]
            AgentActions["AgentActions\nAgent log · Tx hashes"]
        end
    end

    QuizStepper --> QuestionCard
    QuizStepper --> ProgressBar
    QuizStepper --> RiskResult
    QuizStepper -- "fetchQuestions\nsubmitQuiz" --> ApiClient
    StrategyDetail -- "startInvesting\nswitchStrategy" --> ApiClient
    InvestmentSummary -- "fetchActiveInvestment" --> ApiClient
    AgentActions -- "fetchAgentActions" --> ApiClient
    ApiClient -- "HTTP REST" --> API
```

### API Server Components

```mermaid
flowchart TB
    Web(["🌐 Web App"])
    Agent(["🤖 Agent Server"])
    DB(["🗄️ PostgreSQL"])

    subgraph API["API Server — NestJS 10 · Hexagonal"]
        direction LR

        subgraph QuizMod["Quiz Module"]
            QCtrl["QuizController\nGET /quiz/questions\nPOST /quiz/submit"]
            GetQUC["GetQuizQuestionsUC"]
            SubmitUC["SubmitQuizUC\nScore → RiskLevel"]
            QRepo["QuizQuestionRepo"]
            RARepo["RiskAssessmentRepo"]
        end

        subgraph StratMod["Strategy Module"]
            SCtrl["StrategyController\nGET /strategies"]
            GetSUC["GetStrategiesUC"]
            SRepo["StrategyRepo"]
        end

        subgraph InvMod["Investment Module"]
            ICtrl["InvestmentController\nPOST /start · PATCH /switch\nGET /active · GET /:id/actions"]
            StartUC["StartInvestingUC"]
            SwitchUC["SwitchStrategyUC"]
            ExecUC["ExecuteInvestmentUC\nHTTP → Agent Server"]
            IRepo["InvestmentRepo"]
            AARepo["AgentActionRepo"]
        end
    end

    Web --> QCtrl & SCtrl & ICtrl
    QCtrl --> GetQUC --> QRepo
    QCtrl --> SubmitUC --> RARepo
    SCtrl --> GetSUC --> SRepo
    ICtrl --> StartUC --> IRepo
    ICtrl --> SwitchUC --> IRepo
    StartUC -. "async" .-> ExecUC
    SwitchUC -. "async" .-> ExecUC
    ExecUC -- "POST /execute\nPOST /rebalance" --> Agent
    ExecUC --> AARepo
    QRepo & RARepo & SRepo & IRepo & AARepo -- "MikroORM" --> DB
```

### Agent Server Components

```mermaid
flowchart TB
    API(["⚙️ API Server"])
    Anthropic(["☁️ Anthropic API"])
    AaveMCPServer(["🔌 Aave MCP :8080"])
    OpenfortPlatform(["☁️ Openfort Platform"])

    subgraph Agent["Agent Server — Node.js 20"]
        direction TB
        HTTPServer["HTTP Server\nserver.ts\nGET /health · POST /execute · POST /rebalance"]
        Executor["Agent Executor\nindex.ts\nexecuteInvestment() · rebalanceInvestment()"]
        Prompts["Agent Prompts\nagent-prompt.ts\nbuildAgentPrompt() · buildRebalancePrompt()"]
        AaveAdapter["Aave MCP Adapter\nmcp/aave-tools.ts\naave_get_reserves · get_gas_price · aave_stake"]
        OpenfortMCP["Openfort MCP Tools\nmcp/openfort-tools.ts\ncreate_transaction · get_balance"]
        Optimizer["AllocationOptimizer\ndomain/allocation-optimizer.ts\ncomputeAllocations()"]
    end

    API -- "POST /execute\nPOST /rebalance" --> HTTPServer
    HTTPServer --> Executor
    Executor --> Prompts
    Executor --> AaveAdapter
    Executor --> OpenfortMCP
    Executor --> Optimizer
    Executor -- "query() Agent SDK" --> Anthropic
    AaveAdapter -- "POST /mcp" --> AaveMCPServer
    OpenfortMCP -- "createTransactionIntent" --> OpenfortPlatform
```

---

## Level 4 — Code

### Domain Entities

```mermaid
classDiagram
    direction LR

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
        +RiskLevel riskLevel
        +number totalScore
        +Date completedAt
        +addAnswer(questionId, scoreWeight)
        +complete(totalQuestions, maxScore)
    }

    class InvestmentStrategy {
        +UUID id
        +string name
        +RiskLevel riskLevel
        +PoolAllocation[] poolAllocations
        +number expectedApyMin
        +number expectedApyMax
        +number rebalanceThreshold
        +matchesRiskLevel(level) bool
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
        +activate(strategyId)
        +deactivate()
    }

    class AgentAction {
        +UUID id
        +UUID investmentId
        +AgentActionType actionType
        +string asset
        +string amount
        +number gasCostUsd
        +number expectedApyBefore
        +number expectedApyAfter
        +AgentActionStatus status
        +string txHash
        +markExecuted(txHash)
        +markFailed(reason)
    }

    QuizQuestion "1" *-- "many" QuizOption
    RiskAssessment "1" *-- "many" QuizAnswer
    InvestmentStrategy "1" *-- "many" PoolAllocation
    UserInvestment "many" --> "1" InvestmentStrategy
    AgentAction "many" --> "1" UserInvestment
```

### Enums

```mermaid
flowchart LR
    subgraph RiskLevel
        C["CONSERVATIVE"]
        B["BALANCED"]
        G["GROWTH"]
    end

    subgraph InvestmentStatus
        A["ACTIVE"]
        I["INACTIVE"]
    end

    subgraph AgentActionType
        S["SUPPLY"]
        W["WITHDRAW"]
        R["REBALANCE"]
        RC["RATE_CHECK"]
    end

    subgraph AgentActionStatus
        P["PENDING"]
        E["EXECUTED"]
        F["FAILED"]
        SK["SKIPPED"]
    end
```

### AllocationOptimizer

```mermaid
flowchart LR
    subgraph Input["ComputeParams"]
        P1["poolAllocations[]"]
        P2["totalAmountUsd"]
        P3["currentRates Map"]
        P4["gasPrice"]
        P5["rebalanceThreshold"]
    end

    Opt["AllocationOptimizer\ncomputeAllocations()"]

    subgraph Output["AllocationDecision[]"]
        O1["pool: PoolAllocation"]
        O2["amountUsd"]
        O3["expectedApy"]
        O4["annualYieldUsd"]
        O5["shouldExecute: bool"]
        O6["rationale: string"]
    end

    Input --> Opt --> Output
```

### Investment Execution Sequence

```mermaid
sequenceDiagram
    actor User
    participant Web as Web App
    participant API as API Server
    participant Agent as Agent Server
    participant Claude as Anthropic (Claude)
    participant Aave as Aave MCP :8080
    participant Openfort as Openfort Platform
    participant Chain as Base Blockchain

    User->>Web: Start Investing (amount, strategyId)
    Web->>API: POST /investments/start
    API-->>Web: 201 { investmentId, status: active }

    Note over API,Agent: 🔄 Fire-and-forget async

    API->>Agent: POST /execute { investmentId, strategy, amount, wallet }
    Agent->>Claude: query(prompt + MCP servers)

    Claude->>Aave: aave_get_reserves()
    Aave->>Chain: Read Aave V3 reserves (Base Mainnet)
    Aave-->>Claude: APY data per pool

    Claude->>Aave: get_gas_price()
    Aave-->>Claude: gasPrice gwei + USD cost

    Note over Claude: AllocationOptimizer: skip if gas > annual yield

    Claude->>Openfort: openfort_create_transaction(supply USDC)
    Openfort->>Chain: Submit ERC-4337 UserOp (Base Sepolia)
    Chain-->>Openfort: txHash
    Openfort-->>Claude: { txHash, status: executed }

    Claude-->>Agent: JSON { actions[], totalAllocated, averageApy }
    Agent->>API: (parsed response)
    API->>API: Save AgentAction entities (EXECUTED + txHash)

    User->>Web: Open Dashboard
    Web->>API: GET /investments/active?userId=...
    API-->>Web: ActiveInvestment + last agent action
    Web->>API: GET /investments/:id/actions
    API-->>Web: AgentAction[] history
    Web-->>User: Dashboard: strategy · APY · agent log
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

> **Note:** The `CLAUDECODE` environment variable is unset before starting the agent server because the Claude CLI refuses to spawn child processes inside an existing Claude Code session. The agent server's `server.ts` also calls `delete process.env.CLAUDECODE` at
