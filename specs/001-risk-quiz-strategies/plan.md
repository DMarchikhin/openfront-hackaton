# Implementation Plan: Risk Quiz & Investment Strategies

**Branch**: `001-risk-quiz-strategies` | **Date**: 2026-02-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-risk-quiz-strategies/spec.md`

## Summary

Build a monorepo web application with a risk assessment quiz that
assigns users a risk profile (Conservative, Balanced, Growth), shows
matching investment strategies with Aave pool allocations, and lets
users select a strategy to start autonomous AI-agent investing.
Frontend in Next.js + Tailwind, backend in NestJS with hexagonal
architecture, MikroORM + PostgreSQL.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20+)
**Primary Dependencies**: Next.js 15 (App Router), NestJS 10,
MikroORM 6, Tailwind CSS 4, pnpm workspaces
**Storage**: PostgreSQL 15+ via MikroORM
**Testing**: Jest — domain layer unit tests only
**Target Platform**: Web (localhost for hackathon demo)
**Project Type**: Web application (monorepo: frontend + backend)
**Performance Goals**: Strategy screen loads in < 2s, quiz completes
in < 60s (user time)
**Constraints**: Hackathon scope (1 day), testnet only (Base Sepolia),
USDC only
**Scale/Scope**: Demo scale (~5 screens, 6 API endpoints, 4 domain
entities)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Security-First | PASS | Strategy pool allocations reference whitelisted Aave contracts only. No private keys exposed to frontend. Agent executes via Openfort policy-enforced backend wallet (FR-009). |
| II. Zero-Friction UX | PASS | Quiz uses plain language (FR-010). No gas prompts, no chain selection, no DeFi jargon in UI. Strategy selection is 1-tap. |
| III. Guardrailed Autonomy | PASS | Agent configured with strategy parameters (target pools, chains, rebalance threshold) per FR-005. Agent cannot operate outside strategy constraints. |
| IV. Transparency & Trust | PASS | Dashboard shows active strategy, current APY, earnings (FR-006). Strategy cards show full pool allocation breakdown. |
| V. Simplicity (YAGNI) | PASS | No fiat ramp, no mobile app, no real risk scoring, no KYC. Testnet only. Three pre-defined strategies. Simple additive quiz scoring. |

No violations. No complexity tracking entries needed.

## Project Structure

### Documentation (this feature)

```text
specs/001-risk-quiz-strategies/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── api.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
pnpm-workspace.yaml
package.json                          # Root: dev scripts, concurrently

