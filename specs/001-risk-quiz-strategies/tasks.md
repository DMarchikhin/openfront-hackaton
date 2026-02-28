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

- [x] T085 [P] Add error handling for RPC failures in apps/web/src/app/dashboard/page.tsx — if fetchPortfolio() fails, show WalletSummary in error state with message "Unable to load balance. Please try again." and a retry button. Do not block the rest of the dashboard (InvestmentSummary and AgentActions should still render from existing data).

- [x] T086 [P] Add no-wallet-setup state to dashboard in apps/web/src/app/dashboard/page.tsx — if OPENFORT_SMART_ACCOUNT_ADDRESS is not configured (portfolio endpoint returns appropriate signal), show a setup prompt instead of balance/portfolio cards.

- [x] T087 Run portfolio end-to-end validation — start all services (API on 3001, Web on 3000, Agent on 3002, Aave MCP on 8080). Walk through: dashboard → verify wallet balance shows real USDC balance → verify pool cards show aToken positions → click pool card → verify per-pool transaction history → verify total value = available + invested → verify zero-balance state shows funding prompt with copyable address → verify copied address matches OPENFORT_SMART_ACCOUNT_ADDRESS.

---

## Phase 18: Async Agent Execution + Frontend Polling (US3/US4)

**Purpose**: Agent takes 3–10 minutes. Current 120s HTTP timeout kills the connection. Fix: agent responds 202 immediately, runs in background, POSTs results back to API via callback. Frontend polls every 3s.

**Depends on**: Phase 1-17 complete

- [x] T088 [P] Add `API_SERVICE_URL=http://localhost:3001/api` to `apps/agent/.env` and `apps/agent/.env.example`

- [x] T089 Modify agent server async execution in `apps/agent/src/server.ts` — for both `/execute` and `/rebalance`: read body → respond `202 { status: 'accepted', investmentId }` immediately → run `executeInvestment`/`rebalanceInvestment` in background (no await) → on success, POST result to `${API_SERVICE_URL}/investments/${investmentId}/actions/report` with `{ userId, strategyId, ...result }` → on failure, POST error callback with `{ userId, strategyId, actions: [{ actionType: 'rate_check', status: 'failed', rationale }], summary }`. For `/rebalance`, use `strategyId: params.newStrategy.id`.

- [x] T090 Modify `triggerAgent()` and `triggerRebalance()` in `apps/api/src/modules/investment/application/execute-investment.use-case.ts` — change `AbortSignal.timeout` from 120_000 to 5_000 (just confirm 202 receipt), check `response.status !== 202` instead of `!response.ok`, remove `await response.json()` and `saveAgentActions` calls from both methods (results now arrive via callback). Remove the catch-block `createFailedAction` calls too — errors will come via callback.

- [x] T091 Add `reportAgentResults()` method to `ExecuteInvestmentUseCase` in `apps/api/src/modules/investment/application/execute-investment.use-case.ts` — accepts `investmentId, userId, strategyId, actions[]`, calls existing `saveAgentActions()` to persist results. This is the callback handler logic.

- [x] T092 Add callback endpoint `POST :investmentId/actions/report` to `apps/api/src/modules/investment/infrastructure/investment.controller.ts` — `@Post(':investmentId/actions/report') @HttpCode(204)` that accepts `{ userId, strategyId, actions[], summary? }` body and calls `executeInvestmentUseCase.reportAgentResults()`.

- [x] T093 Add polling `useEffect` to `apps/web/src/app/dashboard/page.tsx` — poll `fetchAgentActions(investmentId)` every 3s while `actions.length === 0 || actions.every(a => a.status === 'pending')`. Stop when any action has `status === 'executed'` or `status === 'failed'`, or after 10 minutes. Pass `isProcessing` prop to `AgentActions`.

- [x] T094 Add `isProcessing` prop to `AgentActions` in `apps/web/src/components/dashboard/AgentActions.tsx` — when `actions.length === 0 && isProcessing`, show spinner with "Agent is processing your investment..." message instead of "No agent actions yet."

