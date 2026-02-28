# Research: Risk Quiz & Investment Strategies

**Date**: 2026-02-28
**Branch**: `001-risk-quiz-strategies`

---

## Phase 1 Research (Quiz, Strategies, Dashboard)

### R1: Monorepo Tooling

**Decision**: pnpm workspaces (no Turborepo)
**Rationale**: For a 2-package monorepo (frontend + backend), pnpm
workspaces provide fast installs, good disk usage, and native workspace
support with minimal configuration. Turborepo adds caching overhead
that isn't justified for a hackathon.
**Alternatives considered**: npm workspaces (slower installs), Turborepo
(overkill for 2 packages), Nx (too much tooling overhead).

### R2: Monorepo Folder Convention

**Decision**: `apps/web` (Next.js) + `apps/api` (NestJS) at root
**Rationale**: Follows established NestJS monorepo conventions. Clean
separation. Room to add shared packages later without refactoring.
**Alternatives considered**: `frontend/` + `backend/` (less standard),
`packages/` flat structure (not suitable for apps).

### R3: Shared Types Strategy

**Decision**: No shared types package. DTOs defined in backend, frontend
defines its own types matching API responses.
**Rationale**: For a hackathon with ~5 API endpoints, the overhead of
maintaining a shared package outweighs the benefit. Types can be
extracted later if the project grows.
**Alternatives considered**: `packages/shared` workspace package (adds
build step and configuration).

### R4: Hexagonal Architecture Approach

**Decision**: Pragmatic hexagonal architecture per NestJS module with
three layers: domain, application, infrastructure. Outbound ports
(repository interfaces) ALWAYS abstracted. Inbound ports (use case
interfaces) skipped — use concrete implementations directly.
**Rationale**: Outbound ports are the core benefit of hexagonal arch
(enable test doubles, DB swaps). Inbound port interfaces add ceremony
without benefit at hackathon scale. User explicitly requested ports
and adapters but also simplicity.
**Alternatives considered**: Full hexagonal with inbound + outbound
ports (too ceremonial), plain NestJS services (no architecture).

### R5: MikroORM Entity Strategy

**Decision**: MikroORM decorators directly on domain entity classes
(pragmatic approach). No separate ORM entity mapping layer.
**Rationale**: Cuts boilerplate in half. MikroORM decorators are
metadata-only (non-invasive). Domain entities still contain business
logic via methods. For a hackathon, the mapping layer between domain
and ORM entities adds significant overhead with minimal benefit.
**Alternatives considered**: Separate ORM entities with mapping in
repositories (cleaner but 2x the entity classes).

### R6: MikroORM Repository Pattern

**Decision**: Use `EntityRepository` via `@InjectRepository()` for
queries. Inject `EntityManager` for persistence mutations. Custom
repository classes only when reusable query logic emerges.
**Rationale**: MikroORM v6 removed persistence methods from
EntityRepository. Using EntityManager directly for mutations is the
recommended pattern. Avoids unnecessary custom repository boilerplate.
**Alternatives considered**: Custom repositories extending
EntityRepository for all entities (unnecessary for simple CRUD).

### R7: Migration Strategy

**Decision**: Auto-generated migrations via `mikro-orm migration:create`
for development. Use `schema:update --run` for rapid hackathon iteration
if migrations become friction.
**Rationale**: Auto-generated migrations provide safety with minimal
effort. Schema sync is available as fallback for maximum speed.
**Alternatives considered**: Manual migration files (too slow),
`synchronize: true` only (unsafe for shared databases).

### R8: Testing Strategy

**Decision**: Unit tests for domain layer ONLY. No tests for
application or infrastructure layers. Tests live alongside domain
entities in `__tests__/` directories or in a top-level `test/unit/`
mirror structure.
**Rationale**: User explicitly requested "unit test for domain not
app layer". Domain tests provide highest ROI — they test business
logic without framework dependencies, run instantly, and require no
mocking of infrastructure.
**Alternatives considered**: Full test pyramid (too much for hackathon),
integration tests (slower, require DB).

### R9: Frontend Architecture

**Decision**: Next.js App Router with Tailwind CSS. Simple page-based
routing: `/` (home), `/quiz` (quiz flow), `/strategies` (strategy
selection), `/dashboard` (active investment). Components organized
by feature.
**Rationale**: App Router is the Next.js default. Tailwind provides
utility-first styling with zero custom CSS files. Feature-based
component organization keeps related UI together.
**Alternatives considered**: Pages Router (legacy), CSS modules
(more files), styled-components (additional dependency).

### R10: Concurrent Development

**Decision**: Use `concurrently` package in root `package.json` to
run both apps with a single `pnpm dev` command. Frontend on port
3000, backend on port 3001.
**Rationale**: Single command to start the full stack. Standard port
convention. No complex orchestration needed.
**Alternatives considered**: Turborepo `turbo dev` (overkill), manual
terminal management (inconvenient).

---

## Phase 2 Research (Investment Agent)

### R11: Anthropic Agent SDK (TypeScript)

**Decision**: Use `@anthropic-ai/claude-agent-sdk` (TypeScript) for the
investment agent.

**Rationale**: The project is already TypeScript/NestJS. The TS SDK
provides `query()` which returns an async iterable of agent messages,
handles tool execution autonomously, and supports MCP servers natively
(stdio, SSE, HTTP, and in-process via `createSdkMcpServer()`).

