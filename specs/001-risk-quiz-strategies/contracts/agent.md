# Agent Contracts: Investment Agent

**Date**: 2026-02-28

## Agent Entry Point

The agent is invoked programmatically when a user starts investing
or switches strategy. It can also run as a periodic check.

### Trigger: Execute Investment

Called by the API when `POST /investments/start` or
`PATCH /investments/switch` completes successfully.

**Input** (passed to agent prompt):
```json
{
  "userId": "user-123",
  "investmentId": "uuid",
  "strategy": {
    "id": "uuid",
    "name": "Steady Growth",
    "riskLevel": "balanced",
    "poolAllocations": [
      {
        "chain": "base",
        "protocol": "Aave v3",
        "asset": "USDC",
        "allocationPercentage": 60
      },
      {
        "chain": "base",
        "protocol": "Aave v3",
        "asset": "USDC",
        "allocationPercentage": 40
      }
    ],
    "rebalanceThreshold": 1.5,
    "allowedChains": ["base"]
  },
  "userAmount": "1000.00",
  "walletAddress": "0x..."
}
```

**Expected Agent Behavior**:
1. Fetch current Aave pool rates for each pool in the strategy
2. Fetch current gas prices on the target chain
3. For each pool allocation:
   - Calculate the dollar amount based on allocation percentage
   - Estimate gas cost for the supply transaction
   - Verify yield improvement exceeds gas cost (cost-benefit check)
4. Execute supply transactions via Openfort for allocations that
   pass the cost-benefit check
5. Skip allocations where gas cost exceeds projected yield improvement
6. Log all actions with rationale

**Output** (agent result):
```json
{
  "investmentId": "uuid",
  "actions": [
    {
      "actionType": "supply",
      "pool": "Aave v3 USDC",
      "chain": "base",
      "amount": "600.00",
      "gasCostUsd": 0.02,
      "expectedApy": 5.2,
      "status": "executed",
      "txHash": "0x...",
      "rationale": "Supplied $600 USDC to Aave v3 on Base at 5.2% APY. Gas cost $0.02 is negligible vs projected annual yield of $31.20."
    },
    {
      "actionType": "supply",
      "pool": "Aave v3 USDC",
      "chain": "base",
      "amount": "400.00",
      "gasCostUsd": 0.02,
      "expectedApy": 4.8,
      "status": "executed",
      "txHash": "0x...",
      "rationale": "Supplied $400 USDC to Aave v3 on Base at 4.8% APY. Gas cost $0.02 is negligible vs projected annual yield of $19.20."
    }
  ],
  "summary": "Successfully deployed $1,000 across 2 Aave pools on Base. Estimated combined APY: 5.04%."
}
```

---

## API Extensions

### POST /investments/execute

Triggers the investment agent for a given investment. Called by
the frontend after start/switch, or can be called independently.

**Request**:
```json
{
  "investmentId": "uuid",
  "userAmount": "1000.00"
}
```

**Response** `202 Accepted`:
```json
{
  "investmentId": "uuid",
  "status": "executing",
  "message": "Agent is processing your investment..."
}
```

The agent runs asynchronously. Results are available via the
agent actions endpoint.

---

### GET /investments/:investmentId/actions

Returns the agent's action log for a given investment.

**Response** `200 OK`:
```json
{
  "investmentId": "uuid",
  "actions": [
    {
      "id": "uuid",
      "actionType": "supply",
      "chain": "base",
      "protocol": "Aave v3",
      "asset": "USDC",
      "amount": "600.00",
      "gasCostUsd": 0.02,
      "expectedApyAfter": 5.2,
      "rationale": "Supplied $600 USDC to Aave v3 on Base...",
      "status": "executed",
      "txHash": "0x...",
      "executedAt": "2026-02-28T14:30:00Z"
    }
  ]
}
```

---

## MCP Tool Usage

### Aave MCP Tools (via Tairon-ai/aave-mcp)

| Tool | Purpose in Agent |
|------|-----------------|
| `aave_get_reserves` | Get current supply rates for USDC pools |
| `aave_get_user_positions` | Check existing positions before acting |
| `aave_stake` | Supply USDC to an Aave pool |
| `aave_withdraw` | Withdraw from a pool (for rebalancing) |
| `get_balance` | Check wallet USDC balance |
| `get_gas_price` | Get current gas price for cost-benefit check |

### Custom Openfort Tools (in-process MCP)

| Tool | Purpose in Agent |
|------|-----------------|
| `openfort_create_transaction` | Execute supply/withdraw via Openfort policy-enforced wallet |
| `openfort_get_balance` | Check wallet balance via Openfort |
| `openfort_simulate_transaction` | Estimate gas before executing |

### Openfort MCP (remote, for setup only)

| Tool | Purpose |
|------|---------|
| `create-account` | Create smart wallet for user |
| `create-policy` | Set up gas sponsorship policy |
| `create-policy-rule` | Allowlist Aave contract functions |
| `simulate-transaction` | Pre-validate transactions |

---

## Phase 4: Async Agent Execution

### Agent Server — Async Pattern

The agent server (`apps/agent/src/server.ts`) MUST respond immediately
and run the agent in the background. When complete, it POSTs results
back to the API via a callback endpoint.

**Flow** (replaces synchronous await):

```
Client (API) → POST /execute → Agent Server
                                 ↓ respond 202 immediately
                                 ↓ run executeInvestment() in background
                                 ↓ ... 3-10 minutes ...
                                 ↓ POST ${API_SERVICE_URL}/investments/${id}/actions/report
                                       → API saves actions to DB
```

**Request**: Same as current `POST /execute` (unchanged).

**Response** `202 Accepted` (returned immediately, before agent starts):
```json
{
  "status": "accepted",
  "investmentId": "uuid"
}
```

**Callback** `POST ${API_SERVICE_URL}/investments/:id/actions/report`:
```json
{
  "userId": "user-123",
  "strategyId": "uuid",
  "actions": [
    {
      "actionType": "supply",
      "pool": { "chain": "base", "protocol": "Aave v3", "asset": "USDC" },
      "amountUsd": 10.00,
      "expectedApy": 8.5,
      "gasCostUsd": 0.02,
      "status": "executed",
      "txHash": "0x...",
      "rationale": "Supplied 10 USDC..."
    }
  ],
  "totalAllocated": 10.00,
  "averageApy": 8.5,
  "summary": "Successfully deployed..."
}
```

Same pattern for `POST /rebalance`.

### API — Callback Endpoint

**`POST /investments/:investmentId/actions/report`** (new)

Called by the agent server when execution completes (or fails).

**Request**: Agent result JSON (see callback above).

**Response** `204 No Content` (success, no body).

**Errors**:
- `404` — Investment not found

### API — Processing Marker

When the API triggers the agent and receives `202`, it MUST immediately
create a `rate_check | pending` action in the DB as a processing marker:

```json
{
  "actionType": "rate_check",
  "status": "pending",
  "amount": "0",
  "rationale": "Agent is processing your investment..."
}
```

Frontend uses this to distinguish: `pending` = processing, `executed`/`failed` = done.

### Frontend — Polling

Dashboard polls `GET /investments/:id/actions` every 3 seconds while
the most recent action has `status: "pending"`. Stops polling when:
- An action with `status: "executed"` appears, OR
- An action with `status: "failed"` appears, OR
- 10 minutes elapse (timeout safety)