**Checkpoint**: Agent execution no longer times out. Dashboard shows processing state and auto-updates when agent completes.

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

---
---

# Phase 4: Agent Chat Interface + Real-Time Thinking UI

**Input**: Phase 4 design documents from `/specs/001-risk-quiz-strategies/` (plan.md, research.md R23-R26, contracts/agent-streaming.md)
**Prerequisites**: All Phase 1-18 tasks completed ✅

**Tests**: Manual end-to-end (hackathon scope). No automated tests.

**Organization**: Tasks grouped into chat-specific user stories. US10 = Agent Real-Time Streaming, US11 = Interactive Chat, US12 = Dashboard Polish (P2).

## Path Conventions (Phase 4)

- **Agent app**: `apps/agent/src/`
- **Frontend**: `apps/web/src/`
- **No backend (API) changes** — persisted actions stay as-is

---

## Phase 19: Agent SSE Infrastructure (Foundational)

**Purpose**: Add SSE streaming capability to the agent server. Capture all intermediate SDK messages from `query()` and broadcast them to connected frontends via Server-Sent Events. MUST complete before any frontend chat work.

**CRITICAL**: No chat UI work can begin until this phase is complete.

- [x] T095 Add `StreamEvent` type and `onMessage` callback to `executeInvestment()` in `apps/agent/src/index.ts` — define exported `StreamEvent` union type per plan.md (thinking, text, tool_start, tool_progress, tool_result, status, result, error, done). Add optional `onMessage?: (event: StreamEvent) => void` parameter to `executeInvestment()`. Expand the `for await (const message of agentQuery)` loop (currently lines 114-118) to handle all SDK message types: `stream_event` with `content_block_delta` → emit `{ type: 'text', text: delta.text }`, `assistant` messages → emit `{ type: 'thinking', text }` for thinking content blocks, `tool_progress` → emit `{ type: 'tool_progress', tool: message.tool_name, elapsed: message.elapsed_time_seconds }`, `tool_use_summary` → emit `{ type: 'tool_result', tool: message.tool_name, summary: message.summary }`, `system` with subtype `task_started` → emit `{ type: 'status', description: message.description }`, `result` → emit `{ type: 'result', text }` then `{ type: 'done' }`. Keep existing result parsing logic intact. Wrap all `onMessage?.()` calls in try/catch to never break the main loop.

- [x] T096 Add same `onMessage` callback to `rebalanceInvestment()` in `apps/agent/src/index.ts` — identical SDK message handling as T095 for the rebalance `for await` loop (currently lines 184-188). Both functions share the same `StreamEvent` type and message mapping logic. Extract the message-handling logic into a shared helper function (e.g., `handleSdkMessage(message, onMessage)`) to avoid duplication.

- [x] T097 Add CORS headers and OPTIONS preflight handling to `apps/agent/src/server.ts` — add a helper function `setCors(res: http.ServerResponse)` that sets `Access-Control-Allow-Origin: http://localhost:3000`, `Access-Control-Allow-Methods: GET, POST, OPTIONS`, `Access-Control-Allow-Headers: Content-Type`. Call `setCors(res)` on every response. Add `OPTIONS` method handling at the top of the request handler: if `method === 'OPTIONS'`, call `setCors(res)`, set status 204, `res.end()`, return. Apply CORS to existing `/health`, `/execute`, `/rebalance` responses.

- [x] T098 Add SSE subscriber registry and `GET /stream/:investmentId` endpoint to `apps/agent/src/server.ts` — add `const activeStreams = new Map<string, Set<http.ServerResponse>>()` at module scope. Add `broadcastEvent(investmentId: string, type: string, data: Record<string, unknown>)` helper that iterates all responses in `activeStreams.get(investmentId)` and writes `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`. Add route: if `method === 'GET' && url?.startsWith('/stream/')`, parse investmentId from URL, call `setCors(res)`, set SSE headers (`Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`), register res in `activeStreams`, write `event: connected\ndata: {}\n\n`, handle cleanup on `req.on('close')` (remove res from set, delete map entry if set empty). Add 15-minute timeout per connection.

