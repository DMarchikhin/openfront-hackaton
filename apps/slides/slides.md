---
theme: default
title: CondorFlow
colorSchema: dark
highlighter: shiki
fonts:
  sans: Inter
---

# CondorFlow
## Your money works while you sleep

AI-powered DeFi yield — as easy as a savings account

---

# The Problem

<div class="grid grid-cols-2 gap-8 mt-8">
<div>

### Traditional savings
- 🏦 Bank savings account: **0.3–0.5% APY**
- Inflation: **~3%**
- Net result: **losing money**

</div>
<div>

### The gap
- Aave V3 offers **5–12% APY** on stablecoins
- 99% of people never access it — **too complex**
- Wallets, gas, approvals, monitoring = full-time job

</div>
</div>

> **Core insight:** The yield exists. The missing piece is a dead-simple UX.

---

# The Solution

**CondorFlow = DeFi yield + savings account UX**

<div class="grid grid-cols-3 gap-6 mt-8">
<div class="border rounded p-4">

### 🧠 AI Agent
Monitors rates 24/7, decides where to move funds, executes automatically

</div>
<div class="border rounded p-4">

### 🔐 Openfort
Embedded wallets, gasless transactions, policy guardrails — zero Web3 friction

</div>
<div class="border rounded p-4">

### 📈 Aave V3
Best-in-class stablecoin yield on Base, Ethereum, Polygon

</div>
</div>

---

# How It Works

<div class="grid grid-cols-3 gap-6 mt-8 text-center">
<div class="border rounded p-6">

### 1. Take the quiz
5 questions → Conservative / Balanced / Growth strategy

</div>
<div class="border rounded p-6">

### 2. Start investing
One click — agent allocates USDC across the best Aave pools

</div>
<div class="border rounded p-6">

### 3. Watch it work
Real-time dashboard: live APY, portfolio balance, agent action log

</div>
</div>

**Switch strategy anytime → agent rebalances automatically**

---

# Powered by Openfort

<div class="grid grid-cols-2 gap-6 mt-6">
<div>

✅ **ERC-4337 Smart Accounts**
Wallets created silently — users never see a seed phrase

✅ **Gas Sponsorship (Paymaster)**
Zero gas friction — we sponsor every transaction

</div>
<div>

✅ **Backend Wallet as Agent Signer**
AI agent executes on-chain without exposing keys

✅ **Transaction Policy Guardrails**
Agent can only interact with whitelisted contracts — even if it has a bug

</div>
</div>

---

# Architecture

```
User → Next.js 15 (Web)
         ↓ REST
       NestJS 10 (API) → PostgreSQL
         ↓ fire-and-forget
       Agent Server (Claude Sonnet 4.6)
         ├── Aave MCP  → Base Blockchain (live APY)
         └── Openfort  → Base Sepolia (ERC-4337 UserOps)
              ↓ SSE stream
            Web Dashboard (real-time agent log)
```

**Stack:** TypeScript · Next.js 15 · NestJS · Claude Agent SDK · viem · Tailwind

---
layout: center
---

# Live Demo

*Let's watch the AI agent allocate funds in real time*

---

# What's Next

- 🌐 **Multi-chain rebalancing** — follow the best yield across Base, Polygon, Ethereum automatically
- 📱 **Mobile app** — React Native, same UX
- 🔔 **Push notifications** — "We moved your funds to a better rate overnight"
- 🏢 **B2B white-label** — embed the yield engine into any fintech app via API

---
layout: center
---

# Thank you

**CondorFlow** — github.com/your-repo

*AI agents + Openfort + Aave = DeFi for everyone*
