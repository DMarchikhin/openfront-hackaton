# Tasks: Risk Quiz & Investment Strategies

**Input**: Design documents from `/specs/001-risk-quiz-strategies/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md

**Tests**: Domain entity unit tests included (user requested "unit test for domain not app layer").

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- All paths relative to repository root

## Path Conventions

- **Backend**: `apps/api/src/`
- **Frontend**: `apps/web/src/`
- **Backend tests**: `apps/api/test/unit/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Monorepo initialization with pnpm workspaces, NestJS backend, Next.js frontend

- [x] T001 Create monorepo root: pnpm-workspace.yaml defining `apps/*` workspaces, root package.json with `concurrently` devDependency and `"dev": "concurrently \"pnpm --filter api dev\" \"pnpm --filter web dev\""` script, root tsconfig.json with shared compiler options
- [x] T002 [P] Initialize NestJS app in apps/api/ — scaffold with @nestjs/cli, install @mikro-orm/core @mikro-orm/nestjs @mikro-orm/postgresql @mikro-orm/migrations uuid, configure tsconfig.json (emitDecoratorMetadata, experimentalDecorators), configure Jest in package.json, create .env.example with DATABASE_URL=postgresql://postgres:postgres@localhost:5432/openfort and PORT=3001
- [x] T003 [P] Initialize Next.js 15 app in apps/web/ with App Router, TypeScript, and Tailwind CSS — run create-next-app with --app --tailwind --typescript flags, set dev port to 3000, verify tailwind.config.ts content paths include ./src/**/*.tsx

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database connection, shared entities needed by seeder, frontend shell. MUST complete before any user story.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T004 Configure MikroORM PostgreSQL connection in apps/api/mikro-orm.config.ts (read DATABASE_URL from env, set type postgresql, enable autoLoadEntities, configure migrations path to src/database/migrations) and register MikroOrmModule.forRoot() in apps/api/src/app.module.ts with forRoutesConfig, enable shutdown hooks in apps/api/src/main.ts, set global prefix 'api' and CORS for localhost:3000
- [x] T005 [P] Create RiskLevel enum (conservative, balanced, growth) and InvestmentStatus enum (active, inactive) in apps/api/src/shared/enums.ts
- [x] T006 [P] Create QuizQuestion entity with @Entity decorator, fields: id (UUID PK), text (string), displayOrder (number, unique), options (embedded QuizOption[] — each with label:string and scoreWeight:number), createdAt (Date) in apps/api/src/modules/quiz/domain/quiz-question.entity.ts
- [x] T007 [P] Create InvestmentStrategy entity with @Entity decorator, fields per data-model.md (id, name, riskLevel using RiskLevel enum, description, poolAllocations as embedded PoolAllocation[], expectedApyMin, expectedApyMax, rebalanceThreshold, allowedChains as string[], createdAt), domain methods: matchesRiskLevel(level: RiskLevel): boolean and validateAllocations(): void (throws if percentages don't sum to 100) in apps/api/src/modules/strategy/domain/investment-strategy.entity.ts
- [x] T008 Generate initial database migration from QuizQuestion and InvestmentStrategy entities — run mikro-orm migration:create, verify migration file created in apps/api/src/database/migrations/
- [x] T009 Create database seeder in apps/api/src/database/seeders/initial-seed.ts — seed 5 quiz questions (e.g., "How would you feel if your balance dropped 10% temporarily?", "How long are you willing to leave your funds invested?", "Would you accept higher risk for potentially higher returns?", "How do you feel about your savings being spread across multiple networks?", "If a better rate appeared overnight, should we move your funds automatically?") and 3 strategies (Safe Harbor: 100% Ethereum 3-5% APY; Steady Growth: 60% Ethereum + 40% Base 5-8% APY; Max Yield: 40% Base + 40% Polygon + 20% Ethereum 7-12% APY) per data-model.md. Add seed script to apps/api/package.json
- [x] T010 [P] Create typed API client wrapper with GET/POST/PATCH methods and configurable baseUrl (default http://localhost:3001/api) in apps/web/src/lib/api.ts — export typed functions: fetchQuizQuestions(), submitQuiz(), fetchStrategies(), fetchStrategyById(), startInvesting(), switchStrategy(), fetchActiveInvestment()
- [x] T011 [P] Create reusable Button component (variants: primary/secondary/outline, sizes: sm/md/lg, disabled state, onClick handler) in apps/web/src/components/ui/Button.tsx and reusable Card component (props: title, children, highlighted:boolean, onClick) in apps/web/src/components/ui/Card.tsx
- [x] T012 Create root layout with Tailwind globals (clean sans-serif font, neutral background), app header with "Autopilot Savings" title and nav links (Home, Dashboard), responsive container in apps/web/src/app/layout.tsx. Create home page shell with app tagline and brief description in apps/web/src/app/page.tsx

**Checkpoint**: Foundation ready — database connected, entities defined, seeded, frontend shell live. User story implementation can begin.

---

## Phase 3: User Story 1 — Take Risk Assessment Quiz (Priority: P1) MVP

**Goal**: User completes a 5-question quiz and receives a risk profile (Conservative, Balanced, or Growth)

**Independent Test**: Open http://localhost:3000, navigate to /quiz, answer all 5 questions, verify risk profile is displayed with description and CTA to view strategies

### Tests for User Story 1

> **NOTE: Write tests FIRST, ensure they FAIL before implementing RiskAssessment entity**

- [x] T013 [P] [US1] Write unit tests for RiskAssessment entity in apps/api/test/unit/quiz/risk-assessment.entity.spec.ts — test cases: addAnswer() accumulates totalScore, addAnswer() throws on duplicate questionId, complete() calculates Conservative for 0-33% score range, complete() calculates Balanced for 34-66% score range, complete() calculates Growth for 67-100% score range, complete() throws if not all questions answered, getRiskLevel() throws if assessment not completed

### Implementation for User Story 1

- [x] T014 [US1] Create RiskAssessment entity with @Entity decorator, fields: id (UUID PK), userId (string), answers (embedded QuizAnswer[] — each with questionId:UUID and score:number), totalScore (number, default 0), riskLevel (RiskLevel enum, nullable), completedAt (Date, nullable). Domain methods: addAnswer(questionId, scoreWeight) — pushes answer and adds to totalScore, throws if questionId already in answers; complete(totalQuestions) — throws if answers.length !== totalQuestions, calculates riskLevel from totalScore percentage of max possible, sets completedAt; getRiskLevel() — returns riskLevel, throws if not completed. In apps/api/src/modules/quiz/domain/risk-assessment.entity.ts
- [x] T015 [P] [US1] Create QuizQuestionRepositoryPort interface (findAllOrdered(): Promise<QuizQuestion[]>) in apps/api/src/modules/quiz/domain/ports/quiz-question.repository.port.ts and MikroORM adapter implementation in apps/api/src/modules/quiz/infrastructure/quiz-question.repository.ts
- [x] T016 [P] [US1] Create RiskAssessmentRepositoryPort interface (save(assessment): Promise<void>, findByUserId(userId): Promise<RiskAssessment|null>) in apps/api/src/modules/quiz/domain/ports/risk-assessment.repository.port.ts and MikroORM adapter implementation in apps/api/src/modules/quiz/infrastructure/risk-assessment.repository.ts
- [x] T017 [US1] Implement GetQuizQuestions use case — injects QuizQuestionRepositoryPort, returns all questions ordered by displayOrder in apps/api/src/modules/quiz/application/get-quiz-questions.use-case.ts
- [x] T018 [US1] Implement SubmitQuiz use case — injects QuizQuestionRepositoryPort and RiskAssessmentRepositoryPort, creates RiskAssessment, iterates answers calling addAnswer(), calls complete(), persists, returns assessment with riskLevel and description in apps/api/src/modules/quiz/application/submit-quiz.use-case.ts
- [x] T019 [US1] Create QuizController with GET /quiz/questions (returns questions with options per contracts/api.md) and POST /quiz/submit (accepts userId + answers[], returns assessmentId, riskLevel, totalScore, maxPossibleScore, description) in apps/api/src/modules/quiz/infrastructure/quiz.controller.ts. Create QuizModule registering all providers (ports bound to adapters via useClass) in apps/api/src/modules/quiz/quiz.module.ts. Import QuizModule in AppModule.
- [x] T020 [P] [US1] Create QuestionCard component (displays question text, renders option buttons as selectable chips/cards, highlights selected option, calls onSelect callback) in apps/web/src/components/quiz/QuestionCard.tsx
- [x] T021 [P] [US1] Create ProgressBar component (props: currentStep, totalSteps — renders visual step indicator with filled/unfilled dots or bar) in apps/web/src/components/quiz/ProgressBar.tsx
- [x] T022 [P] [US1] Create RiskResult component (props: riskLevel, description, score — displays profile label with color coding, description text, and "View Strategies" CTA button linking to /strategies?riskLevel={level}) in apps/web/src/components/quiz/RiskResult.tsx
- [x] T023 [US1] Create QuizStepper component (manages quiz state: current question index, selected answers; fetches questions from API on mount; advances through questions on selection; submits answers on final question; shows RiskResult on completion) in apps/web/src/components/quiz/QuizStepper.tsx
- [x] T024 [US1] Create quiz page at apps/web/src/app/quiz/page.tsx rendering QuizStepper. Update home page at apps/web/src/app/page.tsx to add "Take the Quiz" CTA button linking to /quiz with inviting copy about discovering your investment personality.

**Checkpoint**: Quiz flow works end-to-end. User can complete quiz and see risk profile. MVP demoable.

---

## Phase 4: User Story 2 — View Recommended Strategies (Priority: P2)

**Goal**: User sees investment strategy cards matched to their risk profile with pool allocation details

**Independent Test**: Complete quiz, click "View Strategies", verify 3 strategy cards displayed with the matching one highlighted, click a card to see pool allocation breakdown

### Tests for User Story 2

- [x] T025 [P] [US2] Write unit tests for InvestmentStrategy entity in apps/api/test/unit/strategy/investment-strategy.entity.spec.ts — test cases: matchesRiskLevel() returns true for matching level, matchesRiskLevel() returns false for non-matching level, validateAllocations() passes when percentages sum to 100, validateAllocations() throws when percentages don't sum to 100

### Implementation for User Story 2

- [x] T026 [US2] Create StrategyRepositoryPort interface (findAll(): Promise<InvestmentStrategy[]>, findByRiskLevel(level): Promise<InvestmentStrategy[]>, findById(id): Promise<InvestmentStrategy|null>) in apps/api/src/modules/strategy/domain/ports/strategy.repository.port.ts and MikroORM adapter implementation in apps/api/src/modules/strategy/infrastructure/strategy.repository.ts
- [x] T027 [US2] Implement GetStrategies use case — injects StrategyRepositoryPort, returns all strategies optionally filtered by riskLevel query param in apps/api/src/modules/strategy/application/get-strategies.use-case.ts
- [x] T028 [US2] Create StrategyController with GET /strategies (optional ?riskLevel filter) and GET /strategies/:id endpoints per contracts/api.md in apps/api/src/modules/strategy/infrastructure/strategy.controller.ts. Create StrategyModule registering providers. Import in AppModule.
- [x] T029 [P] [US2] Create StrategyCard component (props: strategy object, isRecommended:boolean — displays name, risk level badge with color, APY range, chain icons/tags, highlighted border if recommended, onClick) in apps/web/src/components/strategy/StrategyCard.tsx
- [x] T030 [P] [US2] Create StrategyDetail component (props: strategy object — displays full pool allocation breakdown as percentage bars or list, allowed chains, rebalance threshold, explanation text for risk level match) in apps/web/src/components/strategy/StrategyDetail.tsx
- [x] T031 [US2] Create strategies page at apps/web/src/app/strategies/page.tsx — reads ?riskLevel from URL params, fetches all strategies from API, renders StrategyCard grid with recommended one highlighted, clicking a card expands/shows StrategyDetail below or in modal

**Checkpoint**: Users can view and explore all strategies after quiz. Quiz → Strategies flow works end-to-end.

---

## Phase 5: User Story 3 — Select Strategy & Start Investing (Priority: P3)

**Goal**: User selects a strategy, confirms, and the system creates an active investment. Dashboard shows live investment status.

**Independent Test**: On strategies page, click "Start Investing" on a strategy card, confirm in modal, verify redirect to /dashboard showing active strategy name, APY, and status

### Tests for User Story 3

- [x] T032 [P] [US3] Write unit tests for UserInvestment entity in apps/api/test/unit/investment/user-investment.entity.spec.ts — test cases: activate() sets status to active and records activatedAt, activate() throws if already active, deactivate() sets status to inactive and records deactivatedAt, deactivate() throws if already inactive, static create() factory returns new active investment

### Implementation for User Story 3

- [x] T033 [US3] Create UserInvestment entity with @Entity decorator, fields: id (UUID PK), userId (string), strategyId (UUID), status (InvestmentStatus enum), activatedAt (Date), deactivatedAt (Date|null). Domain methods: static create(userId, strategyId) factory that returns activated instance; activate(strategyId) sets active + timestamp, throws if already active; deactivate() sets inactive + timestamp, throws if already inactive. In apps/api/src/modules/investment/domain/user-investment.entity.ts
- [x] T034 [US3] Create InvestmentRepositoryPort interface (save(investment): Promise<void>, findActiveByUserId(userId): Promise<UserInvestment|null>) in apps/api/src/modules/investment/domain/ports/investment.repository.port.ts and MikroORM adapter implementation in apps/api/src/modules/investment/infrastructure/investment.repository.ts
- [x] T035 [US3] Implement StartInvesting use case — injects InvestmentRepositoryPort and StrategyRepositoryPort, validates strategy exists, checks user has no active investment (throws 400 if so), creates UserInvestment via factory, persists, returns investment with strategy details in apps/api/src/modules/investment/application/start-investing.use-case.ts
- [x] T036 [US3] Create InvestmentController with POST /investments/start and GET /investments/active?userId= endpoints per contracts/api.md in apps/api/src/modules/investment/infrastructure/investment.controller.ts. Create InvestmentModule registering providers, importing StrategyModule for repository access. Import in AppModule.
- [x] T037 [US3] Add "Start Investing" button to each StrategyCard on strategies page, wire up confirmation dialog (shows strategy name, expected APY range, confirm/cancel buttons), on confirm call startInvesting API and redirect to /dashboard in apps/web/src/app/strategies/page.tsx
- [x] T038 [US3] Create InvestmentSummary component (props: investment + strategy objects — displays active strategy name, risk level badge, expected APY range, pool allocation summary, activation date, simulated daily earnings estimate) in apps/web/src/components/dashboard/InvestmentSummary.tsx
- [x] T039 [US3] Create dashboard page at apps/web/src/app/dashboard/page.tsx — fetches active investment from API (GET /investments/active), renders InvestmentSummary if active, shows "No active investment — take the quiz" CTA if none

**Checkpoint**: Full flow works: Quiz → Strategies → Start Investing → Dashboard. Core product is demoable.

---

## Phase 6: User Story 4 — Change Strategy (Priority: P4)

**Goal**: User can switch to a different strategy from the dashboard, triggering fund reallocation

**Independent Test**: On dashboard with active investment, click "Change Strategy", select new strategy, confirm switch, verify dashboard updates with new strategy details

### Implementation for User Story 4

- [x] T040 [US4] Implement SwitchStrategy use case — injects InvestmentRepositoryPort and StrategyRepositoryPort, validates new strategy exists and differs from current, deactivates current UserInvestment, creates new active UserInvestment, persists both, returns old and new strategy details in apps/api/src/modules/investment/application/switch-strategy.use-case.ts
- [x] T041 [US4] Add PATCH /investments/switch endpoint (accepts userId + newStrategyId, returns previous and new strategy names per contracts/api.md) to InvestmentController in apps/api/src/modules/investment/infrastructure/investment.controller.ts. Register SwitchStrategy use case in InvestmentModule.
- [x] T042 [US4] Add "Change Strategy" button to dashboard page — on click, navigates to /strategies with current riskLevel pre-selected in apps/web/src/app/dashboard/page.tsx
- [x] T043 [US4] Update strategies page to detect active investment state — if user already has an active investment, show "Switch to this Strategy" instead of "Start Investing", call switchStrategy API on confirm, show comparison (old vs new APY), redirect to dashboard on success in apps/web/src/app/strategies/page.tsx

**Checkpoint**: All 4 user stories work independently and together. Full product flow complete.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: UX refinement and validation across all stories

- [x] T044 [P] Add loading spinners on quiz page (while fetching questions), strategies page (while loading strategies), and dashboard page (while fetching active investment) in apps/web/src/app/quiz/page.tsx, apps/web/src/app/strategies/page.tsx, apps/web/src/app/dashboard/page.tsx
- [x] T045 [P] Add error handling on all API calls — show user-friendly error messages in plain English (no technical details) with retry buttons where applicable, in apps/web/src/lib/api.ts and each page component
- [x] T046 [P] Add input validation DTOs using class-validator (@IsUUID, @IsString, @IsArray, @IsNotEmpty) on QuizController submit body and InvestmentController start/switch bodies in apps/api/src/modules/*/infrastructure/*.controller.ts
- [x] T047 Polish Tailwind styling across all pages — consistent color palette (green for growth, blue for balanced, gray for conservative), clean card shadows, responsive layout on mobile viewports, smooth transitions between quiz questions
- [x] T048 Run quickstart.md validation — start fresh (pnpm install, docker DB, migration, seed, pnpm dev), walk through complete flow: home → quiz → result → strategies → start investing → dashboard → change strategy. Verify all checkpoints pass.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **US1 Quiz (Phase 3)**: Depends on Phase 2 — No dependencies on other stories
- **US2 Strategies (Phase 4)**: Depends on Phase 2 — No dependencies on US1 (strategies page works standalone)
- **US3 Start Investing (Phase 5)**: Depends on Phase 2 — Integrates with US2 strategies page for "Start Investing" button
- **US4 Change Strategy (Phase 6)**: Depends on Phase 5 (needs active investment to switch)
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: Independent — can start after Phase 2
- **US2 (P2)**: Independent — can start after Phase 2, can run in parallel with US1
- **US3 (P3)**: Depends on US2 strategies page existing (adds "Start Investing" button to it)
- **US4 (P4)**: Depends on US3 (needs investment infrastructure to switch strategies)

### Within Each User Story

- Tests MUST be written and FAIL before entity implementation
- Entities before ports
- Ports before use cases
- Use cases before controllers
- Backend before frontend pages
- Components before pages that compose them

### Parallel Opportunities

- T002 + T003: Backend and frontend init in parallel
- T005 + T006 + T007: Enums and entities in parallel (different files)
- T010 + T011: Frontend components and layout in parallel
- T015 + T016: Quiz repository ports in parallel
- T020 + T021 + T022: Quiz frontend components in parallel
- T029 + T030: Strategy frontend components in parallel
- US1 + US2: Can run in parallel after Phase 2 (different modules, different pages)
- T044 + T045 + T046: All polish tasks in parallel

---

## Parallel Example: User Story 1

```bash
# Tests first (write and verify they fail):
Task T013: "Unit tests for RiskAssessment entity"

# Then entity implementation to make tests pass:
Task T014: "RiskAssessment entity with domain logic"

# Then ports + repos in parallel (different files):
Task T015: "QuizQuestion repository port + adapter"
Task T016: "RiskAssessment repository port + adapter"

# Then use cases sequentially (depend on ports):
Task T017: "GetQuizQuestions use case"
Task T018: "SubmitQuiz use case"

# Then controller (depends on use cases):
Task T019: "QuizController + QuizModule"

# Then frontend components in parallel:
Task T020: "QuestionCard component"
Task T021: "ProgressBar component"
Task T022: "RiskResult component"

# Then orchestrator + page (depend on components):
Task T023: "QuizStepper component"
Task T024: "Quiz page + home page CTA"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (Quiz)
4. **STOP and VALIDATE**: Take quiz, get risk profile, verify it works
5. Demo-ready with quiz alone

### Incremental Delivery

1. Setup + Foundational → Foundation running
2. US1 Quiz → Quiz works → Demo checkpoint
3. US2 Strategies → Browse strategies → Demo checkpoint
4. US3 Start Investing → Full invest flow → Demo checkpoint
5. US4 Change Strategy → Strategy switching → Demo checkpoint
6. Polish → Production-ready UX

### Parallel Team Strategy

With 2 developers after Phase 2:

- **Developer A**: US1 (quiz backend + frontend) → US3 (investment backend)
- **Developer B**: US2 (strategy backend + frontend) → US3 (investment frontend) → US4

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Domain tests (T013, T025, T032) MUST be written before entity implementation
- All API responses must match contracts/api.md shapes exactly
- Frontend must use plain language only — no DeFi jargon (constitution principle II)
- Commit after each completed task or logical group

---
---

# Phase 2: Investment Agent (Claude Agent SDK + MCP)

**Input**: Phase 2 design documents from `/specs/001-risk-quiz-strategies/` (plan.md, research.md R11-R15, contracts/agent.md, data-model.md AgentAction entity)
**Prerequisites**: All Phase 1 tasks (T001-T048) completed ✅

**Tests**: Domain unit tests for allocation optimizer (user requested "unit test for domain not app layer").

**Organization**: Tasks grouped into agent-specific user stories. US5 = Agent executes investment, US6 = Agent switches strategy, US7 = Dashboard shows agent actions.

## Path Conventions (Phase 2)

- **Agent app**: `apps/agent/src/`
- **Backend (existing)**: `apps/api/src/`
- **Frontend (existing)**: `apps/web/src/`
- **Agent tests**: `apps/agent/src/test/`

---

## Phase 8: Agent Setup

**Purpose**: Scaffold `apps/agent` workspace app with Claude Agent SDK, Openfort SDK, TypeScript config, and environment setup.

- [x] T049 Create apps/agent/ directory with package.json (name: "agent", dependencies: @anthropic-ai/claude-agent-sdk, @openfort/openfort-node, zod, dotenv; devDependencies: typescript, ts-node, @types/node, jest, ts-jest, @types/jest), tsconfig.json (extends root, target ES2022, module NodeNext, moduleResolution NodeNext, outDir dist, rootDir src, strict true, esModuleInterop true, resolveJsonModule true), and Jest config in package.json (transform ts-jest, testRegex .spec.ts$, testEnvironment node)
- [x] T050 [P] Create apps/agent/.env.example with ANTHROPIC_API_KEY, OPENFORT_API_KEY, OPENFORT_PROJECT_ID, AAVE_MCP_URL=http://localhost:8080/mcp/sse, API_BASE_URL=http://localhost:3001/api, CHAIN_ID=84532, NODE_ENV=development
- [x] T051 [P] Add agent scripts to root package.json: "dev:agent": "pnpm --filter agent start", "dev:all": "concurrently \"pnpm --filter api dev\" \"pnpm --filter web dev\" \"pnpm --filter agent start\"". Add "start": "ts-node src/index.ts" and "test": "jest" scripts to apps/agent/package.json
- [x] T052 Run pnpm install from root to resolve new workspace dependencies

**Checkpoint**: `apps/agent` workspace is initialized, compiles cleanly, and recognized by pnpm workspaces.

---

## Phase 9: Agent Foundational (Blocking Prerequisites)

**Purpose**: AgentAction entity, custom Openfort MCP tools, allocation optimizer domain logic. MUST complete before agent user stories.

**CRITICAL**: No agent user story work can begin until this phase is complete.

### Tests for Agent Domain

> **NOTE: Write tests FIRST, ensure they FAIL before implementing allocation-optimizer**

- [x] T053 [P] Write unit tests for AllocationOptimizer in apps/agent/src/test/allocation-optimizer.spec.ts — test cases: computeAllocations() returns correct USDC amounts given strategy allocations and total amount (e.g., $1000 with 60/40 split → $600/$400), computeAllocations() skips pools where gas cost exceeds projected annual yield improvement, computeAllocations() returns empty array when all pools fail cost-benefit check, computeAllocations() respects rebalanceThreshold (skip if APY difference below threshold), computeAllocations() handles single-pool strategy (100% allocation)

### Entity & Infrastructure

- [x] T054 [P] Create AgentAction entity with @Entity decorator in apps/api/src/modules/investment/domain/agent-action.entity.ts — fields per data-model.md: id (UUID PK), investmentId (UUID), userId (string), actionType (enum: supply, withdraw, rebalance, rate_check), strategyId (UUID), chain (string), protocol (string), asset (string), amount (string), gasCostUsd (number|null), expectedApyBefore (number|null), expectedApyAfter (number|null), rationale (string, max 1000), status (enum: pending, executed, failed, skipped), txHash (string|null), executedAt (Date). Domain methods: static create(...) factory, markExecuted(txHash), markFailed(reason), markSkipped(reason). Add AgentActionStatus enum to apps/api/src/shared/enums.ts
- [x] T055 Create AgentActionRepositoryPort interface (save(action): Promise<void>, findByInvestmentId(investmentId): Promise<AgentAction[]>) in apps/api/src/modules/investment/domain/ports/agent-action.repository.port.ts and MikroORM adapter in apps/api/src/modules/investment/infrastructure/agent-action.repository.ts. Register in InvestmentModule providers.
- [x] T056 Generate database migration for AgentAction entity — run mikro-orm migration:create from apps/api/, verify migration file in apps/api/src/database/migrations/
- [x] T057 Implement AllocationOptimizer pure domain class in apps/agent/src/domain/allocation-optimizer.ts — method computeAllocations(params: { poolAllocations: PoolAllocation[], totalAmountUsd: number, currentRates: Map<string, number>, gasPrice: number, rebalanceThreshold: number }): AllocationDecision[] — for each pool: calculates dollar amount from percentage, estimates annual yield, estimates gas cost for supply tx, applies cost-benefit check (projected yield improvement must exceed gas cost by configurable minimum), returns array of { pool, amountUsd, expectedApy, gasCostUsd, shouldExecute: boolean, rationale: string }
- [x] T058 [P] Create custom in-process Openfort MCP tools in apps/agent/src/mcp/openfort-tools.ts — using createSdkMcpServer() and tool() from @anthropic-ai/claude-agent-sdk with Zod schemas. Tools: openfort_create_transaction (params: chainId, contractAddress, functionName, functionArgs, policyId → calls Openfort SDK transactionIntents.create()), openfort_get_balance (params: accountAddress, chainId → returns token balances), openfort_simulate_transaction (params: same as create → calls Openfort SDK simulation endpoint). Each tool wraps @openfort/openfort-node SDK calls. Configure Openfort client with OPENFORT_API_KEY from env.
- [x] T059 [P] Create agent system prompt in apps/agent/src/agent-prompt.ts — export function buildAgentPrompt(context: InvestmentContext): string. The prompt instructs Claude to: (1) analyze the strategy's pool allocations, (2) check current Aave rates for each pool using aave_get_reserves tool, (3) check gas prices using get_gas_price tool, (4) run cost-benefit analysis for each allocation, (5) execute supply transactions via openfort_create_transaction for allocations that pass, (6) skip allocations where gas exceeds yield, (7) return structured JSON with all actions and rationale. Include constitution constraints: only whitelisted contracts, respect allocation percentages, prioritize capital preservation over yield.

**Checkpoint**: Agent domain logic tested, entity created, MCP tools defined, prompt ready. Agent stories can now begin.

---

## Phase 10: User Story 5 — Agent Executes Investment (extends US3)

**Goal**: When a user starts investing, the agent autonomously allocates funds to Aave pools based on strategy parameters, live rates, and gas costs.

**Independent Test**: Start investing with a strategy, verify agent executes supply transactions via MCP tools, verify AgentAction records are created with rationale, verify actions appear in API response.

- [x] T060 [US5] Create agent entry point in apps/agent/src/index.ts — export async function executeInvestment(params: { investmentId, userId, strategy, userAmount, walletAddress }): Promise<AgentResult>. Implementation: (1) build prompt with strategy context via buildAgentPrompt(), (2) configure MCP servers: Aave MCP via SSE at AAVE_MCP_URL, custom Openfort tools in-process, (3) call query() from @anthropic-ai/claude-agent-sdk with prompt, mcpServers config, allowedTools list (mcp__aave__aave_get_reserves, mcp__aave__get_gas_price, mcp__aave__aave_stake, mcp__openfort__openfort_create_transaction, mcp__openfort__openfort_simulate_transaction), permissionMode: "bypassPermissions", maxTurns: 10, (4) collect agent messages and extract structured result, (5) return AgentResult with actions array
- [x] T061 [US5] Add POST /investments/execute endpoint to InvestmentController in apps/api/src/modules/investment/infrastructure/investment.controller.ts — accepts { investmentId, userAmount } body with class-validator DTOs, validates investment exists and is active, fetches strategy, calls agent executeInvestment() (import from apps/agent or trigger via HTTP), saves AgentAction records to database via AgentActionRepositoryPort, returns 202 Accepted with { investmentId, status: "executing", message }
- [x] T062 [US5] Add GET /investments/:investmentId/actions endpoint to InvestmentController in apps/api/src/modules/investment/infrastructure/investment.controller.ts — fetches AgentAction records by investmentId via AgentActionRepositoryPort, returns array of actions with all fields per contracts/agent.md
- [x] T063 [US5] Wire agent trigger into StartInvesting use case in apps/api/src/modules/investment/application/start-investing.use-case.ts — after creating UserInvestment, trigger agent execution (fire-and-forget async call to executeInvestment) passing investment details and strategy. Update the use case response to include a message indicating the agent is processing.
- [x] T064 [US5] Add executeInvestment() and fetchAgentActions() functions to frontend API client in apps/web/src/lib/api.ts — executeInvestment(investmentId, userAmount): POST /investments/execute, fetchAgentActions(investmentId): GET /investments/{id}/actions. Add AgentAction type definition.

**Checkpoint**: Starting an investment triggers the agent, which queries Aave rates, applies cost-benefit analysis, executes supply via Openfort, and logs all decisions.

---

## Phase 11: User Story 6 — Agent Handles Strategy Switch (extends US4)

**Goal**: When a user switches strategy, the agent withdraws from old pools and reallocates to new pools per the new strategy's parameters.

**Independent Test**: Switch from one strategy to another, verify agent withdraws from old pools and supplies to new pools, verify AgentAction records show both withdraw and supply actions with rationale.

- [x] T065 [US6] Add rebalance mode to agent prompt in apps/agent/src/agent-prompt.ts — export function buildRebalancePrompt(context: RebalanceContext): string. Context includes: previousStrategy (with pool allocations), newStrategy (with pool allocations), currentPositions. Prompt instructs Claude to: (1) check current positions via aave_get_user_positions, (2) withdraw from pools not in new strategy, (3) supply to new pools per new allocation percentages, (4) skip moves where gas cost exceeds benefit (constitution principle III), (5) return structured JSON with all actions.
- [x] T066 [US6] Add rebalanceInvestment() function to apps/agent/src/index.ts — similar to executeInvestment but uses buildRebalancePrompt(), includes both withdraw and supply tool permissions (mcp__aave__aave_withdraw added to allowedTools)
- [x] T067 [US6] Wire agent trigger into SwitchStrategy use case in apps/api/src/modules/investment/application/switch-strategy.use-case.ts — after switching investment records, trigger agent rebalanceInvestment() (fire-and-forget async) passing old strategy, new strategy, and user wallet. Save AgentAction records for both withdraw and supply operations.

**Checkpoint**: Strategy switching triggers intelligent rebalancing — agent withdraws from old pools, supplies to new pools, skips moves where gas exceeds benefit.

---

## Phase 12: User Story 7 — Dashboard Shows Agent Actions

**Goal**: User sees a log of all agent actions on their dashboard, including rationale for each decision.

**Independent Test**: After agent executes, navigate to dashboard, verify agent action log shows each action (supply/withdraw/skip) with amount, pool, APY, gas cost, and plain-English rationale.

- [x] T068 [P] [US7] Create AgentActions component in apps/web/src/components/dashboard/AgentActions.tsx — props: actions: AgentAction[]. Renders a timeline/list of agent actions with: icon per actionType (supply ↗, withdraw ↙, skip ⏸), pool name (protocol + chain), amount, expected APY, gas cost, status badge (executed/skipped/failed with color coding), rationale text in plain English, timestamp. Empty state: "Your agent hasn't taken any actions yet."
- [x] T069 [US7] Update dashboard page at apps/web/src/app/dashboard/page.tsx — after InvestmentSummary, fetch agent actions via fetchAgentActions(investmentId), render AgentActions component below the summary. Add "Agent Activity" section header. Show loading state while fetching actions.
- [x] T070 [US7] Add "Investing..." status indicator to dashboard — when investment status is active but no agent actions exist yet, show a pulsing indicator with "Agent is analyzing pools and optimizing your allocation..." message in apps/web/src/components/dashboard/InvestmentSummary.tsx

**Checkpoint**: Dashboard shows full transparency of agent decisions — users can see exactly what the agent did and why (constitution principle IV).

---

## Phase 13: Polish & Validation

**Purpose**: End-to-end validation, error handling, and polish across agent features

- [x] T071 [P] Add error handling to agent execution — wrap query() call in try/catch in apps/agent/src/index.ts, on failure create AgentAction with status "failed" and error rationale, ensure partial results are still saved. Add timeout (30 seconds) to agent execution.
- [x] T072 [P] Add ANTHROPIC_API_KEY validation on agent startup in apps/agent/src/index.ts — throw clear error if missing. Add Openfort API key validation in apps/agent/src/mcp/openfort-tools.ts. Log MCP server connection status on init.
- [x] T073 [P] Add agent action status summary to GET /investments/active response in apps/api/src/modules/investment/infrastructure/investment.controller.ts — include lastAgentAction: { actionType, status, executedAt } and totalActions count alongside existing fields
- [ ] T074 Run full end-to-end validation — start all services (API, Web, Agent, Aave MCP), walk through: home → quiz → result → strategies → start investing → verify agent executes → dashboard shows summary + agent actions → change strategy → verify agent rebalances → dashboard updates. Verify all constitution principles are met (security: policy-enforced txs, transparency: rationale visible, autonomy: cost-benefit checks applied).

---

## Dependencies & Execution Order (Phase 2)

### Phase Dependencies

- **Agent Setup (Phase 8)**: Depends on Phase 1-7 being complete ✅ — start immediately
- **Agent Foundational (Phase 9)**: Depends on Phase 8 — BLOCKS all agent user stories
- **US5 Execute Investment (Phase 10)**: Depends on Phase 9 — core agent capability
- **US6 Switch Strategy (Phase 11)**: Depends on Phase 10 (reuses agent infrastructure)
- **US7 Dashboard Actions (Phase 12)**: Depends on Phase 10 (needs agent actions API)
- **Polish (Phase 13)**: Depends on all agent phases complete

### User Story Dependencies (Phase 2)

- **US5 (Execute)**: Depends on Phase 9 — core agent flow, must complete first
- **US6 (Rebalance)**: Depends on US5 — extends agent with rebalance mode
- **US7 (Dashboard)**: Depends on US5 — needs agent actions endpoint. Can run in parallel with US6.

### Within Agent Phases

- Tests (T053) MUST be written and FAIL before optimizer implementation (T057)
- Entity (T054) before repository port (T055) before migration (T056)
- MCP tools (T058) and prompt (T059) before agent entry point (T060)
- Agent entry point (T060) before API endpoint wiring (T061-T063)
- API endpoints before frontend integration (T064, T068-T070)

### Parallel Opportunities (Phase 2)

- T050 + T051: Env config and scripts in parallel
- T053 + T054: Tests and entity in parallel (different apps)
- T058 + T059: MCP tools and prompt in parallel (different files)
- T068 (AgentActions component) can start once T062 (GET actions endpoint) is complete
- US6 + US7: Can run in parallel after US5 is complete
- T071 + T072 + T073: All polish tasks in parallel

---

## Parallel Example: Agent Core (US5)

```bash
# Tests first (write and verify they fail):
Task T053: "Unit tests for AllocationOptimizer"

# Entity + migration (different app from tests):
Task T054: "AgentAction entity"
Task T055: "AgentAction repository port + adapter"
Task T056: "Database migration for AgentAction"

# Optimizer implementation (makes tests pass):
Task T057: "AllocationOptimizer domain logic"

# MCP tools + prompt in parallel:
Task T058: "Custom Openfort MCP tools"
Task T059: "Agent system prompt"

# Agent entry point (depends on tools + prompt):
Task T060: "Agent entry point with query()"

# API wiring (depends on entry point):
Task T061: "POST /investments/execute endpoint"
Task T062: "GET /investments/:id/actions endpoint"
Task T063: "Wire agent into StartInvesting use case"

# Frontend (depends on API endpoints):
Task T064: "Frontend API client for agent"
```

---

## Implementation Strategy (Phase 2)

### MVP First (US5 Only)

1. Complete Phase 8: Agent Setup
2. Complete Phase 9: Agent Foundational (CRITICAL — domain logic + MCP tools)
3. Complete Phase 10: US5 — Agent Executes Investment
4. **STOP and VALIDATE**: Start investing, verify agent queries rates, executes supply, logs actions
5. Agent MVP demoable with single investment flow

### Incremental Delivery

1. Agent Setup → apps/agent compiles
2. Agent Foundational → domain logic tested, MCP tools ready
3. US5 Execute → Agent runs on investment start → Demo checkpoint
4. US6 Rebalance → Agent handles strategy switch → Demo checkpoint
5. US7 Dashboard → Agent actions visible to user → Demo checkpoint
6. Polish → Error handling, validation, full E2E test

---

# Phase 3: Portfolio Dashboard & Wallet Balance

**Context**: US1-US7 (quiz, strategies, agent, dashboard) are all implemented. The following tasks add: (1) a portfolio API that reads on-chain aToken/USDC balances, (2) a wallet balance summary card on the dashboard, and (3) pool position cards with per-pool transaction history.

**Spec references**: User Story 5 (Wallet Balance), FR-011 through FR-014, SC-007 through SC-009
**Plan reference**: plan.md — Portfolio Dashboard architecture

---

## Phase 14: Portfolio Backend API (Foundational)

**Purpose**: New API endpoint that reads on-chain balances + aggregates AgentAction records per pool. MUST complete before any portfolio frontend work.

- [x] T075 Add `viem` dependency to apps/api/ — run `pnpm add viem` from apps/api/. This enables on-chain balance reads (aToken + USDC) directly from the NestJS API without routing through the agent.

- [x] T076 Create GetPortfolioUseCase in apps/api/src/modules/investment/application/get-portfolio.use-case.ts — inject InvestmentRepositoryPort, AgentActionRepositoryPort, StrategyRepositoryPort. Implement `execute(userId: string): Promise<PortfolioResponse>`:
  1. Find active UserInvestment via investmentRepo.findActiveByUserId(userId). Return 404 response if none.
  2. Load strategy via strategyRepo.findById(investment.strategyId).
  3. Load all AgentAction records via agentActionRepo.findByInvestmentId(investment.id).
  4. Create viem publicClient with baseSepolia chain + http(BASE_SEPOLIA_RPC_URL) transport.
  5. Read USDC wallet balance: `publicClient.readContract({ address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', abi: parseAbi(['function balanceOf(address) view returns (uint256)']), functionName: 'balanceOf', args: [OPENFORT_SMART_ACCOUNT_ADDRESS] })` → divide by 1e6 for USD.
  6. Read aToken (aUSDC) balance: same pattern with address `0xf53B60F4006cab2b3C4688ce41fD5362427A2A66` → divide by 1e6 for USD.
  7. Group AgentAction records by unique (chain, protocol, asset) tuple. For each pool:
     - totalSupplied = SUM(amount) where actionType='supply' and status='executed'
     - totalWithdrawn = SUM(amount) where actionType='withdraw' and status='executed'
     - netInvested = totalSupplied - totalWithdrawn
     - earnedYield = onChainBalance - netInvested
     - latestApy = most recent action with non-null expectedApyAfter
     - allocationPercent from strategy poolAllocations
     - actions = all actions for this pool as PoolAction[], ordered by executedAt DESC
  8. Build PortfolioResponse: investmentId, strategyName, riskLevel, totalValueUsd (USDC wallet + aToken balances), totalInvestedUsd (sum of netInvested across pools), totalEarnedUsd (totalValue - totalInvested), walletBalanceUsd (uninvested USDC), investedBalanceUsd (sum of aToken balances), smartAccountAddress, pools[].
  9. Wrap on-chain reads in try/catch — return error response on RPC failure.

- [x] T077 Add GET /api/investments/portfolio endpoint to apps/api/src/modules/investment/infrastructure/investment.controller.ts — accept `userId` query param, call GetPortfolioUseCase.execute(userId), return PortfolioResponse as JSON. Return 404 if no active investment. Return 500 with `{ error: "Failed to read on-chain balance" }` on RPC failure. Register GetPortfolioUseCase in InvestmentModule providers.

- [x] T078 Add fetchPortfolio() function and PortfolioResponse types to apps/web/src/lib/api.ts — types: PortfolioResponse { investmentId, strategyName, riskLevel, totalValueUsd, totalInvestedUsd, totalEarnedUsd, walletBalanceUsd, investedBalanceUsd, smartAccountAddress, pools: PoolPosition[] }, PoolPosition { pool: { chain, protocol, asset }, onChainBalanceUsd, totalSuppliedUsd, totalWithdrawnUsd, netInvestedUsd, earnedYieldUsd, latestApyPercent, allocationPercent, actions: PoolAction[] }, PoolAction { id, actionType, amountUsd, expectedApyAfter, status, txHash, rationale, executedAt }. Function: `fetchPortfolio(userId: string): Promise<PortfolioResponse>` — GET /investments/portfolio?userId=...

**Checkpoint**: Portfolio API endpoint functional — `curl http://localhost:3001/api/investments/portfolio?userId=USER_ID` returns full portfolio with on-chain balances.

---

## Phase 15: US8 — Wallet Balance Card on Dashboard

**Goal**: Show a financial summary card at the top of the dashboard with available USDC (wallet), invested USDC (in pools), and total account value. Copyable wallet address. Zero-balance funding prompt.

**Independent Test**: Open dashboard → verify the three balance values (available, invested, total) match on-chain data. Copy wallet address → verify it matches the smart account address.

### Implementation for US8

- [x] T079 [US8] Create WalletSummary component in apps/web/src/components/dashboard/WalletSummary.tsx — props: `{ walletBalanceUsd: number, investedBalanceUsd: number, totalValueUsd: number, smartAccountAddress: string }`. Renders a card with three metric tiles:
  1. "Available" — walletBalanceUsd formatted as $X.XX
  2. "Invested" — investedBalanceUsd formatted as $X.XX
  3. "Total Value" — totalValueUsd formatted as $X.XX (larger font, highlighted)
  Display smartAccountAddress below the metrics in a truncated format (0x1234...5678) with a copy button. Use navigator.clipboard.writeText() on click, show "Copied!" toast for 2 seconds.
  Style: Tailwind card with gradient or accent border for visual prominence.

- [x] T080 [US8] Add zero-balance state to WalletSummary in apps/web/src/components/dashboard/WalletSummary.tsx — when totalValueUsd === 0, show: "$0.00 Total Value" with a message "Fund your wallet to start investing" and the full smart account address displayed prominently with a copy button. Style the zero state with a muted/dashed border and a call-to-action style.

- [x] T081 [US8] Integrate WalletSummary into dashboard page at apps/web/src/app/dashboard/page.tsx — call fetchPortfolio(userId) alongside existing fetchActiveInvestment(). Pass walletBalanceUsd, investedBalanceUsd, totalValueUsd, smartAccountAddress to WalletSummary. Render WalletSummary above InvestmentSummary. Show WalletSummary even when no active investment (just wallet balance + zero invested). Handle loading and error states.

**Checkpoint**: Dashboard shows wallet balance card with real on-chain USDC balance. Zero-balance users see funding prompt with copyable address.

---

## Phase 16: US9 — Portfolio Pool Positions & Transaction History

**Goal**: Show pool cards with on-chain balances, supplied/earned amounts, and expandable per-pool transaction history.

**Independent Test**: Open dashboard with an active investment that has executed supply actions → verify pool cards show on-chain aToken balance, net invested, earned yield, latest APY. Click a pool card → verify per-pool transaction list appears with correct actions.

### Implementation for US9

- [x] T082 [P] [US9] Create PoolTransactions component in apps/web/src/components/dashboard/PoolTransactions.tsx — props: `{ actions: PoolAction[] }`. Renders a compact transaction timeline for a single pool:
  - Each action shows: icon by actionType (supply ↗, withdraw ↙, rate_check ◎, rebalance ⇄), description ("Supply $10.00 USDC" or "Rate Check"), status badge (executed/failed/skipped), APY after action (if non-null), truncated txHash as link (if non-null), timestamp formatted as "Feb 28, 2:30 PM", rationale text in smaller font.
  - Sort by executedAt DESC (newest first).
  - Empty state: "No transactions for this pool yet."

- [x] T083 [P] [US9] Create PortfolioSection component in apps/web/src/components/dashboard/PortfolioSection.tsx — props: `{ pools: PoolPosition[] }`. Renders one card per pool:
  - Pool header: "{asset} on {protocol} ({chain})" e.g. "USDC on Aave V3 (Base Sepolia)"
  - Metrics row: Current Balance (onChainBalanceUsd as $X.XX), Supplied (totalSuppliedUsd), Earned (earnedYieldUsd with green color if positive)
  - APY badge: latestApyPercent formatted as "X.X% APY"
  - Allocation badge: allocationPercent formatted as "XX% allocation"
  - Expandable section: click card to toggle PoolTransactions component visibility for that pool's actions.
  - Use useState to track which pool is expanded (accordion pattern — one at a time).

- [x] T084 [US9] Integrate PortfolioSection into dashboard page at apps/web/src/app/dashboard/page.tsx — pass portfolio.pools to PortfolioSection. Render between WalletSummary and AgentActions. Show "Your Pools" section header. Show empty state "No pool positions yet" when pools array is empty. Ensure loading skeleton shows while fetchPortfolio is in flight.

**Checkpoint**: Dashboard shows pool cards with real on-chain balances and expandable per-pool transaction history.

---

## Phase 17: Portfolio Polish & Validation

**Purpose**: Error handling, edge cases, and end-to-end validation for portfolio features

- [ ] T085 [P] Add error handling for RPC failures in apps/web/src/app/dashboard/page.tsx — if fetchPortfolio() fails, show WalletSummary in error state with message "Unable to load balance. Please try again." and a retry button. Do not block the rest of the dashboard (InvestmentSummary and AgentActions should still render from existing data).

- [ ] T086 [P] Add no-wallet-setup state to dashboard in apps/web/src/app/dashboard/page.tsx — if OPENFORT_SMART_ACCOUNT_ADDRESS is not configured (portfolio endpoint returns appropriate signal), show a setup prompt instead of balance/portfolio cards.

- [ ] T087 Run portfolio end-to-end validation — start all services (API on 3001, Web on 3000, Agent on 3002, Aave MCP on 8080). Walk through: dashboard → verify wallet balance shows real USDC balance → verify pool cards show aToken positions → click pool card → verify per-pool transaction history → verify total value = available + invested → verify zero-balance state shows funding prompt with copyable address → verify copied address matches OPENFORT_SMART_ACCOUNT_ADDRESS.

---

## Dependencies & Execution Order (Phase 3)

### Phase Dependencies

- **Portfolio Backend (Phase 14)**: Depends on Phase 1-13 being complete ✅ — start immediately
- **US8 Wallet Balance (Phase 15)**: Depends on Phase 14 (needs fetchPortfolio API)
- **US9 Pool Positions (Phase 16)**: Depends on Phase 14 (needs fetchPortfolio API). Can run in parallel with US8.
- **Portfolio Polish (Phase 17)**: Depends on Phase 15 + 16

### User Story Dependencies

- **US8 (Wallet Balance)**: Depends on T078 (frontend API client). No dependency on US9.
- **US9 (Pool Positions)**: Depends on T078 (frontend API client). No dependency on US8.
- **US8 + US9 can run in parallel** after Phase 14 completes.

### Within Portfolio Phases

- T075 (viem dep) before T076 (use case)
- T076 (use case) before T077 (endpoint)
- T077 (endpoint) before T078 (frontend client)
- T078 before any frontend component work (T079-T084)
- T082 + T083 are parallel (different component files)
- T079 before T080 (zero-balance extends WalletSummary)
- T081 + T084 should be sequential (both modify dashboard/page.tsx)

### Parallel Opportunities

- T082 + T083: PoolTransactions and PortfolioSection in parallel (different files)
- T079 + T082 + T083: WalletSummary, PoolTransactions, PortfolioSection all in parallel (different files, all depend only on T078)
- T085 + T086: Both polish tasks in parallel (different concerns)
- US8 + US9: Entire user stories can run in parallel after Phase 14

---

## Parallel Example: Portfolio Frontend

```bash
# After T078 (frontend API client) completes, launch all three components in parallel:
Task T079: "WalletSummary component"
Task T082: "PoolTransactions component"
Task T083: "PortfolioSection component"

# Then integrate sequentially (both touch dashboard/page.tsx):
Task T081: "Integrate WalletSummary into dashboard"
Task T084: "Integrate PortfolioSection into dashboard"
```

---

## Implementation Strategy (Phase 3)

### MVP First (US8 Wallet Balance Only)

1. Complete Phase 14: Portfolio Backend API (T075-T078)
2. Complete Phase 15: US8 Wallet Balance Card (T079-T081)
3. **STOP and VALIDATE**: Dashboard shows wallet balance with real on-chain data
4. Demo: "User sees their money in the dashboard"

### Full Delivery

1. Portfolio Backend → API endpoint returns balances + pool data
2. US8 Wallet Balance → Available/invested/total visible → Demo checkpoint
3. US9 Pool Positions → Pool cards with tx history → Demo checkpoint
4. Polish → Error handling, validation → Final demo