- [x] T099 Wire `onMessage` callback from `/execute` and `/rebalance` handlers to `broadcastEvent` in `apps/agent/src/server.ts` — in the `/execute` handler, change `executeInvestment(params)` to `executeInvestment(params, (event) => broadcastEvent(params.investmentId, event.type, event))`. Same for `/rebalance` → `rebalanceInvestment(params, (event) => broadcastEvent(params.investmentId, event.type, event))`. After the `.then()` callback completes (result POSTed to API), broadcast `{ type: 'done' }` and clean up subscribers. After the `.catch()` callback, broadcast `{ type: 'error', message }` then `{ type: 'done' }`.

**Checkpoint**: `curl -N http://localhost:3002/stream/test-id` receives `event: connected` then stays open. Starting an investment broadcasts real-time SDK events to all connected SSE clients.

---

## Phase 20: US10 — Real-Time Agent Streaming UI (P0)

**Goal**: Replace the static AgentActions list with a live chat panel that shows the agent's thinking, tool calls, and results as they happen in real-time via SSE.

**Independent Test**: Start investing → dashboard shows AgentChat panel → SSE connects → real-time messages stream in: "Calling aave_get_reserves..." → tool result → agent thinking → "Supplying $X to Aave..." → summary card.

**Depends on**: Phase 19 complete

- [x] T100 [P] [US10] Add `ChatMessage` discriminated union type, `sendAgentMessage()` function, and `NEXT_PUBLIC_AGENT_URL` env var support to `apps/web/src/lib/api.ts` — add type per contracts/agent-streaming.md: `ChatMessage = { id: string; type: 'thinking' | 'text' | 'tool_start' | 'tool_progress' | 'tool_result' | 'status' | 'action' | 'result' | 'error' | 'user'; ... }` (full discriminated union with all fields per type). Add `const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL ?? 'http://localhost:3002'`. Add `sendAgentMessage(investmentId: string, userId: string, message: string, context: { strategyName: string; strategyId: string; riskLevel: string; walletAddress: string }): Promise<{ status: string; investmentId: string }>` that POSTs to `${AGENT_URL}/chat`.

- [x] T101 [P] [US10] Create `useAgentStream` hook in `apps/web/src/hooks/useAgentStream.ts` — export `function useAgentStream(investmentId: string | null, isProcessing: boolean): { messages: ChatMessage[], isConnected: boolean }`. Implementation: use `useState<ChatMessage[]>` for messages, `useState<boolean>` for isConnected. In `useEffect` (deps: investmentId, isProcessing): if no investmentId or not processing, return. Create `EventSource` to `${AGENT_URL}/stream/${investmentId}`. Listen for typed events: `connected` → set isConnected=true, `thinking` → append ChatMessage with `type: 'thinking'`, `text` → coalesce consecutive text events into single message (check if last message is `type: 'text'`, if so update its text, else append new), `tool_start` → append, `tool_progress` → find existing tool_start message for same tool and update elapsed, `tool_result` → find existing tool_start/progress message for same tool and replace with tool_result, `status`/`result`/`error` → append as new message, `done` → set isConnected=false, close EventSource. On `onerror` → set isConnected=false. Cleanup on unmount: close EventSource. Generate unique IDs via `crypto.randomUUID()`.

- [x] T102 [US10] Create `AgentChat` component in `apps/web/src/components/dashboard/AgentChat.tsx` — props: `{ investmentId: string, actions: AgentAction[], isProcessing: boolean, onSendMessage?: (message: string) => void, investment: ActiveInvestment | null }`. Implementation: call `useAgentStream(investmentId, isProcessing)` to get `{ messages, isConnected }`. Render three sections: (1) **Header**: "Agent Activity" text + status indicator dot (pulsing green `animate-pulse` when isConnected, gray when not). (2) **Message list**: scrollable `div` with `overflow-y-auto max-h-[500px]` and `ref` for auto-scroll via `useEffect` calling `scrollIntoView({ behavior: 'smooth' })` on new messages. Render each ChatMessage by type: `thinking` → gray italic text with brain icon "🧠", collapsible via `useState` toggle (default collapsed, show first 100 chars), `text` → left-aligned white bubble with text, `tool_start` → pill badge with spinner: "Calling {tool}...", `tool_progress` → same pill with "{elapsed}s" timer, `tool_result` → green checkmark pill with summary, `status` → centered gray divider text, `result` → green-bordered summary card, `error` → red-bordered error card with message, `user` → right-aligned blue bubble. (3) When no SSE messages and actions exist, fall back to rendering existing `<AgentActions>` component with persisted actions. Auto-scroll to bottom on new messages.

