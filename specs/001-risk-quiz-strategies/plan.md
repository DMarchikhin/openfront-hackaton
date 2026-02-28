# Implementation Plan: Async Agent Execution + Frontend Polling

**Branch**: `001-risk-quiz-strategies` | **Date**: 2026-02-28 | **Spec**: `specs/001-risk-quiz-strategies/spec.md`
**Input**: Agent execution times out after 120s. Need async fire-and-forget with callback + frontend polling.

## Summary

The investment agent (Claude Agent SDK + MCP tools) takes 3–10 minutes to complete. The current synchronous HTTP call from the NestJS API to the agent server has a 120-second `AbortSignal.timeout` that kills the request before the agent finishes. The fix:

1. **Agent server** responds `202 Accepted` immediately, runs agent in background, POSTs results back to API via callback
2. **NestJS API** creates a "processing" marker action in DB, awaits only the 202 confirmation (5s), exposes callback endpoint
3. **Frontend dashboard** polls `GET /investments/:id/actions` every 3 seconds until completion

Architecture decision: **HTTP Polling** (not WebSocket, not SSE). See `research.md` R20 for full rationale.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20+)
**Primary Dependencies**: NestJS 10 (API), Next.js 15/React 19 (frontend), `@anthropic-ai/claude-agent-sdk` + `@openfort/openfort-node` (agent)
**Storage**: PostgreSQL via MikroORM 6.4 (existing `agent_action` table)
**Testing**: Jest (existing)
**Target Platform**: Web (localhost development)
**Project Type**: Monorepo (apps/api, apps/web, apps/agent)
**Constraints**: Agent execution is 3-10 minutes; must not block HTTP connections

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Security-First | PASS | No changes to fund flow or wallet access |
| II. Zero-Friction UX | PASS | Polling gives real-time feedback without user action |
| III. Guardrailed Autonomy | PASS | Agent still operates within policy constraints |
| IV. Transparency & Trust | PASS | Processing marker + polling gives visibility into agent state |
| V. Simplicity (YAGNI) | PASS | Polling over WebSocket/SSE; no new dependencies; reuses existing endpoint |

## Project Structure

### Source Code

```text
apps/
├── agent/
│   ├── src/
│   │   ├── server.ts              # MODIFY — respond 202, run async, callback
│   │   └── index.ts               # NO CHANGE
│   └── .env                       # ADD API_SERVICE_URL
├── api/
│   └── src/modules/investment/
│       ├── application/
│       │   └── execute-investment.use-case.ts   # MODIFY — 5s timeout, marker action, reportAgentResults()
│       └── infrastructure/
│           └── investment.controller.ts         # MODIFY — add POST /:id/actions/report
└── web/
    └── src/
        ├── app/dashboard/page.tsx               # MODIFY — add polling useEffect
        └── components/dashboard/
            └── AgentActions.tsx                  # MODIFY — accept isProcessing prop
```

## Implementation Details

### 1. Agent Server — Async Execution (`apps/agent/src/server.ts`)

**Current**: `const result = await executeInvestment(params); send(res, 200, result);` — blocks until agent completes.

**New**: Respond 202 immediately, run in background, POST callback when done.

For both `/execute` and `/rebalance` handlers:
```typescript
// Read body, respond immediately
const params = (await readBody(req)) as ExecuteInvestmentParams;
send(res, 202, { status: 'accepted', investmentId: params.investmentId });

// Background execution + callback
executeInvestment(params)
  .then(async (result) => {
    const apiUrl = process.env.API_SERVICE_URL ?? 'http://localhost:3001/api';
    await fetch(`${apiUrl}/investments/${params.investmentId}/actions/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: params.userId,
        strategyId: params.strategy.id,
        ...result,
      }),
    });
    console.log(`[agent] callback sent for ${params.investmentId}`);
  })
  .catch((err) => {
    console.error(`[agent] execution failed for ${params.investmentId}:`, err.message);
    // Callback with failure
    const apiUrl = process.env.API_SERVICE_URL ?? 'http://localhost:3001/api';
    fetch(`${apiUrl}/investments/${params.investmentId}/actions/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: params.userId,
        strategyId: params.strategy.id,
        actions: [{ actionType: 'rate_check', status: 'failed', rationale: `Agent failed: ${err.message}` }],
        summary: `Execution failed: ${err.message}`,
      }),
    }).catch(() => {});
  });
return; // Already responded 202
```

For `/rebalance`, the callback body uses `strategyId: params.newStrategy.id`.

**Env**: Add `API_SERVICE_URL=http://localhost:3001/api` to `apps/agent/.env` and `.env.example`.

### 2. NestJS API — Execute Use Case (`apps/api/src/modules/investment/application/execute-investment.use-case.ts`)

**Changes to `triggerAgent()` (lines 101-148)**:

a) **Create processing marker** before sending HTTP request:
```typescript
const marker = AgentAction.create({
  investmentId: params.investmentId,
  userId: params.userId,
  actionType: AgentActionType.RATE_CHECK,
  strategyId: params.strategy.id,
  chain: params.strategy.allowedChains[0] ?? 'base',
  protocol: 'Aave v3',
  asset: 'USDC',
  amount: '0',
  rationale: 'Agent is processing your investment...',
});
await this.agentActionRepo.save(marker);
```

b) **Shorten HTTP timeout** — only confirm 202 receipt (5 seconds):
```typescript
const response = await fetch(`${agentServiceUrl}/execute`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(params),
  signal: AbortSignal.timeout(5_000),
});
if (response.status !== 202) throw new Error(`Agent returned ${response.status}`);
// Don't parse body — results arrive via callback
```

c) **Remove `saveAgentActions` from triggerAgent()** — moved to callback handler.

