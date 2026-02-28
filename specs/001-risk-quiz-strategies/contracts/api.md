# API Contracts: Risk Quiz & Investment Strategies

**Base URL**: `http://localhost:3001/api`
**Format**: JSON
**Auth**: None (hackathon scope — userId passed as header or param)

---

## Quiz Endpoints

### GET /quiz/questions

Returns all quiz questions in display order.

**Response** `200 OK`:
```json
{
  "questions": [
    {
      "id": "uuid",
      "text": "How would you feel if your balance dropped 10%?",
      "displayOrder": 1,
      "options": [
        { "label": "Very uncomfortable", "value": 0 },
        { "label": "Slightly concerned", "value": 1 },
        { "label": "Not worried at all", "value": 2 }
      ]
    }
  ]
}
```

Note: `value` field is the `scoreWeight` from the domain. Exposed
to frontend so scoring can happen client-side for instant feedback,
but the authoritative score is calculated server-side on submit.

---

### POST /quiz/submit

Submits quiz answers and returns the calculated risk profile.

**Request**:
```json
{
  "userId": "user-123",
  "answers": [
    { "questionId": "uuid-1", "selectedValue": 2 },
    { "questionId": "uuid-2", "selectedValue": 1 },
    { "questionId": "uuid-3", "selectedValue": 0 }
  ]
}
```

**Response** `201 Created`:
```json
{
  "assessmentId": "uuid",
  "riskLevel": "balanced",
  "totalScore": 12,
  "maxPossibleScore": 20,
  "description": "You prefer a mix of safety and growth."
}
```

**Errors**:
- `400` — Missing answers or invalid questionId
- `400` — Not all questions answered

---

## Strategy Endpoints

### GET /strategies

Returns all available investment strategies. Optionally filter by
risk level.

**Query Params**:
- `riskLevel` (optional): `conservative` | `balanced` | `growth`

**Response** `200 OK`:
```json
{
  "strategies": [
    {
      "id": "uuid",
      "name": "Steady Growth",
      "riskLevel": "balanced",
      "description": "A balanced mix of safety and yield...",
      "expectedApyMin": 5.0,
      "expectedApyMax": 8.0,
      "rebalanceThreshold": 1.5,
      "allowedChains": ["ethereum", "base"],
      "poolAllocations": [
        {
          "chain": "ethereum",
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
      ]
    }
  ]
}
```

---

### GET /strategies/:id

Returns a single strategy by ID.

**Response** `200 OK`: Single strategy object (same shape as above).

**Errors**:
- `404` — Strategy not found

---

## Investment Endpoints

### POST /investments/start

Starts investing with a selected strategy. Creates an active
UserInvestment.

**Request**:
```json
{
  "userId": "user-123",
  "strategyId": "uuid"
}
```

**Response** `201 Created`:
```json
{
  "investmentId": "uuid",
  "strategyId": "uuid",
  "strategyName": "Steady Growth",
  "status": "active",
  "activatedAt": "2026-02-28T12:00:00Z"
}
```

**Errors**:
- `400` — User already has an active investment (must switch instead)
- `404` — Strategy not found

---

### PATCH /investments/switch

Switches the user's active investment to a different strategy.

**Request**:
```json
{
  "userId": "user-123",
  "newStrategyId": "uuid"
}
```

**Response** `200 OK`:
```json
{
  "investmentId": "uuid",
  "previousStrategyId": "uuid",
  "previousStrategyName": "Safe Harbor",
  "newStrategyId": "uuid",
  "newStrategyName": "Steady Growth",
  "status": "active",
  "activatedAt": "2026-02-28T14:00:00Z"
}
```

**Errors**:
- `400` — No active investment to switch
- `404` — New strategy not found
- `400` — New strategy same as current

---

### GET /investments/active

Returns the user's current active investment details.

**Query Params**:
- `userId` (required): The user ID

**Response** `200 OK`:
```json
{
  "investmentId": "uuid",
  "strategy": {
    "id": "uuid",
    "name": "Steady Growth",
    "riskLevel": "balanced",
    "expectedApyMin": 5.0,
    "expectedApyMax": 8.0,
    "poolAllocations": [...]
  },
  "status": "active",
  "activatedAt": "2026-02-28T12:00:00Z"
}
```

**Errors**:
- `404` — No active investment found for user
