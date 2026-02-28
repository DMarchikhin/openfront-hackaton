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

---

## Phase 3 Research (Portfolio Dashboard)

### R16: Reading On-Chain aToken Balances

**Decision**: Use viem `readContract` with standard ERC-20 `balanceOf` on the aToken address, called from the NestJS API.

**Rationale**: aTokens are standard ERC-20 tokens. Their balance reflects the real-time position including accrued interest (rebasing). A simple `balanceOf` call returns the current value. No need for complex Aave data provider calls. Reading in the API (not the agent) avoids spawning Claude SDK query() for a simple RPC read.

**Alternatives considered**:
- Aave UI Pool Data Provider `getUserReserveData()` — more data but requires knowing the data provider address and complex ABI. Overkill for USDC-only.
- Calling Aave MCP `get_balance` tool — adds unnecessary network hop through agent.
- Subgraph/indexer — adds infrastructure dependency.
- Agent-side portfolio query — wasteful of API credits, 5-10s latency for one balance read.

**Key finding**: The aUSDC address for Base Sepolia Aave V3 Pool (`0x07eA79F68B2B3df564D0A34F8e19D9B1e339814b`) is `0xf53B60F4006cab2b3C4688ce41fD5362427A2A66`. Confirmed via tx logs from supply tx `0x96540603...`.

### R17: Portfolio Data Computation

**Decision**: Compute portfolio positions from existing `AgentAction` records + on-chain aToken balance. No new database tables.

**Rationale**: The `agent_action` table already stores every supply/withdraw/rate_check action with pool details, amount, APY, txHash. By aggregating executed actions per pool, we get net invested. Difference between on-chain aToken balance and net invested = earned yield.

**Formula**:
```
totalSupplied = SUM(amount) WHERE actionType='supply' AND status='executed'
totalWithdrawn = SUM(amount) WHERE actionType='withdraw' AND status='executed'
netInvested = totalSupplied - totalWithdrawn
onChainBalance = aToken.balanceOf(smartAccount) / 1e6
earnedYield = onChainBalance - netInvested
```

**Alternatives considered**:
- Snapshot table (periodic balance recording) — adds complexity. On-chain read is always fresh.
- Separate yield entity — premature; yield is derived from balance delta.

### R18: aToken Address Discovery

**Decision**: Hardcode known aToken addresses for supported pools in a lookup map.

**Rationale**: Single pool (Aave V3 USDC on Base Sepolia). Address is fixed. Map is easily extended later.

**Map**: `{ '84532:0x036cbd53842c5426634e7929541ec2318f3dcf7e': '0xf53B60F4006cab2b3C4688ce41fD5362427A2A66' }`

**Alternatives considered**:
- On-chain `getReserveData(asset)` — extra RPC call, not needed for single known asset.
- Aave address book npm — often outdated for testnets.

### R19: Frontend Portfolio Architecture

**Decision**: Two new components on the existing dashboard page. No new routes.

**Rationale**: Portfolio is contextual to the active investment. Two components: `PortfolioSection` (pool cards with balances) and `PoolTransactions` (expandable per-pool tx history). Existing `InvestmentSummary` and `AgentActions` remain.

**Alternatives considered**:
- Separate `/portfolio` route — fragments post-investment experience.
- Replacing `AgentActions` — loses full chronological timeline.

---

## Phase 4 Research (Async Agent Execution)

### R20: Real-time notification mechanism

**Decision**: HTTP Polling (3-second interval)

**Rationale**:
- Agent execution takes 3–10 minutes. A 3-second polling interval means max 3s delay after completion — negligible for a minutes-long operation.
- Zero new dependencies. Reuses existing `GET /investments/:id/actions` endpoint.
- Polling is inherently resilient to disconnections — no reconnection logic needed.
- The real architectural improvement is making the agent fire-and-forget; the notification mechanism is secondary.

**Alternatives considered**:
- **SSE (Server-Sent Events)**: NestJS supports `@Sse()` natively. But the server would still poll the DB internally, just moving polling from client to server. Adds connection management complexity (open connections per user). Better for future progress streaming but overkill now.
- **WebSocket (`@nestjs/websockets` + `socket.io`)**: Bidirectional communication not needed (frontend only listens). Requires two new npm packages. Most complex option. Would be justified if we needed streaming progress events during agent execution (e.g., "Checking rates...", "Executing supply...") but that requires agent-level changes too.

### R21: Agent completion reporting

**Decision**: Agent server POSTs results back to NestJS API via callback endpoint

**Rationale**:
- Agent server is a separate process with no direct DB access.
- Callback (`POST /investments/:id/actions/report`) is the cleanest inter-service communication.
- API already has `saveAgentActions()` — callback handler reuses it.
- Agent responds 202 immediately → runs in background → POSTs back when done.

**Alternatives considered**:
- Direct DB from agent: Requires PostgreSQL + MikroORM in agent. Tight coupling.
- Message queue (Redis/RabbitMQ): Over-engineered for single producer-consumer.
- Longer HTTP timeout (10 min): "Works" but wastes server resources holding open connections.

### R22: Processing status indicator

**Decision**: Create a `rate_check | pending` action immediately when agent is triggered, before async execution begins

**Rationale**:
- Existing `AgentAction` entity already supports `PENDING` status.
- No schema migration needed — reuses existing table.
- Frontend can distinguish: `pending` = processing, `executed`/`failed` = done.
- Existing `createFailedAction()` already uses this pattern for error tombstones.