d) **Same changes to `triggerRebalance()`** (lines 44-99).

e) **New method `reportAgentResults()`**:
```typescript
async reportAgentResults(
  investmentId: string,
  userId: string,
  strategyId: string,
  actions: Array<{ actionType?: string; pool?: { chain: string; protocol: string; asset: string }; ... }>,
): Promise<void> {
  // Delete the processing marker
  const existingActions = await this.agentActionRepo.findByInvestmentId(investmentId);
  const marker = existingActions.find(
    (a) => a.status === AgentActionStatus.PENDING && a.rationale.includes('Agent is processing'),
  );
  if (marker) await this.agentActionRepo.remove(marker);

  // Save real actions
  await this.saveAgentActions(investmentId, userId, strategyId, actions);
}
```

### 3. NestJS Controller — Callback Endpoint (`apps/api/src/modules/investment/infrastructure/investment.controller.ts`)

Add after the existing `POST /execute` handler:
```typescript
@Post(':investmentId/actions/report')
@HttpCode(204)
async reportActions(
  @Param('investmentId') investmentId: string,
  @Body() body: { userId: string; strategyId: string; actions: any[]; summary?: string },
) {
  await this.executeInvestmentUseCase.reportAgentResults(
    investmentId, body.userId, body.strategyId, body.actions ?? [],
  );
}
```

### 4. Frontend — Dashboard Polling (`apps/web/src/app/dashboard/page.tsx`)

Add a polling `useEffect` after the existing data-fetching effect:

```typescript
// Poll agent actions every 3s while agent is processing
useEffect(() => {
  if (!investment) return;
  const isProcessing = actions.length === 0 ||
    (actions.length > 0 && actions.every((a) => a.status === 'pending'));
  if (!isProcessing) return;

  const startTime = Date.now();
  const MAX_POLL_MS = 10 * 60 * 1000; // 10 minutes

  const poll = setInterval(() => {
    if (Date.now() - startTime > MAX_POLL_MS) {
      clearInterval(poll);
      return;
    }
    fetchAgentActions(investment.investmentId)
      .then((res) => {
        setActions(res.actions);
        const done = res.actions.some((a) => a.status === 'executed' || a.status === 'failed');
        if (done) clearInterval(poll);
      })
      .catch(() => {});
  }, 3_000);

  return () => clearInterval(poll);
}, [investment, actions]);
```

### 5. Frontend — Processing State (`apps/web/src/components/dashboard/AgentActions.tsx`)

Add `isProcessing` prop and show spinner when processing:

```typescript
interface AgentActionsProps {
  actions: AgentAction[];
  isProcessing?: boolean;  // NEW
}

// In render, when actions are empty and isProcessing:
if (actions.length === 0 && isProcessing) {
  return (
    <div className="...">
      <h3>Agent activity</h3>
      <div className="flex items-center gap-2 py-4">
        <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full" />
        <p className="text-sm text-gray-500">Agent is processing your investment...</p>
      </div>
    </div>
  );
}
```

In `dashboard/page.tsx`, pass `isProcessing`:
```typescript
const isProcessing = actions.length > 0 && actions.every((a) => a.status === 'pending');
// ...
<AgentActions actions={actions} isProcessing={isProcessing} />
```

### 6. Environment Variables

**`apps/agent/.env`** — add:
```
API_SERVICE_URL=http://localhost:3001/api
```

**`apps/agent/.env.example`** — add:
```
API_SERVICE_URL=http://localhost:3001/api
```

## Files Changed Summary

| File | Change Type | Description |
|------|------------|-------------|
| `apps/agent/src/server.ts` | Modify | Respond 202, run async, POST callback |
| `apps/agent/.env` | Modify | Add `API_SERVICE_URL` |
| `apps/agent/.env.example` | Modify | Add `API_SERVICE_URL` |
| `apps/api/src/modules/investment/application/execute-investment.use-case.ts` | Modify | 5s timeout, marker action, `reportAgentResults()` |
| `apps/api/src/modules/investment/infrastructure/investment.controller.ts` | Modify | Add `POST /:id/actions/report` |
| `apps/web/src/app/dashboard/page.tsx` | Modify | Add polling `useEffect`, pass `isProcessing` |
| `apps/web/src/components/dashboard/AgentActions.tsx` | Modify | Accept `isProcessing` prop, show spinner |

## Verification

1. Start all services: Aave MCP (8080), agent (3002), API (3001), web (3000)
2. Click "Start investing" on strategies page
3. API returns immediately → redirects to dashboard
4. Dashboard shows "Agent is processing..." with spinner
5. After 3-10 min: agent completes → POSTs callback → dashboard auto-updates with executed actions
6. Verify: `GET /investments/:id/actions` shows real actions (not just the processing marker)
7. Edge case: stop agent server mid-execution → callback never arrives → marker stays pending → user sees "processing" state (can retry later via `POST /execute`)
