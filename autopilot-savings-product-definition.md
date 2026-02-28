# 💸 Autopilot Savings — Product Definition

> **"Your money works while you sleep"**
> An AI-powered savings agent that automatically moves your stablecoins into the best-yielding Aave liquidity pools — no crypto knowledge required.

---

## 🧭 One-Line Pitch

A mobile-first app where users deposit USDC once and an AI agent autonomously manages their funds across Aave pools to maximize yield — with zero gas friction, zero DeFi complexity.

---

## 🎯 Problem

| Reality | Pain |
|---|---|
| Aave offers 4–12% APY on stablecoins | 99% of people never access it — too complex |
| Traditional banks offer ~0.5% savings rate | Users are losing thousands in opportunity cost |
| DeFi requires wallets, gas, approvals, monitoring | Massive friction kills adoption |
| Aave rates change constantly across chains | Manually chasing the best rate is a full-time job |

**Core insight:** The yield exists. The infrastructure exists. The missing piece is a dead-simple experience that hides all the complexity.

---

## 💡 Solution

An app powered by:
- **Openfort** — embedded wallets (no MetaMask), gasless transactions, backend wallet for the AI agent
- **Aave** — the yield source (lending liquidity pools on Ethereum, Polygon, Base)
- **AI Agent** — monitors rates 24/7, decides when and where to move funds, executes transactions autonomously within policy guardrails

The user experience feels like a fintech savings account. The engine underneath is DeFi.

---

## 👤 Target User

### Primary: "The Passive Crypto Holder"
- Owns $500–$50,000 in USDC/stablecoins
- Bought crypto, converted some to stablecoins "to be safe"
- Knows DeFi exists but finds it intimidating
- Would use it if it were as easy as a bank app
- Age: 25–40, tech-savvy but not a DeFi native

### Secondary: "The Disappointed Saver"
- Has savings in a traditional bank earning 0.3–0.5%
- Frustrated by inflation eating their savings
- Open to crypto if it feels safe and simple
- Doesn't want to "trade" — just wants better interest
- Age: 30–50

---

## 🗺️ User Scenarios

---

### Scenario 1: First-Time Deposit (Onboarding Flow)

**User:** Maria, 32, has $2,000 USDC sitting in Coinbase doing nothing.

```
1. Maria opens the app and signs up with her email (Google OAuth)
   → Openfort silently creates an embedded wallet for her in <100ms
   → She never sees a seed phrase or private key

2. She sees a clean dashboard:
   "Current yield: 6.2% APY | Your balance: $0"

3. She taps "Deposit" → enters $2,000 USDC
   → Connects Coinbase wallet to transfer funds
   → One confirmation tap — no gas fee shown (sponsored by app)

4. Funds arrive. Dashboard updates:
   "Balance: $2,000 | Earning: ~$124/year | Daily earnings: ~$0.34"

5. The AI agent immediately evaluates Aave pools:
   - Aave v3 on Base: 6.2% APY ✅ (best rate)
   - Aave v3 on Polygon: 5.1% APY
   - Aave v3 on Ethereum: 4.8% APY
   → Agent deposits $2,000 into Aave v3 Base

6. Maria gets a push notification:
   "✅ Your $2,000 is now earning 6.2% APY. We'll keep optimizing it for you."
```

**Key UX principles:** No gas prompts. No chain selection. No protocol jargon. One deposit, done.

---

### Scenario 2: AI Agent Rebalancing (Background)

**Trigger:** Aave rates shift — Polygon rate jumps from 5.1% to 8.4% APY due to sudden borrowing demand.

```
1. Agent detects rate anomaly at 3:14 AM
   → Evaluates: Is the difference worth moving? (accounts for gas cost of move)
   → Rate delta: +2.2% on $2,000 = ~$44/year extra
   → Gas cost of rebalance: ~$0.80
   → Decision: MOVE ✅

2. Agent executes (no user action needed):
   - Withdraws $2,000 USDC from Aave Base (receives aUSDC back)
   - Bridges to Polygon (Openfort handles cross-chain)
   - Deposits into Aave v3 Polygon at 8.4% APY

3. Maria wakes up, opens app:
   "🔄 We moved your funds to a better rate overnight.
    Old rate: 6.2% → New rate: 8.4% APY
    Extra earnings this year: ~$44"

4. Maria taps "Why?" → sees a simple explanation:
   "Borrowing demand on Polygon spiked overnight,
    pushing yields higher. We moved your funds automatically."
```

**Key UX principles:** Transparent but not overwhelming. User learns passively. Trust is built through explanations.

---

### Scenario 3: Partial Withdrawal

**User:** Maria needs $500 for an unexpected expense.

```
1. Maria taps "Withdraw" → enters $500
   → App shows: "Available: $2,087 (inc. $87 earned so far)"

2. She confirms → Agent calculates:
   - Keep $1,587 in Aave (still earning)
   - Withdraw $500 from Aave (partial redemption of aUSDC)
   - No penalty, no lock-up

3. $500 arrives in her embedded wallet in ~15 seconds
   → She can send to Coinbase, bank (via offramp), or keep in app

4. Dashboard updates:
   "Balance: $1,587 | Still earning 8.4% APY"
   
5. Push notification:
   "✅ $500 withdrawn. Your remaining $1,587 keeps earning."
```

**Key UX principles:** Liquidity is always accessible. No lock-up anxiety. Partial withdrawals feel natural.

---

### Scenario 4: Risk Event (Safety guardrail)