- [x] T103 [US10] Integrate AgentChat into dashboard — replace `<AgentActions>` with `<AgentChat>` in `apps/web/src/app/dashboard/page.tsx`. Pass props: `investmentId={investment.investmentId}`, `actions={actions}`, `isProcessing={actions.length === 0 || actions.every(a => a.status === 'pending')}`, `investment={investment}`. Remove direct import of `AgentActions` (it's now used internally by AgentChat). Keep existing polling `useEffect` as fallback for persistence sync — but when SSE is connected, the chat panel shows real-time data.

**Checkpoint**: Dashboard shows live agent thinking UI during execution. Real-time tool calls, thinking, and results stream in as they happen.

---

## Phase 21: US11 — Interactive Chat (P1)

**Goal**: Users can type natural language commands ("What's my APY?", "Invest $500 more") and get agent responses streamed back in the same chat panel.

**Independent Test**: After agent completes, type "What's my current APY?" in chat input → agent responds via SSE with live rate data. Type "Check gas prices" → agent calls tool and streams response. Click "Invest more" chip → enter amount → agent runs new execution with streaming.

**Depends on**: Phase 20 complete

- [x] T104 [US11] Create conversational chat prompt in `apps/agent/src/chat-prompt.ts` — export `function buildChatPrompt(context: ChatContext): string` where `ChatContext` has: `{ message: string, strategyName: string, strategyId: string, riskLevel: string, walletAddress: string, chainId: number }`. The prompt instructs Claude to: answer DeFi questions in plain English (no jargon), use MCP tools to fetch live data when relevant (aave_get_reserves for APY, get_gas_price for gas, openfort_get_balance for balance), keep responses concise (2-3 sentences max), if user requests an action like "invest $X more" respond with a summary of what would need to happen (do NOT execute transactions in chat mode). Include Aave V3 contract addresses per chain (same as agent-prompt.ts). Export `chatToolsAllowList` array: `['mcp__aave__aave_get_reserves', 'mcp__aave__get_gas_price', 'mcp__aave__get_balance', 'mcp__openfort__openfort_get_balance']` (read-only tools only).

- [x] T105 [US11] Add `POST /chat` endpoint to `apps/agent/src/server.ts` — route: if `method === 'POST' && url === '/chat'`, read body as `{ investmentId, userId, message, context: { strategyName, strategyId, riskLevel, walletAddress } }`. Respond `202 { status: 'accepted', investmentId }` immediately. In background: import `buildChatPrompt` and `chatToolsAllowList` from `./chat-prompt.js`, build prompt, call `query()` with `maxTurns: 5`, `model: 'claude-sonnet-4-6'`, same MCP servers, `allowedTools: chatToolsAllowList`, `permissionMode: 'bypassPermissions'`. Iterate messages with same `handleSdkMessage` helper from T095/T096, passing `(event) => broadcastEvent(investmentId, event.type, event)`. On completion broadcast `{ type: 'done' }`. On error broadcast `{ type: 'error', message }` then `{ type: 'done' }`. Update server startup log to include `POST /chat` endpoint.

- [x] T106 [US11] Add chat input and quick-action chips to `AgentChat` in `apps/web/src/components/dashboard/AgentChat.tsx` — add section (3) below the message list: a row of quick-action chip buttons above the input: `[Check APY]` `[Gas prices]` `[What's my balance?]` `[Explain last action]`. Each chip calls `onSendMessage?.(chipText)` and appends a `{ type: 'user', text: chipText }` message to the local messages array. Below chips: a text input field with send button. On submit (enter key or button click): call `onSendMessage?.(inputText)`, append `{ type: 'user', text }` message, clear input. Disable input and chips while `isConnected` is true (agent is streaming). Style: chips as small rounded pill buttons with `bg-gray-100 hover:bg-gray-200 text-sm`, input as standard text field with send icon button.

- [x] T107 [US11] Wire `handleSendMessage` in dashboard page `apps/web/src/app/dashboard/page.tsx` — add `handleSendMessage` callback that calls `sendAgentMessage(investment.investmentId, getUserId(), message, { strategyName: investment.strategy.name, strategyId: investment.strategy.id, riskLevel: investment.strategy.riskLevel, walletAddress: smartAccountAddress })` from `api.ts`. Pass `onSendMessage={handleSendMessage}` to `<AgentChat>`. Import `sendAgentMessage` from `@/lib/api`.

**Checkpoint**: Users can type questions in the chat panel and receive streaming agent responses. Quick-action chips provide one-click common queries.

---

## Phase 22: Polish & P2 Features

**Purpose**: Browser notifications, yield projection card, and end-to-end validation.

- [x] T108 [P] Add browser notification on agent completion in `apps/web/src/hooks/useAgentStream.ts` — when a `result` event is received, check `Notification.permission === 'granted'` and fire `new Notification('Autopilot Savings', { body: 'Agent finished allocating your funds!' })`. Add a separate `useEffect` in `useAgentStream` (or export a separate hook) that calls `Notification.requestPermission()` once on mount if permission is `'default'`.

- [x] T109 [P] Create YieldProjection component in `apps/web/src/components/dashboard/YieldProjection.tsx` — props: `{ investedAmount: number, apyPercent: number }`. Show "Projected Earnings" card with 4 columns: 1 month, 3 months, 6 months, 12 months. Calculate each as `investedAmount * (apyPercent / 100) * (months / 12)`. Format as `$X.XX`. Render a simple SVG sparkline (4 points connected by a line, height proportional to amount) for visual appeal — no charting library. Style: subtle gray card with green accent for projected values.

- [x] T110 Integrate YieldProjection into dashboard in `apps/web/src/app/dashboard/page.tsx` — render `<YieldProjection>` between `<PortfolioSection>` and `<AgentChat>`. Pass `investedAmount={portfolio?.investedBalanceUsd ?? 0}` and `apyPercent` (derive from portfolio pools: weighted average of `latestApyPercent` by `allocationPercent`, or fall back to strategy's `expectedApyMin`). Only render when `portfolio` exists and `investedAmount > 0`.

- [x] T111 Run full end-to-end validation — start all services (API on 3001, Web on 3000, Agent on 3002, Aave MCP on 8080). Walk through: (1) dashboard → verify SSE connects when agent is processing, (2) start investing → verify AgentChat shows real-time thinking, tool calls, results as they stream, (3) after agent completes → verify browser notification → verify chat input becomes active, (4) type "What's my current APY?" → verify agent responds with live rate data in chat, (5) click "Gas prices" chip → verify agent calls tool and streams response, (6) verify YieldProjection card shows projected earnings below portfolio section, (7) refresh page mid-execution → verify polling fills in missed actions, SSE reconnects for remaining events.

**Checkpoint**: Full agent chat experience — real-time streaming, interactive queries, browser notifications, yield projections. Demo-ready.

---

## Dependencies & Execution Order (Phase 4)

### Phase Dependencies

- **Agent SSE Infrastructure (Phase 19)**: Depends on Phase 1-18 complete ✅ — start immediately
- **US10 Real-Time Streaming UI (Phase 20)**: Depends on Phase 19 — needs SSE endpoint
- **US11 Interactive Chat (Phase 21)**: Depends on Phase 20 — needs chat panel component
- **Polish & P2 (Phase 22)**: Depends on Phase 20 (notifications use useAgentStream, yield projection uses portfolio)

### User Story Dependencies

- **US10 (Streaming UI)**: Depends on Phase 19 — core real-time display
- **US11 (Interactive Chat)**: Depends on US10 — extends chat panel with input and POST /chat
- **US10 + US11 are sequential** (US11 adds to the component US10 creates)
- **Phase 22 Polish**: Can start partially after US10 (notifications in useAgentStream, yield projection independent of chat)

### Within Phases

- T095 before T096 (shared helper function)
- T097 before T098 (CORS needed for SSE endpoint)
- T098 before T099 (broadcastEvent needed for wiring)
- T100 + T101 are parallel (different files, both depend on Phase 19)
- T102 depends on T100 + T101 (uses ChatMessage type + useAgentStream hook)
- T103 depends on T102 (integrates AgentChat into dashboard)
- T104 before T105 (chat prompt needed for /chat endpoint)
- T106 depends on T102 (extends AgentChat component)
- T107 depends on T106 (wires handler in dashboard)
- T108 + T109 are parallel (different files, different concerns)
- T110 depends on T109 (integrates YieldProjection)

### Parallel Opportunities

- T100 + T101: ChatMessage types and useAgentStream hook in parallel (different files)
- T108 + T109: Browser notifications and YieldProjection in parallel (different files)
- T104 + T100: Chat prompt and frontend types can start in parallel after Phase 19

---

## Parallel Example: Agent Chat Core (US10)

```bash
# Phase 19 infrastructure (sequential, same files):
Task T095: "StreamEvent type + onMessage in executeInvestment"
Task T096: "onMessage in rebalanceInvestment + shared helper"
Task T097: "CORS headers"
Task T098: "SSE endpoint + subscriber registry"
Task T099: "Wire onMessage → broadcastEvent"

# Phase 20 frontend (parallel after Phase 19):
Task T100: "ChatMessage types + sendAgentMessage"   # parallel
Task T101: "useAgentStream SSE hook"                 # parallel

# Then component + integration (sequential, shared files):
Task T102: "AgentChat component"
Task T103: "Integrate into dashboard"
```

---

## Implementation Strategy (Phase 4)

### MVP First (US10 Streaming UI Only)

1. Complete Phase 19: Agent SSE Infrastructure (T095-T099)
2. Complete Phase 20: US10 — Real-Time Streaming UI (T100-T103)
3. **STOP and VALIDATE**: Start investing → see real-time agent thinking in chat panel
4. Demo: "User watches the agent think and act in real-time"

### Full Delivery

1. Agent SSE Infrastructure → SSE endpoint broadcasts SDK events
2. US10 Streaming UI → Live thinking panel → Demo checkpoint
3. US11 Interactive Chat → User can ask questions → Demo checkpoint
4. Polish → Notifications, yield projections → Final demo

---

## Phase 23: Chat Agent — API Data Tools (US11 enhancement)

**Goal**: Give the chat agent access to the app's own NestJS API so it can answer user questions about portfolio state and agent action history. Currently the chat agent only has blockchain-level tools and responds "I don't have access to transaction history" when asked about balances or past actions.

**Independent Test**: Start all services, open dashboard, ask "What's my balance?" → agent should report wallet + invested USDC amounts from the portfolio endpoint. Ask "Explain last action" → agent should describe the most recent agent action with rationale and status.

### Implementation

- [x] T112 [P] [US11] Create in-process API MCP server in `apps/agent/src/mcp/api-tools.ts` — export `createApiMcpServer(apiBaseUrl: string)` that returns `createSdkMcpServer({ name: 'api', version: '1.0.0', tools: [...] })`. Follow exact pattern from `apps/agent/src/mcp/aave-tools.ts`. Add `textResult()` helper (same as aave-tools). Add two tools: (1) `get_investment_actions` with schema `{ investmentId: z.string().describe('The investment ID') }` — calls `GET ${apiBaseUrl}/investments/${investmentId}/actions` with `AbortSignal.timeout(10_000)`, returns full JSON response via `textResult()`. (2) `get_portfolio` with schema `{ userId: z.string().describe('The user ID') }` — calls `GET ${apiBaseUrl}/investments/portfolio?userId=${userId}` with `AbortSignal.timeout(10_000)`, returns full JSON response via `textResult()`. Both tools throw on non-OK response (`throw new Error(\`API returned ${res.status}\`)`).

- [x] T113 [US11] Update chat prompt context and tool allow-list in `apps/agent/src/chat-prompt.ts` — (1) Add `investmentId: string` and `userId: string` fields to `ChatContext` interface. (2) Add `'mcp__api__get_investment_actions'` and `'mcp__api__get_portfolio'` to the `chatToolsAllowList` array. (3) In `buildChatPrompt()`: add `Investment ID: ${context.investmentId}` and `User ID: ${context.userId}` to the "User Context" section of the prompt. Add two new lines to the tool descriptions: `- \`get_investment_actions\` — get agent action history (supply/withdraw/rebalance) with rationale, status, amounts, APY before/after` and `- \`get_portfolio\` — get portfolio state: wallet balance, invested balance, earned yield, per-pool breakdown with latest APY`.

- [x] T114 [US11] Wire API MCP server into chat handler in `apps/agent/src/server.ts` — (1) Add import: `import { createApiMcpServer } from './mcp/api-tools.js';` alongside existing aave/openfort imports. (2) In the `POST /chat` handler: destructure `userId` from `body` (it's already in the body type but currently only `investmentId, message, context` are destructured). Pass `investmentId` and `userId` to `buildChatPrompt`: change `buildChatPrompt({ message, chainId, ...context })` to `buildChatPrompt({ message, chainId, investmentId, userId, ...context })`. (3) Add `api: createApiMcpServer(process.env.API_SERVICE_URL ?? 'http://localhost:3001/api')` to the `mcpServers` object in the `query()` call (alongside existing `aave` and `openfort` servers).

- [ ] T115 [US11] End-to-end verification of chat data tools — start all services (`env -u CLAUDECODE tsx src/server.ts` from `apps/agent/`, `pnpm dev` from `apps/api/`, `pnpm dev` from `apps/web/`). Open `http://localhost:3000/dashboard`. Test: (1) Ask "What's my balance?" → agent should call `get_portfolio` tool and report wallet USDC + invested USDC amounts. (2) Ask "Explain last action" → agent should call `get_investment_actions` tool and describe the most recent action including rationale and status. (3) Ask "What APY am I getting?" → agent should combine `get_portfolio` (for invested amount) with `aave_get_reserves` (for current rates). (4) Ask "Gas prices" → should still work as before (existing `get_gas_price` tool unchanged). (5) Verify no duplicate tool calls or errors in agent server console.

**Checkpoint**: Chat agent can answer user questions about their portfolio, action history, balances, and yield — using live data from both the NestJS API and blockchain tools.

---

## Dependencies & Execution Order (Phase 5 — Chat API Tools)

### Phase Dependencies

- **Phase 23**: Depends on Phase 21 (US11 Interactive Chat) — needs `/chat` endpoint, `buildChatPrompt`, `chatToolsAllowList`, and `AgentChat` component in place.

### Task Dependencies

- **T112** is parallel-safe (new file, no deps on T113/T114)
- **T113** depends on nothing within phase (modifies existing `chat-prompt.ts`)
- **T114** depends on T112 + T113 (imports `createApiMcpServer` from T112, uses updated `ChatContext` from T113)
- **T115** depends on T112 + T113 + T114 (all three must be complete for verification)

### Parallel Opportunities

- T112 + T113 can run in parallel (different files: `api-tools.ts` vs `chat-prompt.ts`)
- T114 depends on both (imports from both files)

---

## Parallel Example: Chat API Tools (Phase 23)

```bash
# Parallel (different files):
Task T112: "Create api-tools.ts MCP server"    # parallel
Task T113: "Update chat-prompt.ts context/allowlist"  # parallel

# Sequential (depends on both above):
Task T114: "Wire into server.ts /chat handler"

# Verification (depends on all above):
Task T115: "End-to-end verification"
```

---

## Implementation Strategy (Phase 5 — Chat API Tools)

### Execution Order

1. T112 + T113 in parallel (new MCP server + prompt updates)
2. T114 (wire into server.ts — needs both T112 and T113)
3. T115 (end-to-end verification — needs all three)
