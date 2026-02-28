# Agent Contracts: SSE Streaming + Chat

**Date**: 2026-02-28

## SSE Streaming Endpoint

### GET /stream/:investmentId

Server-Sent Events endpoint. Frontend subscribes before triggering execution. Events stream in real-time as the agent runs.

**Response Headers**:
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
Access-Control-Allow-Origin: http://localhost:3000
```

**Event Types**:

```
event: connected
data: {}

event: thinking
data: {"text": "Let me check the current Aave rates for USDC pools..."}

event: text
data: {"text": "The current USDC supply APY on Base is 4.2%."}

event: tool_start
data: {"tool": "aave_get_reserves"}

event: tool_progress
data: {"tool": "aave_get_reserves", "elapsed": 2.3}

event: tool_result
data: {"tool": "aave_get_reserves", "summary": "Retrieved reserve data for USDC on Base"}

event: status
data: {"description": "Analyzing cost-benefit for each pool"}

event: result
data: {"text": "{...json result...}", "duration": 45000, "turns": 8}

event: error
data: {"message": "Failed to get gas price from Aave MCP"}

event: done
data: {}
```

**Lifecycle**:
1. Client opens EventSource connection
2. Server sends `connected` event immediately
3. When agent execution starts (via `/execute` or `/rebalance`), events stream in real-time
4. When execution completes, `result` then `done` events are sent
5. Server closes after `done` or after 15-minute timeout

**Connection behavior**:
- Multiple clients can subscribe to the same investmentId
- If no execution is running, connection stays open (idle) waiting for events
- `EventSource` auto-reconnects on disconnect

---

## Interactive Chat Endpoint

### POST /chat

Triggers a conversational agent query. Responses stream via the SSE channel for the given investmentId.

**Request**:
```json
{
  "investmentId": "uuid",
  "userId": "user-123",
  "message": "What is my current APY?",
  "context": {
    "strategyName": "Safe Harbor",
    "strategyId": "uuid",
    "riskLevel": "conservative",
    "walletAddress": "0x..."
  }
}
```

**Response** `202 Accepted`:
```json
{
  "status": "accepted",
  "investmentId": "uuid"
}
```

Actual responses stream via `GET /stream/:investmentId` as `text`, `thinking`, `tool_*`, and `result` events.

**Supported queries** (examples):
- "What is my current APY?" → reads Aave rates via `aave_get_reserves`
- "Check gas prices" → calls `get_gas_price`
- "Why did you skip the second pool?" → answers from execution context
- "Invest $500 more" → triggers full investment execution with streaming
- "What's my balance?" → calls `openfort_get_balance`

**Tool access**:
- Read-only by default: `aave_get_reserves`, `get_gas_price`, `get_balance`, `openfort_get_balance`
- Execution tools enabled for action requests: `openfort_create_transaction`, `aave_stake`

---

## CORS Configuration

All agent server endpoints must include:

```
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

`OPTIONS` preflight handler returns 204 with above headers.

---

## Frontend StreamEvent Types

The frontend `useAgentStream` hook dispatches these typed messages:

```typescript
type ChatMessage =
  | { id: string; type: 'thinking'; text: string; timestamp: number }
  | { id: string; type: 'text'; text: string; timestamp: number }
  | { id: string; type: 'tool_start'; tool: string; timestamp: number }
  | { id: string; type: 'tool_progress'; tool: string; elapsed: number; timestamp: number }
  | { id: string; type: 'tool_result'; tool: string; summary: string; timestamp: number }
  | { id: string; type: 'status'; description: string; timestamp: number }
  | { id: string; type: 'action'; actionType: string; pool: string; amount: number; status: string; timestamp: number }
  | { id: string; type: 'result'; text: string; duration?: number; turns?: number; timestamp: number }
  | { id: string; type: 'error'; message: string; timestamp: number }
  | { id: string; type: 'user'; text: string; timestamp: number };
```

`tool_start` and `tool_progress` events for the same tool are merged into a single message (updated in-place).
