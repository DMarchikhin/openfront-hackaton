<!--
  Sync Impact Report
  ==================================================
  Version change: N/A (new) → 1.0.0
  Modified principles: N/A (initial ratification)
  Added sections:
    - Core Principles (5 principles)
    - Technology Constraints
    - Development Workflow
    - Governance
  Removed sections: N/A
  Templates requiring updates:
    - .specify/templates/plan-template.md ✅ compatible (Constitution Check section is generic)
    - .specify/templates/spec-template.md ✅ compatible (no constitution-specific references)
    - .specify/templates/tasks-template.md ✅ compatible (no constitution-specific references)
    - .specify/templates/checklist-template.md ✅ compatible (no constitution-specific references)
  Follow-up TODOs: None
  ==================================================
-->

# Autopilot Savings Constitution

## Core Principles

### I. Security-First

All operations involving user funds MUST treat security as the
highest priority, superseding performance, UX convenience, and
feature velocity.

- Smart contract interactions MUST only target addresses on a
  pre-approved whitelist enforced by Openfort transaction policies.
- The AI agent backend wallet MUST NOT have the ability to transfer
  funds to arbitrary addresses; policy guardrails MUST be enforced
  server-side, independent of agent logic.
- Private keys and seed phrases MUST never be exposed to users or
  transmitted to the frontend.
- All on-chain transactions MUST be logged with full audit trails
  (sender, recipient, amount, chain, timestamp, rationale).
- When a risk signal is detected, the agent MUST prioritize capital
  preservation over yield optimization.

**Rationale**: The product manages real user funds autonomously.
A single security failure destroys user trust irreversibly.

### II. Zero-Friction UX

The user experience MUST feel like a traditional fintech savings
account. All blockchain complexity MUST be hidden from the user.

- Users MUST NOT encounter gas fee prompts, chain selection
  dialogs, or protocol-specific jargon during normal flows.
- Wallet creation MUST happen silently during sign-up (< 100ms
  perceived latency) with no seed phrase or private key exposure.
- Deposit, withdrawal, and rebalancing flows MUST each complete
  in three taps or fewer.
- Error states MUST use plain-English language; no hex addresses,
  transaction hashes, or chain IDs in user-facing messages.

**Rationale**: The core product thesis is that yield exists but
adoption is blocked by complexity. UX friction directly contradicts
the value proposition.

### III. Guardrailed Autonomy

The AI agent MUST operate autonomously within explicit, verifiable
policy constraints. Agent freedom MUST be bounded, not unlimited.

- The agent MUST only execute transactions through Openfort's
  policy-enforced backend wallet.
- Rebalancing decisions MUST pass a cost-benefit check: the
  projected yield improvement MUST exceed the gas cost of the move
  by a configurable minimum threshold.
- The agent MUST respect user-configured preferences (risk
  tolerance, allowed chains, max single-pool allocation,
  rebalance threshold) when present.
- If agent logic contains a bug, infrastructure-level policies
  MUST prevent unauthorized fund movement (defense in depth).

**Rationale**: Autonomous agents handling money require hard
boundaries. Software bugs MUST NOT translate into fund loss.

### IV. Transparency & Trust

Every autonomous action MUST be explainable to the user in
plain language. Users MUST always retain the ability to override
agent decisions.

- Every rebalance event MUST generate a user-visible notification
  that includes: previous rate, new rate, and estimated annual
  impact.
- Users MUST be able to view an explanation for any agent action
  (the "Why?" screen).
- A manual mode override MUST always be available, allowing users
  to disable autonomous management.
- Earnings, balances, and APY rates MUST be displayed in real-time
  on the dashboard with no intentional delays.

**Rationale**: Trust in autonomous financial agents is earned
through radical transparency, not black-box behavior.

### V. Simplicity (YAGNI)

Start with the minimum viable implementation. Do not build for
hypothetical future requirements.

- Features outside hackathon scope (fiat on/off ramp, mobile app,
  real risk scoring, KYC) MUST NOT be implemented.
- Prefer simulation over real cross-chain operations when
  real implementation adds disproportionate complexity.
- Use testnet (Sepolia or Base Sepolia) for all demo and
  development flows; mainnet integration is out of scope.
- Each new abstraction or indirection layer MUST be justified
  by a concrete, current need — not a future possibility.

**Rationale**: This is a hackathon project with a 1-day timeline.
Over-engineering is the primary risk to delivery.

## Technology Constraints

- **Frontend**: Web app (React/Next.js or Expo Web); native
  mobile is explicitly out of scope.
- **Wallet Infrastructure**: Openfort embedded wallets (user-
  facing) and Openfort backend wallet (AI agent). No MetaMask or
  external wallet connections required for MVP.
- **Yield Source**: Aave v3 lending pools on supported chains
  (Base, Polygon, Ethereum). No other protocols for MVP.
- **Stablecoin**: USDC only for MVP. Multi-asset support is
  out of scope.
- **Network**: Base recommended as primary demo chain (cheap,
  fast, Aave v3 supported). Multi-chain is a nice-to-have.
- **AI Agent**: Rate monitoring + rebalance decision engine.
  May be simulated with real rate data for demo purposes.
- **Gas Sponsorship**: All user-facing transactions MUST be
  gasless via Openfort Paymaster.

## Development Workflow

- **Incremental delivery**: Each user story (deposit, rebalance,
  withdraw, risk event, preferences) MUST be independently
  testable and demoable.
- **Demo-driven development**: Every feature MUST be visually
  demonstrable. Backend-only work MUST surface through the
  dashboard or notifications.
- **Commit discipline**: Commit after each completed task or
  logical group. Keep commits atomic and reversible.
- **Code review**: All PRs MUST verify compliance with this
  constitution's principles before merge.
- **Testing scope**: Focus on integration tests for critical
  paths (deposit → Aave, withdrawal, rebalance). Unit tests
  are optional given the hackathon timeline.

## Governance

This constitution is the authoritative source for project
principles and constraints. It supersedes conflicting guidance
in any other document.

- **Amendments**: Any change to principles MUST be documented
  with rationale, approved by the project lead, and reflected
  in a version bump.
- **Versioning**: Constitution follows semantic versioning.
  MAJOR = principle removal/redefinition. MINOR = new principle
  or material expansion. PATCH = clarification or wording fix.
- **Compliance**: All PRs and code reviews MUST verify alignment
  with active principles. Violations MUST be justified in the
  PR description if intentionally deviating.
- **Guidance**: Use `CLAUDE.md` for runtime development guidance
  and agent-specific conventions.

**Version**: 1.0.0 | **Ratified**: 2026-02-28 | **Last Amended**: 2026-02-28