**Trigger:** A smart contract vulnerability is flagged on Aave v3 Polygon (hypothetical).

```
1. Agent detects risk signal (via on-chain monitoring / security feed)
   → Policy rule triggered: "If risk score > threshold → move to safe pool"

2. Agent immediately moves funds to Aave v3 Ethereum (lower yield, higher security)
   → Openfort policy guardrails prevent agent from moving funds anywhere outside
     the pre-approved contract whitelist

3. Maria gets urgent notification:
   "⚠️ We moved your funds as a precaution.
    A potential risk was detected on your previous pool.
    Your $1,587 is safe and still earning 4.8% APY."

4. She can tap "Learn more" → plain-English explanation
   She can tap "I'll manage it myself" → manual mode unlocked
```

**Key UX principles:** Safety over yield. Full transparency. User always retains control override.

---

### Scenario 5: Power User — Setting Preferences

**User:** James, 38, crypto-savvy, wants more control.

```
1. James opens Settings → "Agent Preferences"

2. He configures:
   - Risk tolerance: Medium (avoids chains with audit issues)
   - Min rebalance threshold: Only move if rate delta > 1.5%
   - Chains allowed: Ethereum, Base, Polygon only (no Arbitrum)
   - Max in single pool: 60% of balance (diversification rule)
   - Notifications: Every rebalance + weekly summary

3. Agent respects all constraints going forward
   → Openfort transaction policy enforces contract whitelist server-side
   → Even if agent logic has a bug, it cannot move funds outside approved contracts

4. James sees a "Policy active" badge on dashboard:
   "Your custom rules are enforced at the infrastructure level 🔒"
```

**Key UX principles:** Progressive disclosure — simple by default, powerful when needed. Trust through verifiable constraints.

---

## 💰 Business Model

| Revenue Stream | How It Works | Example |
|---|---|---|
| **Yield spread** | App earns 6.2%, user receives 5.7% | 0.5% margin on all AUM |
| **Premium tier** | Unlimited chains, custom rules, priority rebalancing | $9.99/month |
| **Referral** | User invites friend → both get boosted rate for 30 days | Viral growth loop |
| **B2B white-label** | Other fintech apps embed the yield engine via API | Revenue share deal |

**Unit economics example:**
- 1,000 users × avg $3,000 deposited = $3M AUM
- 0.5% annual spread = **$15,000/year** at launch scale
- 10,000 users × avg $5,000 = $50M AUM = **$250,000/year**

---

## 🏗️ Technical Architecture

```
┌─────────────────────────────────────────────┐
│                  Frontend                    │
│         React Native / Expo App             │
│   (Dashboard, Deposit, Withdraw, Settings)  │
└────────────────────┬────────────────────────┘
                     │
┌────────────────────▼────────────────────────┐
│               Openfort Layer                │
│  • Embedded Wallet (user-facing)            │
│  • Backend Wallet (AI agent wallet)         │
│  • Gasless Transactions (Paymaster)         │
│  • Transaction Policies (guardrails)        │
│  • Multi-chain support (Base/Polygon/ETH)   │
└────────────────────┬────────────────────────┘
                     │
┌────────────────────▼────────────────────────┐
│              AI Agent Layer                 │
│  • Rate monitor (polls Aave v3 APYs)        │
│  • Rebalance decision engine                │
│  • Gas cost vs. yield delta calculator      │
│  • Risk scoring module                      │
│  • Executes via Openfort Backend Wallet     │
└────────────────────┬────────────────────────┘
                     │
┌────────────────────▼────────────────────────┐
│              Aave v3 Protocol               │
│  • Supply USDC → receive aUSDC              │
│  • Variable APY pools                       │
│  • Chains: Ethereum, Base, Polygon          │
│  • Withdraw anytime, no lock-up             │
└─────────────────────────────────────────────┘
```

---

## 🚀 Hackathon Scope (1 Day)

### Must Have ✅
- [ ] Email sign-up → embedded wallet created silently
- [ ] Deposit USDC → auto-deposited into best Aave pool
- [ ] Live dashboard (balance + current APY + earnings)
- [ ] AI agent rebalance (at least simulated with real rate data)
- [ ] Withdraw flow

### Nice to Have 🟡
- [ ] Push notifications on rebalance
- [ ] Multi-chain rebalancing (Base + Polygon)
- [ ] "Why did the agent move funds?" explanation screen

### Out of Scope ❌
- Fiat on/off ramp
- Mobile app (web app is fine for demo)
- Real risk scoring system
- KYC / compliance layer

---

## 🏆 Why This Wins a Hackathon

1. **Instant "get it" moment** — judges understand savings accounts, APY, and AI agents
2. **Live demo** — real money moving on-chain in real time is visceral
3. **Openfort showcase** — uses embedded wallets + backend wallet + policies + gasless = full platform demo
4. **Real business** — not a toy; a describable path to $1M ARR
5. **Timing** — AI agents + stablecoin yield is the hottest narrative in crypto right now

---

## 📌 Open Questions for the Team

- What chain to demo on? (Base recommended — cheap, fast, Aave v3 supported)
- Simulate rebalancing or do real cross-chain? (simulation safer for 1 day)
- Use real USDC or testnet? (testnet recommended — Sepolia or Base Sepolia)
- Who builds agent logic vs. frontend vs. Openfort integration?
- App name ideas? ("Drift", "Float", "Autopilot", "Yield.ai", "Flowsave")
