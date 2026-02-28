# Implementation Plan: Chat Agent — API Data Tools

**Branch**: `001-risk-quiz-strategies` | **Date**: 2026-02-28 | **Spec**: [spec.md](./spec.md)
**Input**: The chat agent cannot answer user questions about balances, action history, or portfolio state because it only has blockchain-level tools (Aave MCP, Openfort balance check) and no way to query the app's own NestJS API.

## Summary

Add an in-process MCP server (`api-tools`) with two read-only tools that call the existing NestJS API endpoints (`GET /investments/:investmentId/actions` and `GET /investments/portfolio?userId=X`). Wire it into the chat agent and pass `investmentId`/`userId` through the chat prompt so the agent can look up action history and portfolio state when answering user questions.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20+)
**Primary Dependencies**: `@anthropic-ai/claude-agent-sdk`, `zod`
**Storage**: N/A (reads from existing NestJS API over HTTP)
**Testing**: Manual — start agent, ask questions in chat
**Target Platform**: Node.js server (agent at port 3002)
**Project Type**: Monorepo service (`apps/agent`)
**Constraints**: Read-only tools only (chat mode must not execute transactions)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Security-First | PASS | New tools are read-only (GET endpoints). No fund movement. No new contract interactions. |
| II. Zero-Friction UX | PASS | Users get better answers — the agent can now answer "What's my balance?" and "Explain last action" properly. |
| III. Guardrailed Autonomy | PASS | Tools added to `chatToolsAllowList` only. Chat agent already restricted to `maxTurns: 5` and read-only mode. |
| IV. Transparency & Trust | PASS | This directly enables the "Why?" explanation for agent actions — Principle IV requires this capability. |
| V. Simplicity (YAGNI) | PASS | Minimal change: 1 new file, 2 modified files. Uses existing API endpoints — no new database queries. |

## Project Structure

### Documentation (this feature)

```text
specs/001-risk-quiz-strategies/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── contracts/           # Phase 1 output
```

### Source Code (repository root)

```text
apps/agent/src/
├── mcp/
│   ├── aave-tools.ts        # Existing — Aave MCP wrapper
│   ├── openfort-tools.ts    # Existing — Openfort SDK tools
│   └── api-tools.ts         # NEW — NestJS API tools (get_investment_actions, get_portfolio)
├── chat-prompt.ts           # MODIFY — add investmentId/userId to context, update allowlist + prompt
├── server.ts                # MODIFY — wire api-tools into chat handler, pass IDs
└── index.ts                 # Unchanged
```

**Structure Decision**: All changes are within `apps/agent/src/`. The new file follows the existing MCP adapter pattern established by `aave-tools.ts` and `openfort-tools.ts`.

## Constitution Check — Post-Design

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Security-First | PASS | Tools call GET-only API endpoints. No new contract interactions. No fund movement possible. |
| II. Zero-Friction UX | PASS | Users ask plain-English questions and get plain-English answers with real data. |
| III. Guardrailed Autonomy | PASS | Tools in `chatToolsAllowList` only (no execution tools). Chat agent limited to `maxTurns: 5`. |
| IV. Transparency & Trust | PASS | Directly enables "Why?" explanation for agent actions (Principle IV requirement). |
| V. Simplicity (YAGNI) | PASS | 1 new file (87 lines), 2 edits (~15 lines each). Zero new dependencies. Reuses existing API endpoints. |

## Implementation Details

### File 1: `apps/agent/src/mcp/api-tools.ts` (NEW)

In-process MCP server following the exact `aave-tools.ts` pattern:

```typescript
import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

// Helper: format JSON response for agent consumption
function textResult(data: unknown) {
  return { content: [{ type: 'text' as const, text: typeof data === 'string' ? data : JSON.stringify(data) }] };
}

export function createApiMcpServer(apiBaseUrl: string) {
  return createSdkMcpServer({
    name: 'api',
    version: '1.0.0',
    tools: [
      tool(
        'get_investment_actions',
        'Get agent action history for the current investment...',
        { investmentId: z.string() },
        async ({ investmentId }) => {
          const res = await fetch(`${apiBaseUrl}/investments/${investmentId}/actions`, { signal: AbortSignal.timeout(10_000) });
          if (!res.ok) throw new Error(`API returned ${res.status}`);
          return textResult(await res.json());
        },
      ),
      tool(
        'get_portfolio',
        'Get portfolio state: wallet balance, invested balance, earned yield, per-pool breakdown...',
        { userId: z.string() },
        async ({ userId }) => {
          const res = await fetch(`${apiBaseUrl}/investments/portfolio?userId=${userId}`, { signal: AbortSignal.timeout(10_000) });
          if (!res.ok) throw new Error(`API returned ${res.status}`);
          return textResult(await res.json());
        },
      ),
    ],
  });
}
```

### File 2: `apps/agent/src/chat-prompt.ts` (MODIFY)

1. Add `investmentId` and `userId` to `ChatContext`
2. Add `mcp__api__get_investment_actions` and `mcp__api__get_portfolio` to `chatToolsAllowList`
3. Embed IDs in system prompt + describe new tools

### File 3: `apps/agent/src/server.ts` (MODIFY)

In `/chat` handler:
1. Import `createApiMcpServer`
2. Pass `investmentId` + `userId` to `buildChatPrompt`
3. Add `api: createApiMcpServer(...)` to `mcpServers` in `query()` call

## Verification

1. Start all services (`pnpm dev` from root + `env -u CLAUDECODE tsx src/server.ts` in `apps/agent/`)
2. Open `http://localhost:3000/dashboard`
3. Ask **"What's my balance?"** → agent calls `get_portfolio`, reports wallet + invested amounts
4. Ask **"Explain last action"** → agent calls `get_investment_actions`, describes most recent action
5. Ask **"What APY am I getting?"** → agent combines `get_portfolio` + `aave_get_reserves`
6. Ask **"Gas prices"** → still works (existing `get_gas_price` tool unchanged)

## Complexity Tracking

No violations. Single new file + two focused edits.
