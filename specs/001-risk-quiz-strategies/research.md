# Research: Risk Quiz & Investment Strategies

**Date**: 2026-02-28
**Branch**: `001-risk-quiz-strategies`

## R1: Monorepo Tooling

**Decision**: pnpm workspaces (no Turborepo)
**Rationale**: For a 2-package monorepo (frontend + backend), pnpm
workspaces provide fast installs, good disk usage, and native workspace
support with minimal configuration. Turborepo adds caching overhead
that isn't justified for a hackathon.
**Alternatives considered**: npm workspaces (slower installs), Turborepo
(overkill for 2 packages), Nx (too much tooling overhead).

## R2: Monorepo Folder Convention

**Decision**: `apps/web` (Next.js) + `apps/api` (NestJS) at root
**Rationale**: Follows established NestJS monorepo conventions. Clean
separation. Room to add shared packages later without refactoring.
**Alternatives considered**: `frontend/` + `backend/` (less standard),
`packages/` flat structure (not suitable for apps).

## R3: Shared Types Strategy

**Decision**: No shared types package. DTOs defined in backend, frontend
defines its own types matching API responses.
**Rationale**: For a hackathon with ~5 API endpoints, the overhead of
maintaining a shared package outweighs the benefit. Types can be
extracted later if the project grows.
**Alternatives considered**: `packages/shared` workspace package (adds
build step and configuration).

## R4: Hexagonal Architecture Approach

**Decision**: Pragmatic hexagonal architecture per NestJS module with
three layers: domain, application, infrastructure. Outbound ports
(repository interfaces) ALWAYS abstracted. Inbound ports (use case
interfaces) skipped — use concrete implementations directly.
**Rationale**: Outbound ports are the core benefit of hexagonal arch
(enable test doubles, DB swaps). Inbound port interfaces add ceremony
without benefit at hackathon scale. User explicitly requested ports
and adapters but also simplicity.
**Alternatives considered**: Full hexagonal with inbound + outbound
ports (too ceremonial), plain NestJS services (no architecture).

## R5: MikroORM Entity Strategy

**Decision**: MikroORM decorators directly on domain entity classes
(pragmatic approach). No separate ORM entity mapping layer.
**Rationale**: Cuts boilerplate in half. MikroORM decorators are
metadata-only (non-invasive). Domain entities still contain business
logic via methods. For a hackathon, the mapping layer between domain
and ORM entities adds significant overhead with minimal benefit.
**Alternatives considered**: Separate ORM entities with mapping in
repositories (cleaner but 2x the entity classes).

## R6: MikroORM Repository Pattern

**Decision**: Use `EntityRepository` via `@InjectRepository()` for
queries. Inject `EntityManager` for persistence mutations. Custom
repository classes only when reusable query logic emerges.
**Rationale**: MikroORM v6 removed persistence methods from
EntityRepository. Using EntityManager directly for mutations is the
recommended pattern. Avoids unnecessary custom repository boilerplate.
**Alternatives considered**: Custom repositories extending
EntityRepository for all entities (unnecessary for simple CRUD).

## R7: Migration Strategy

**Decision**: Auto-generated migrations via `mikro-orm migration:create`
for development. Use `schema:update --run` for rapid hackathon iteration
if migrations become friction.
**Rationale**: Auto-generated migrations provide safety with minimal
effort. Schema sync is available as fallback for maximum speed.
**Alternatives considered**: Manual migration files (too slow),
`synchronize: true` only (unsafe for shared databases).

## R8: Testing Strategy

**Decision**: Unit tests for domain layer ONLY. No tests for
application or infrastructure layers. Tests live alongside domain
entities in `__tests__/` directories or in a top-level `test/unit/`
mirror structure.
**Rationale**: User explicitly requested "unit test for domain not
app layer". Domain tests provide highest ROI — they test business
logic without framework dependencies, run instantly, and require no
mocking of infrastructure.
**Alternatives considered**: Full test pyramid (too much for hackathon),
integration tests (slower, require DB).

## R9: Frontend Architecture

**Decision**: Next.js App Router with Tailwind CSS. Simple page-based
routing: `/` (home), `/quiz` (quiz flow), `/strategies` (strategy
selection), `/dashboard` (active investment). Components organized
by feature.
**Rationale**: App Router is the Next.js default. Tailwind provides
utility-first styling with zero custom CSS files. Feature-based
component organization keeps related UI together.
**Alternatives considered**: Pages Router (legacy), CSS modules
(more files), styled-components (additional dependency).

## R10: Concurrent Development

**Decision**: Use `concurrently` package in root `package.json` to
run both apps with a single `pnpm dev` command. Frontend on port
3000, backend on port 3001.
**Rationale**: Single command to start the full stack. Standard port
convention. No complex orchestration needed.
**Alternatives considered**: Turborepo `turbo dev` (overkill), manual
terminal management (inconvenient).
