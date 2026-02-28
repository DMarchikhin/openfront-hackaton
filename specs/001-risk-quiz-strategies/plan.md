# Implementation Plan: Agent Chat Interface + Real-Time Thinking UI

**Branch**: `001-risk-quiz-strategies` | **Date**: 2026-02-28 | **Spec**: `specs/001-risk-quiz-strategies/spec.md`
**Input**: Replace the static agent action list with a real-time chat interface showing the agent's thinking process, tool calls, and reasoning as it runs. Add interactive commands so users can ask questions and trigger actions.

## Summary

The Claude Agent SDK `query()` yields rich intermediate messages (thinking, tool calls, progress, text deltas) that are currently discarded — only the final result is captured. This plan:

1. **Agent server** streams SDK messages to connected frontends via SSE (Server-Sent Events)
2. **Frontend** replaces the static `AgentActions` list with a live `AgentChat` panel that renders thinking, tool executions, and results in real-time
3. **Interactive chat** lets users type natural language commands ("What's my APY?", "Invest $500 more") that trigger lightweight agent queries
4. **Polish**: browser notifications, yield projection card, quick-action chips

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20+)
**Primary Dependencies**: Next.js 15 (App Router, React 19), NestJS 10, `@anthropic-ai/claude-agent-sdk`, Tailwind CSS
**Storage**: PostgreSQL via MikroORM 6.4 (existing `agent_action` table)
**Testing**: Manual end-to-end (hackathon scope)
**Target Platform**: Web (localhost development)
**Project Type**: Monorepo (apps/api, apps/web, apps/agent)
**Constraints**: Agent execution 3-10 min; SSE for streaming; no new npm dependencies

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Security-First | PASS | No changes to fund flow or wallet access; chat commands use same policy-enforced tools |
| II. Zero-Friction UX | PASS | Chat interface shows thinking in plain language; no DeFi jargon exposed |
| III. Guardrailed Autonomy | PASS | Interactive commands use same MCP tool allowlist; no new capabilities |
| IV. Transparency & Trust | **STRONG PASS** | This feature IS transparency — users see every step the agent takes in real-time |
| V. Simplicity (YAGNI) | PASS | SSE over WebSocket; no new npm deps; reuses existing agent SDK streaming |

## Project Structure

### Source Code

```text
apps/
├── agent/
│   ├── src/
│   │   ├── server.ts              # MODIFY — add SSE endpoint, CORS, broadcast infra, /chat
│   │   ├── index.ts               # MODIFY — add onMessage callback to capture SDK events
│   │   └── chat-prompt.ts         # NEW — conversational prompt for interactive queries
│   └── .env                       # ADD NEXT_PUBLIC_AGENT_URL if needed
├── api/                           # NO CHANGES — persisted actions stay as-is
└── web/
    └── src/
        ├── app/dashboard/page.tsx              # MODIFY — wire AgentChat, remove polling
        ├── hooks/useAgentStream.ts             # NEW — SSE EventSource hook
        ├── components/dashboard/
        │   ├── AgentChat.tsx                   # NEW — main chat panel
        │   ├── AgentActions.tsx                # KEEP — fallback for non-streaming
        │   └── YieldProjection.tsx             # NEW — projected earnings card (P2)
        └── lib/api.ts                          # MODIFY — add sendAgentMessage()
```

## Implementation Details

### 1. Agent Server — Stream SDK Messages (`apps/agent/src/index.ts`)

**Current** (lines 114-118): The `for await` loop only captures `result`:
```typescript
for await (const message of agentQuery) {
  if (message.type === 'result' && message.subtype === 'success') {
    resultText = message.result;
  }
}
```

**New**: Add `onMessage?: (event: StreamEvent) => void` parameter to both `executeInvestment` and `rebalanceInvestment`. Expand the loop to emit all intermediate messages:

```typescript
type StreamEvent =
  | { type: 'thinking'; text: string }
  | { type: 'text'; text: string }
  | { type: 'tool_start'; tool: string }
  | { type: 'tool_progress'; tool: string; elapsed: number }
  | { type: 'tool_result'; summary: string }
  | { type: 'status'; description: string }
  | { type: 'result'; text: string }
  | { type: 'error'; message: string }
  | { type: 'done' };
```

Handle each SDK message type:
- `stream_event` with `content_block_delta` → emit `text` event (real-time text chunks)
- `assistant` with `message.content` text blocks → emit `thinking` event
- `tool_progress` → emit `tool_progress` with `tool_name` and `elapsed_time_seconds`
- `tool_use_summary` → emit `tool_result` with `summary`
- `system` with `task_started` → emit `status` with `description`
- `result` → emit `result` (keep existing parsing logic intact)

### 2. Agent Server — SSE Endpoint + CORS (`apps/agent/src/server.ts`)

Add in-memory subscriber registry:
```typescript
const activeStreams = new Map<string, Set<http.ServerResponse>>();
```

**New route: `GET /stream/:investmentId`**
- Parse investmentId from URL
- Set SSE headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`
- Set CORS: `Access-Control-Allow-Origin: http://localhost:3000`
- Register response in `activeStreams` map
- Send initial `event: connected\ndata: {}\n\n` heartbeat
- Clean up on `req.close`

**Helper: `broadcastEvent(investmentId, type, data)`**
- Iterates all SSE subscribers for that investmentId
- Writes `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`

