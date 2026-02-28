# Openfort Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-02-28

## Active Technologies
- TypeScript 5.x (Node.js 20+) + `@anthropic-ai/claude-agent-sdk`, `@openfort/openfort-node`, Tairon-ai/aave-mcp, Zod (001-risk-quiz-strategies)
- PostgreSQL (existing, via NestJS API) — agent reads strategy data from API (001-risk-quiz-strategies)
- TypeScript 5.x (Node.js 20+) + Next.js 15 (App Router), NestJS 10, MikroORM 6.4, viem, Tailwind CSS (001-risk-quiz-strategies)
- PostgreSQL (existing `agent_action`, `user_investment`, `investment_strategy` tables) (001-risk-quiz-strategies)
- TypeScript 5.x (Node.js 20+) + NestJS 10 (API), Next.js 15/React 19 (frontend), `@anthropic-ai/claude-agent-sdk` + `@openfort/openfort-node` (agent) (001-risk-quiz-strategies)
- PostgreSQL via MikroORM 6.4 (existing `agent_action` table) (001-risk-quiz-strategies)

- TypeScript 5.x (Node.js 20+) + Next.js 15 (App Router), NestJS 10, (001-risk-quiz-strategies)

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript 5.x (Node.js 20+): Follow standard conventions

## Recent Changes
- 001-risk-quiz-strategies: Added TypeScript 5.x (Node.js 20+) + NestJS 10 (API), Next.js 15/React 19 (frontend), `@anthropic-ai/claude-agent-sdk` + `@openfort/openfort-node` (agent)
- 001-risk-quiz-strategies: Added TypeScript 5.x (Node.js 20+) + Next.js 15 (App Router), NestJS 10, MikroORM 6.4, viem, Tailwind CSS
- 001-risk-quiz-strategies: Added TypeScript 5.x (Node.js 20+) + `@anthropic-ai/claude-agent-sdk`, `@openfort/openfort-node`, Tairon-ai/aave-mcp, Zod


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
