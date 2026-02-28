# Autopilot Savings — Risk Quiz & Investment Strategies

A full-stack web application that guides users through a short risk-profile quiz and recommends personalised investment strategies across DeFi liquidity pools. Users can review all available strategies, start investing with one click, and switch strategies at any time from their dashboard.

---

## Features

- **Risk assessment quiz** — 5 questions that score the user's risk tolerance and map it to a strategy (Conservative / Balanced / Growth)
- **Strategy browser** — view all strategies with expected APY ranges and pool allocation breakdowns (protocol, chain, asset, percentage)
- **Start investing** — select a strategy and activate it; the system records the investment and redirects to the dashboard
- **Dashboard** — live summary of the active strategy, APY stats, estimated daily earnings, and pool breakdown
- **Switch strategy** — change to any other strategy directly from the dashboard

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS |
| Backend | NestJS 10, hexagonal architecture |
| ORM | MikroORM 6 with PostgreSQL |
| Language | TypeScript 5 |
| Package manager | pnpm workspaces |
| Database | PostgreSQL 16 (Docker) |

---

## Prerequisites

- [Node.js 20+](https://nodejs.org)
- [pnpm](https://pnpm.io) — `npm install -g pnpm`
- [Docker](https://www.docker.com) (for the database)

---

## Getting Started

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd Openfort
pnpm install
```

### 2. Start the database

```bash
docker compose up -d
```

This starts a PostgreSQL 16 container on port `5432` with:
- Database: `app`
- User: `app`
- Password: `!ChangeMe!`

### 3. Configure the API environment

Create `apps/api/.env`:

```env
DATABASE_URL=postgresql://app:!ChangeMe!@localhost:5432/app
```

### 4. Run migrations and seed data

```bash
cd apps/api
pnpm seed
```

This runs all pending migrations and populates the database with:
- 5 quiz questions (with weighted answer options)
- 3 investment strategies (Conservative, Balanced, Growth) with pool allocations

### 5. Start the API

```bash
# from apps/api/
pnpm dev
```

The API runs at **http://localhost:3001**.

### 6. Start the web app

In a second terminal:

```bash
# from apps/web/
pnpm dev
```

The web app runs at **http://localhost:3000**.

---

## Usage Flow

1. Open **http://localhost:3000**
2. Click **Get started** to begin the quiz
3. Answer all 5 questions — your risk level is calculated automatically
4. Browse strategies; your recommended one is highlighted
5. Click a strategy card to expand it, then click **Start investing**
6. You are redirected to the **Dashboard** showing your active strategy
7. To change strategy, click **Change strategy →** on the dashboard

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/quiz/questions` | Fetch all quiz questions with options |
| `POST` | `/quiz/submit` | Submit answers and get a risk level result |
| `GET` | `/strategies` | List all investment strategies |
| `POST` | `/investments/start` | Activate a strategy for a user |
| `PATCH` | `/investments/switch` | Switch to a different strategy |
| `GET` | `/investments/active?userId=<id>` | Get the user's active investment |

---

## Running Tests

Unit tests cover the domain layer (RiskAssessment, InvestmentStrategy, UserInvestment):

```bash
# from apps/api/
pnpm test

# with coverage
pnpm test:cov
```

---

## Project Structure

```
Openfort/
├── apps/
│   ├── api/                    # NestJS backend
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── quiz/       # Risk quiz (questions, submission, scoring)
│   │       │   ├── strategy/   # Investment strategies
│   │       │   └── investment/ # User investments (start, switch, active)
│   │       └── shared/         # Enums, shared types
│   └── web/                    # Next.js frontend
│       └── src/
│           ├── app/
│           │   ├── quiz/       # Quiz flow pages
│           │   ├── strategies/ # Strategy selection page
│           │   └── dashboard/  # Active investment dashboard
│           ├── components/     # Reusable UI components
│           └── lib/            # API client
├── compose.yaml                # PostgreSQL Docker config
└── pnpm-workspace.yaml
```