**Key facts**:
- Package: `@anthropic-ai/claude-agent-sdk`
- Core API: `query({ prompt, options: { mcpServers, allowedTools } })`
- MCP tools follow naming: `mcp__<server-name>__<tool-name>`
- Custom in-process tools: `createSdkMcpServer()` + `tool()` with Zod
- Supports `permissionMode: "bypassPermissions"` for headless operation
- Requires `ANTHROPIC_API_KEY` env var

**Alternatives considered**:
- Raw Anthropic SDK (`@anthropic-ai/sdk`): Must implement tool loop manually
- Python Agent SDK: Language mismatch with existing codebase
- LangChain/LangGraph: Unnecessary abstraction for MCP-based agents

### R12: Openfort MCP Server

**Decision**: Use Openfort MCP for account/policy management. Use
`@openfort/openfort-node` SDK directly for transaction execution
(wrapped as custom in-process MCP tools).

**Rationale**: The Openfort MCP server (`https://mcp.openfort.io/sse`)
has 42 tools for project, account, policy, and contract management.
However, `create-transaction` is **commented out** in the source code —
the MCP server cannot execute on-chain transactions. Transaction
execution must go through the Openfort Node SDK.

**Key facts**:
- Remote SSE endpoint: `https://mcp.openfort.io/sse`
- Connection: `npx mcp-remote https://mcp.openfort.io/sse`
- Auth: PKCE OAuth flow on first connection
- Can: create projects, accounts (smart wallets), policies, policy rules
- Cannot: execute transactions (tool disabled in source)
- Backend wallets (`dac_` prefix) with TEE key storage
- Policy enforcement: `contract_functions`, `rate_limit`, gas limits

**Approach**: Build custom in-process MCP tools wrapping
`@openfort/openfort-node` for `transactionIntents.create()` to execute
supply/withdraw on Aave via Openfort policy-enforced backend wallets.

**Alternatives considered**:
- Openfort MCP only: Cannot execute transactions (tool disabled)
- Openfort REST API only (no MCP): Loses agent-native tool integration
- Hybrid approach (chosen): MCP for management, custom tools for execution

### R13: Aave MCP Server

**Decision**: Use `Tairon-ai/aave-mcp` for Aave interactions (rates +
execution) on Base network.

**Rationale**: No official Aave MCP exists. Tairon-ai/aave-mcp is the
only community MCP that supports both reading rates AND executing
transactions (supply, withdraw, borrow, repay). It runs on NestJS,
supports Base chain, and has 22+ tools including `aave_get_reserves`,
`aave_stake` (supply), `aave_withdraw`, `get_balance`, `get_gas_price`.

**Key facts**:
- Repository: `https://github.com/Tairon-ai/aave-mcp`
- Transport: HTTP/SSE at `/mcp` and `/mcp/sse`
- Aave V3 support: Yes
- Chains: Base (chain ID 8453) — aligns with constitution
- Key tools: `aave_stake`, `aave_withdraw`, `aave_get_reserves`,
  `aave_get_user_positions`, `get_balance`, `get_gas_price`
- Requires: `RPC_URL`, `CHAIN_ID`, `PRIVATE_KEY` env vars

**Alternatives considered**:
- kukapay/aave-mcp (Python): Read-only, no execution
- defi-rates-mcp: Multi-chain rates but read-only
- Custom Aave MCP: More work for same result
- Tairon-ai/aave-mcp (chosen): Complete for Base, matches demo chain

### R14: Agent Architecture

**Decision**: Standalone `apps/agent` app in the monorepo that connects
to the NestJS API for strategy data and uses MCP tools for on-chain
operations.

**Rationale**: The agent is a separate process that runs autonomously.
It reads strategy configuration from the API, then uses Claude to reason
about optimal pool allocation based on current rates, gas costs, and
the user's amount. Executes through Openfort policy-enforced wallets.

**Key design decisions**:
- Agent is a TypeScript app (`apps/agent`) in the pnpm workspace
- Triggered by the API when a user starts/switches investing
- Flow: reads strategy → fetches live Aave rates → calculates optimal
  allocation considering gas costs → executes supply via Openfort
- Cost-benefit check: only rebalance if yield improvement > gas cost
  (constitution principle III)
- Agent actions logged with full audit trail (constitution principle I)

**Alternatives considered**:
- Agent inside NestJS API: Tighter coupling, harder to scale
- Cron-based agent: Simpler but can't reason about tradeoffs
- Standalone app (chosen): Clean separation, uses Claude for reasoning

### R15: Network & Testnet Strategy

**Decision**: Use Base Sepolia testnet for demo. Single-chain for MVP.

**Rationale**: Constitution principle V (Simplicity) says to use testnet
and avoid disproportionate complexity. Base is the recommended demo
chain. Tairon-ai/aave-mcp supports Base natively.

**Key facts**:
- Base Sepolia chain ID: 84532
- Aave V3 deployed on Base Sepolia
- USDC test tokens available via faucets
- Openfort supports Base

**Alternatives considered**:
- Ethereum Sepolia: Higher gas costs even on testnet
- Multi-chain: Too complex for hackathon
- Base Sepolia (chosen): Cheapest, fastest, Aave V3 available