**Alternatives considered**:
- New `AgentExecution` entity with job tracking: Cleaner model but requires migration, repository, endpoints. Over-engineered.
- `UserInvestment.agentStatus` field: Requires migration. Couples investment entity to agent lifecycle.
- In-memory state: Lost on restart. Not durable.

---

## Phase 5 Research (Agent Chat Interface)

### R23: Real-time streaming mechanism for agent thinking

**Decision**: SSE (Server-Sent Events) from agent server directly to frontend, bypassing NestJS API.

**Rationale**:
- SSE is unidirectional (agent → user), matching the primary use case. User commands go via simple POST.
- Zero new npm dependencies: Node.js `http` supports SSE natively. Browser `EventSource` API handles reconnect.
- Agent server already uses raw `http.createServer()` — adding SSE headers is trivial.
- Direct connection (frontend → agent:3002) avoids building SSE passthrough in NestJS. For production this would use a reverse proxy; for hackathon, CORS is sufficient.
- No protocol upgrade handshake needed (unlike WebSocket). Testable with `curl`.

**Alternatives considered**:
- **WebSocket** (`ws` or `socket.io`): Bidirectional but overkill — user input is POST-based, not streaming. Requires additional npm packages and protocol upgrade handling.
- **SSE through NestJS API**: Cleaner architecture but NestJS would need to maintain open connections to agent server AND forward to frontend — double the complexity for no benefit at hackathon scale.
- **Enhanced polling** (500ms interval): Simpler but wastes bandwidth and can't deliver character-by-character text streaming. Thinking/tool progress would be chunky.
- **SSE from agent directly (chosen)**: Simplest path, zero dependencies, hackathon-appropriate.

### R24: Claude Agent SDK streaming message types

**Decision**: Capture all `SDKMessage` types from `query()` async generator and forward via SSE.

**Rationale**: The SDK's `query()` function returns `AsyncGenerator<SDKMessage, void>`. Currently only the final `result` message is captured (lines 114-118 of `index.ts`). The SDK yields:

| SDK Message Type | Subtype | Useful Data | UI Treatment |
|-----------------|---------|-------------|-------------|
| `stream_event` | `content_block_delta` | `delta.text` (real-time text chunks) | Typewriter text in chat |
| `assistant` | — | `message.content` (text blocks), `message.thinking` | Thinking accordion |
| `tool_progress` | — | `tool_name`, `elapsed_time_seconds` | Animated tool pill with timer |
| `tool_use_summary` | — | `summary`, `preceding_tool_use_ids` | Completed tool pill |
| `system` | `task_started` | `description` | Status divider |
| `system` | `task_progress` | `description`, `usage` | Progress update |
| `result` | `success` | `result` text, `duration_ms`, `num_turns` | Summary card |
| `result` | `error_*` | `error` message | Error card |

**Key finding**: The SDK types are defined in `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts`. The `stream_event` type wraps Anthropic's `BetaRawMessageStreamEvent` which includes `content_block_start`, `content_block_delta`, `content_block_stop`, and message-level events.

**Alternatives considered**:
- Only forward `assistant` complete messages: Misses real-time text streaming and tool progress.
- Forward raw SDK messages to frontend: Leaks SDK internals. Better to map to our own event types.
- Normalized event types (chosen): Map SDK messages to a clean `StreamEvent` union type that the frontend can render without knowing SDK internals.

### R25: Interactive chat architecture

**Decision**: Lightweight conversational agent via `POST /chat` on agent server, streaming responses through the same SSE channel.

**Rationale**:
- Reuses the SSE infrastructure built for execution streaming — same `activeStreams` map, same `broadcastEvent` helper.
- Chat uses `query()` with `maxTurns: 5` (vs 10-15 for investment execution) and a conversational system prompt.
- Read-only MCP tools by default (rates, balances). Execution tools enabled only for explicit action requests ("invest $500 more").
- Frontend sends POST, responses stream via SSE. No need for a separate streaming response — the `investmentId` SSE channel handles it.

**Alternatives considered**:
- Chat through NestJS API: Adds HTTP hop. Agent server already has MCP tools.
- Streaming response body on the POST: More complex on frontend (ReadableStream parsing). SSE is already set up.
- Separate SSE channel per chat session: Over-engineered. One channel per investmentId is sufficient.

### R26: Frontend chat component architecture

**Decision**: Single `AgentChat` component with two modes (live streaming / history), wrapping existing `AgentActions` as fallback.

**Rationale**:
- `AgentActions` already handles status badges, action icons, and the card layout. Keep it as the fallback when SSE is unavailable (late join, SSE error).
- `AgentChat` adds: message list with different renderers per type, auto-scroll, chat input, quick-action chips.
- No external UI library needed. Tailwind CSS can handle all the chat bubble styling, typewriter animations (via `animate-pulse`), and collapsible accordions (via state toggle).
- Custom `useAgentStream` hook manages `EventSource` lifecycle and typed message dispatching.

**Alternatives considered**:
- Use a chat UI library (e.g., `react-chat-elements`): Adds dependency, doesn't match existing Tailwind design system.
- Replace `AgentActions` entirely: Loses the clean static view for completed executions.
- Build as a separate `/chat` route: Fragments the dashboard experience. Chat should be contextual to the active investment.
