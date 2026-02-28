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

- [ ] T044 [P] Add loading spinners on quiz page (while fetching questions), strategies page (while loading strategies), and dashboard page (while fetching active investment) in apps/web/src/app/quiz/page.tsx, apps/web/src/app/strategies/page.tsx, apps/web/src/app/dashboard/page.tsx
- [ ] T045 [P] Add error handling on all API calls — show user-friendly error messages in plain English (no technical details) with retry buttons where applicable, in apps/web/src/lib/api.ts and each page component
- [ ] T046 [P] Add input validation DTOs using class-validator (@IsUUID, @IsString, @IsArray, @IsNotEmpty) on QuizController submit body and InvestmentController start/switch bodies in apps/api/src/modules/*/infrastructure/*.controller.ts
- [ ] T047 Polish Tailwind styling across all pages — consistent color palette (green for growth, blue for balanced, gray for conservative), clean card shadows, responsive layout on mobile viewports, smooth transitions between quiz questions
- [ ] T048 Run quickstart.md validation — start fresh (pnpm install, docker DB, migration, seed, pnpm dev), walk through complete flow: home → quiz → result → strategies → start investing → dashboard → change strategy. Verify all checkpoints pass.

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
