# Quickstart: Risk Quiz & Investment Strategies

## Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 15+ (running locally or via Docker)
- Git

## Setup

```bash
# Clone and install
git clone <repo-url> && cd Openfort
pnpm install

# Start PostgreSQL (if using Docker)
docker run --name openfort-db -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=openfort -p 5432:5432 -d postgres:15

# Copy environment files
cp apps/api/.env.example apps/api/.env

# Run database migrations
cd apps/api && pnpm migration:up && cd ../..

# Seed initial data (quiz questions + strategies)
cd apps/api && pnpm seed && cd ../..

# Start both frontend and backend
pnpm dev
```

## Access

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api

## Verify It Works

1. Open http://localhost:3000 in your browser
2. You should see the quiz start screen
3. Answer all 5 questions
4. You should see your risk profile result
5. Browse strategies and select one
6. Confirm to start investing
7. Dashboard should show active strategy

## API Smoke Test

```bash
# Get quiz questions
curl http://localhost:3001/api/quiz/questions | jq

# Submit quiz answers (example)
curl -X POST http://localhost:3001/api/quiz/submit \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user","answers":[
    {"questionId":"<q1-id>","selectedValue":2},
    {"questionId":"<q2-id>","selectedValue":1},
    {"questionId":"<q3-id>","selectedValue":1},
    {"questionId":"<q4-id>","selectedValue":2},
    {"questionId":"<q5-id>","selectedValue":0}
  ]}' | jq

# Get all strategies
curl http://localhost:3001/api/strategies | jq

# Start investing
curl -X POST http://localhost:3001/api/investments/start \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user","strategyId":"<strategy-id>"}' | jq
```

## Run Tests

```bash
# Domain unit tests only
cd apps/api && pnpm test
```

## Project Structure

```
apps/
├── web/          # Next.js + Tailwind frontend
│   └── src/app/  # App Router pages
└── api/          # NestJS backend (hexagonal)
    └── src/modules/
        ├── quiz/           # Risk assessment quiz
        ├── strategy/       # Investment strategies
        └── investment/     # User investment management
```
