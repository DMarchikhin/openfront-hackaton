# API Contracts: Portfolio Dashboard

## New Endpoint

### GET /api/investments/portfolio

Returns the current portfolio with on-chain pool positions and per-pool transaction history.

**Query Parameters**:
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| userId | string | Yes | User identifier |

**Response** (200 OK):
```json
{
  "investmentId": "uuid",
  "strategyName": "Steady Growth",
  "riskLevel": "balanced",
  "totalValueUsd": 10.50,
  "totalInvestedUsd": 10.00,
  "totalEarnedUsd": 0.50,
  "pools": [
    {
      "pool": {
        "chain": "Base Sepolia",
        "protocol": "Aave V3",
        "asset": "USDC"
      },
      "onChainBalanceUsd": 10.50,
      "totalSuppliedUsd": 10.00,
      "totalWithdrawnUsd": 0.00,
      "netInvestedUsd": 10.00,
      "earnedYieldUsd": 0.50,
      "latestApyPercent": 8.5,
      "allocationPercent": 100,
      "actions": [
        {
          "id": "uuid",
          "actionType": "supply",
          "amountUsd": 10.00,
          "expectedApyAfter": 8.5,
          "status": "executed",
          "txHash": "0x9654...",
          "rationale": "Supplied 10 USDC to Aave V3 on Base Sepolia at 8.5% APY",
          "executedAt": "2026-02-28T14:30:00Z"
        },
        {
          "id": "uuid",
          "actionType": "rate_check",
          "amountUsd": 0,
          "expectedApyAfter": 8.5,
          "status": "executed",
          "txHash": null,
          "rationale": "Current APY 8.5% within strategy threshold",
          "executedAt": "2026-02-28T15:00:00Z"
        }
      ]
    }
  ]
}
```

**Response** (404 Not Found — no active investment):
```json
{
  "error": "No active investment found"
}
```

**Error Response** (500 — RPC or DB failure):
```json
{
  "error": "Failed to read on-chain balance"
}
```

---

## Existing Endpoints (unchanged)

### GET /api/investments/active?userId=...
Returns active investment summary. **No changes.**

### GET /api/investments/:investmentId/actions
Returns all agent actions for an investment. **No changes.**

---

## Frontend API Client Addition

```typescript
// In apps/web/src/lib/api.ts
export async function fetchPortfolio(userId: string): Promise<PortfolioResponse> {
  const res = await fetch(`${API_BASE}/investments/portfolio?userId=${userId}`);
  if (!res.ok) throw new Error('Failed to fetch portfolio');
  return res.json();
}
```