**Modify `/execute` and `/rebalance`**: Pass `onMessage` callback that calls `broadcastEvent`. When execution completes, broadcast `done` event and clear subscribers.

**Add CORS**: Handle `OPTIONS` preflight for all routes. Add `Access-Control-Allow-Origin: http://localhost:3000` to all responses.

**New route: `POST /chat`** (interactive messages)
- Body: `{ investmentId, userId, message, context: { strategy, portfolio } }`
- Respond 202 immediately
- Run lightweight agent query with conversational prompt
- Stream responses via SSE to the same `investmentId` subscribers

### 3. Agent — Chat Prompt (`apps/agent/src/chat-prompt.ts`, new)

Lighter prompt for conversational queries (`maxTurns: 5`, same MCP tools minus execution tools by default):
- System prompt knows user's current strategy, portfolio state, recent actions
- Can answer: "What's my APY?", "Gas prices?", "Why did you skip that pool?"
- For action requests like "Invest $500 more": re-enables execution tools and runs full investment

### 4. Frontend — SSE Hook (`apps/web/src/hooks/useAgentStream.ts`, new)

```typescript
function useAgentStream(investmentId: string | null, isProcessing: boolean) {
  // Returns { messages: ChatMessage[], isConnected: boolean }
}
```

- Creates `EventSource` to `http://localhost:3002/stream/${investmentId}`
- Listens for typed events: `thinking`, `text`, `tool_start`, `tool_progress`, `tool_result`, `status`, `result`, `error`, `done`
- Coalesces consecutive `text` events into single message (buffer)
- Auto-cleans up on unmount

### 5. Frontend — Chat Panel (`apps/web/src/components/dashboard/AgentChat.tsx`, new)

Replaces `<AgentActions>` in the dashboard. Two modes:

**A) Live mode** (SSE connected, agent executing): Real-time message stream
**B) History mode** (agent complete): Shows persisted actions + chat input

Message rendering:

| Event | Visual |
|-------|--------|
| `thinking` | Gray italic, collapsible "Agent reasoning..." accordion |
| `text` | Left-aligned text bubble |
| `tool_start` | Pill: "Calling aave_get_reserves..." with spinner |
| `tool_progress` | Updated pill with elapsed time |
| `tool_result` | Checkmark pill with summary |
| `status` | Centered gray divider label |
| `result` | Green-bordered summary card |
| `error` | Red-bordered error card |
| `user` | Right-aligned blue bubble |

Component structure:
- **Header**: "Agent Activity" + live/idle status dot (pulsing green when connected)
- **Messages**: Scrollable list with auto-scroll via `useRef` + `scrollIntoView`
- **Input**: Text field + send button + quick-action chips above
- Quick actions: `[Check APY]` `[Gas prices]` `[Invest more]` `[Explain last action]`

### 6. Frontend — Dashboard Integration (`apps/web/src/app/dashboard/page.tsx`)

- Replace `<AgentActions actions={actions} isProcessing={...} />` with `<AgentChat>`
- Add `handleSendMessage` → POST to `http://localhost:3002/chat`
- Keep 3s polling as fallback for late-join scenarios
- When SSE is connected, reduce polling to 10s (just for persistence sync)

### 7. Frontend — API additions (`apps/web/src/lib/api.ts`)

- Add `ChatMessage` discriminated union type
- Add `sendAgentMessage(investmentId, userId, message)` → POST to agent server directly (bypasses NestJS API for hackathon simplicity)
- Add `NEXT_PUBLIC_AGENT_URL` env var support

### 8. Yield Projection Card (P2) (`apps/web/src/components/dashboard/YieldProjection.tsx`, new)

Simple projected earnings card between InvestmentSummary and AgentChat:
- Takes `investedAmount` and `apyPercent` props
- Shows projections: 1mo / 3mo / 6mo / 12mo
- Small SVG sparkline for visual appeal (no charting library)

### 9. Browser Notifications (P2)

In `useAgentStream`, when `result` event arrives:
```typescript
if (Notification.permission === 'granted') {
  new Notification('Autopilot Savings', { body: 'Agent finished!' });
}
```
Request permission on first dashboard visit.

## Files Changed Summary

| File | Change Type | Priority |
|------|------------|----------|
| `apps/agent/src/index.ts` | Modify | P0 |
| `apps/agent/src/server.ts` | Modify | P0 |
| `apps/agent/src/chat-prompt.ts` | New | P1 |
| `apps/web/src/hooks/useAgentStream.ts` | New | P0 |
| `apps/web/src/components/dashboard/AgentChat.tsx` | New | P0 |
| `apps/web/src/app/dashboard/page.tsx` | Modify | P0 |
| `apps/web/src/lib/api.ts` | Modify | P1 |
| `apps/web/src/components/dashboard/YieldProjection.tsx` | New | P2 |

## Verification

1. Start all services: Aave MCP (8080), agent (3002), API (3001), web (3000)
2. Click "Start investing" → dashboard shows AgentChat panel
3. SSE connects → real-time messages appear: "Calling aave_get_reserves..." → tool result → agent thinking → "Supplying $X to Aave..." → tx confirmation → summary card
4. After agent completes → browser notification → chat input becomes active
5. Type "What's my current APY?" → agent responds with live rate data in chat
6. Click "Invest more" chip → enter amount → new streaming execution starts
7. Refresh page mid-execution → polling loads persisted actions, SSE reconnects for remaining events