apps/
├── web/                              # Next.js 15 + Tailwind CSS
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx              # Home → quiz CTA
│   │   │   ├── quiz/
│   │   │   │   └── page.tsx          # Quiz flow (stepper)
│   │   │   ├── strategies/
│   │   │   │   └── page.tsx          # Strategy cards + selection
│   │   │   └── dashboard/
│   │   │       └── page.tsx          # Active investment dashboard
│   │   ├── components/
│   │   │   ├── quiz/
│   │   │   │   ├── QuizStepper.tsx
│   │   │   │   ├── QuestionCard.tsx
│   │   │   │   ├── ProgressBar.tsx
│   │   │   │   └── RiskResult.tsx
│   │   │   ├── strategy/
│   │   │   │   ├── StrategyCard.tsx
│   │   │   │   └── StrategyDetail.tsx
│   │   │   ├── dashboard/
│   │   │   │   └── InvestmentSummary.tsx
│   │   │   └── ui/
│   │   │       ├── Button.tsx
│   │   │       └── Card.tsx
│   │   └── lib/
│   │       └── api.ts                # Fetch wrapper for backend
│   ├── tailwind.config.ts
│   ├── next.config.ts
│   └── package.json
│
└── api/                              # NestJS 10 (hexagonal)
    ├── src/
    │   ├── modules/
    │   │   ├── quiz/
    │   │   │   ├── domain/
    │   │   │   │   ├── quiz-question.entity.ts
    │   │   │   │   ├── risk-assessment.entity.ts
    │   │   │   │   └── ports/
    │   │   │   │       ├── quiz-question.repository.port.ts
    │   │   │   │       └── risk-assessment.repository.port.ts
    │   │   │   ├── application/
    │   │   │   │   ├── get-quiz-questions.use-case.ts
    │   │   │   │   └── submit-quiz.use-case.ts
    │   │   │   ├── infrastructure/
    │   │   │   │   ├── quiz-question.repository.ts
    │   │   │   │   ├── risk-assessment.repository.ts
    │   │   │   │   └── quiz.controller.ts
    │   │   │   └── quiz.module.ts
    │   │   │
    │   │   ├── strategy/
    │   │   │   ├── domain/
    │   │   │   │   ├── investment-strategy.entity.ts
    │   │   │   │   └── ports/
    │   │   │   │       └── strategy.repository.port.ts
    │   │   │   ├── application/
    │   │   │   │   └── get-strategies.use-case.ts
    │   │   │   ├── infrastructure/
    │   │   │   │   ├── strategy.repository.ts
    │   │   │   │   └── strategy.controller.ts
    │   │   │   └── strategy.module.ts
    │   │   │
    │   │   └── investment/
    │   │       ├── domain/
    │   │       │   ├── user-investment.entity.ts
    │   │       │   └── ports/
    │   │       │       └── investment.repository.port.ts
    │   │       ├── application/
    │   │       │   ├── start-investing.use-case.ts
    │   │       │   └── switch-strategy.use-case.ts
    │   │       ├── infrastructure/
    │   │       │   ├── investment.repository.ts
    │   │       │   └── investment.controller.ts
    │   │       └── investment.module.ts
    │   │
    │   ├── database/
    │   │   ├── migrations/
    │   │   └── seeders/
    │   │       └── initial-seed.ts   # Quiz questions + strategies
    │   ├── app.module.ts
    │   └── main.ts
    ├── test/
    │   └── unit/
    │       ├── quiz/
    │       │   ├── risk-assessment.entity.spec.ts
    │       │   └── quiz-question.entity.spec.ts
    │       ├── strategy/
    │       │   └── investment-strategy.entity.spec.ts
    │       └── investment/
    │           └── user-investment.entity.spec.ts
    ├── mikro-orm.config.ts
    └── package.json
```

**Structure Decision**: Web application monorepo with `apps/web` +
`apps/api`. Hexagonal architecture applied per NestJS module with
domain/application/infrastructure layers. Domain entities carry
MikroORM decorators directly (pragmatic approach — see research.md R5).
Ports defined as interfaces in domain layer for outbound adapters
(repositories) only.

## Architecture Notes

### Hexagonal Architecture per Module

Each backend module follows this dependency flow:

```
Controller (infrastructure) → Use Case (application) → Domain Entity
                                        ↓
                              Repository Port (domain/ports)
                                        ↓
                              MikroORM Repo (infrastructure)
```

- **Domain layer**: Entities with business logic + port interfaces.
  No framework imports except MikroORM decorators (pragmatic).
- **Application layer**: Use cases that orchestrate domain logic.
  Depend on port interfaces, not concrete repositories.
- **Infrastructure layer**: Controllers (inbound adapters) and
  MikroORM repositories (outbound adapters).

### SOLID Application

- **S** — Each use case does one thing (GetQuizQuestions, SubmitQuiz, etc.)
- **O** — New strategies added via seed data, no code changes needed
- **L** — Not applicable (no inheritance hierarchies)
- **I** — Repository ports define minimal interfaces per entity
- **D** — Use cases depend on port interfaces, injected via NestJS DI

### Tell Don't Ask

Domain entities encapsulate behavior:
- `riskAssessment.addAnswer(questionId, score)` — don't read score, calculate externally
- `riskAssessment.complete(totalQuestions)` — don't check completion externally
- `userInvestment.activate(strategyId)` — don't check status externally
- `investmentStrategy.validateAllocations()` — don't sum percentages externally

### Testing Strategy

Unit tests for domain entities ONLY:
- `risk-assessment.entity.spec.ts` — test addAnswer, complete, scoring logic
- `investment-strategy.entity.spec.ts` — test validateAllocations, matchesRiskLevel
- `user-investment.entity.spec.ts` — test activate, switchStrategy, deactivate

No tests for controllers, use cases, or repositories.

## Complexity Tracking

No violations detected. No entries needed.
