# SafeRoute

SafeRoute is a community safety navigation platform that will recommend **fastest**, **balanced**, and **safest** routes using geospatial risk data and a dynamically weighted road graph.

> Current status: Phases 1–4 are implemented. Background processing, expiry sweeps, and route caching are deferred to Phase 5.

## Technical identity

SafeRoute is a modular monolith, not a collection of microservices. Its core is a dedicated routing engine that will combine A* pathfinding with configurable distance and safety costs.

```mermaid
flowchart TD
    W[Next.js web] -->|REST / WebSocket| A[Express API]
    A --> M[Domain modules]
    M --> R[Routing engine]
    A --> P[(PostgreSQL + PostGIS)]
    A --> D[(Redis)]
    D --> Q[BullMQ workers]
```

Kafka and an API gateway are intentionally excluded. PostgreSQL/PostGIS will handle spatial queries, Redis will cache expensive route results, and BullMQ will run asynchronous risk recalculation and report-expiry work.

## Implemented foundation

- pnpm TypeScript monorepo
- Next.js and Tailwind web application
- Express API with security middleware, correlation IDs, and structured logs
- separate liveness and dependency-aware readiness checks
- PostgreSQL 17 with PostGIS and a spatially capable schema foundation
- Redis foundation for future cache and BullMQ work
- Dockerfiles and Docker Compose health checks
- strict TypeScript, ESLint, Prettier, Vitest, and GitHub Actions CI
- graceful API shutdown and sanitized log configuration
- secure scrypt password hashing and short-lived signed access tokens
- opaque, hashed, rotating refresh sessions with reuse detection
- role-based authorization for `USER`, `MODERATOR`, and `ADMIN`
- PostGIS incident storage, radius queries, and GiST spatial indexes
- duplicate-safe community confirmation/dispute recording
- reporter identity removed from public incident responses
- rate-limited incident submission and moderator verification/rejection
- typed road graph with validated nodes, directed edges, and normalized risk factors
- binary min-priority queue and A* pathfinding with an admissible geographic heuristic
- configurable `FASTEST`, `BALANCED`, and `SAFEST` optimization profiles
- distance-weighted safety scores, route warnings, geometry, duration, and search metrics
- PostGIS road-node and road-segment schema with a demonstrable Noida seed graph
- trust-, evidence-, community-, and moderation-aware incident confidence scoring
- category-specific exponential time decay for transient and persistent hazards
- severity × confidence × time-decay effective-risk calculation
- severity-scaled PostGIS affected-road matching and explainable per-report risk sources
- independent-union aggregation of live reports into separate dynamic road-risk layers
- baseline and dynamic risk composition when loading the routing graph

## Core API

```text
POST  /api/v1/auth/register
POST  /api/v1/auth/login
POST  /api/v1/auth/refresh
POST  /api/v1/auth/logout
GET   /api/v1/auth/me

POST  /api/v1/incidents
GET   /api/v1/incidents/nearby
GET   /api/v1/incidents/:id
POST  /api/v1/incidents/:id/confirm
POST  /api/v1/incidents/:id/dispute
PATCH /api/v1/incidents/:id/status

GET   /api/v1/routes/nodes
POST  /api/v1/routes/calculate
```

Access tokens are returned in the response body and sent as `Authorization: Bearer <token>`.
Refresh tokens are random opaque values stored only as SHA-256 hashes and transported in an HTTP-only, SameSite cookie. Rotation is atomic; replaying a revoked token invalidates the user’s remaining active sessions.

Route calculation accepts road-node IDs and an optional subset of route preferences:

```json
{
  "originNodeId": "sector-62",
  "destinationNodeId": "electronic-city",
  "preferences": ["FASTEST", "BALANCED", "SAFEST"]
}
```

The edge objective uses consistent distance units:

```text
edgeCost =
  distanceWeight × distanceMeters
  + safetyWeight × combinedRisk × distanceMeters × riskDistanceMultiplier
```

Multiplying risk by distance models exposure and prevents road segmentation from changing a route’s total risk. The A* heuristic uses only weighted straight-line distance, so it never adds an unproven safety cost and remains admissible.

### Safety intelligence

Each active report contributes an effective risk to nearby road segments:

```text
confidence =
  50% reporter trust + 35% community signal + 15% evidence signal

effectiveRisk = severity / 5 × confidence × categoryTimeDecay
```

Community influence grows with participation, pending reports are capped at `0.85`, verified reports have a `0.90` floor, and rejected or expired reports contribute zero. Time decay uses category-specific half-lives: accidents decay in hours, closures and weather hazards in days, while lighting and isolation concerns persist for months.

Reports affect active roads within `100 + severity × 120` metres. Reports of the same risk type are aggregated as `1 - product(1 - effectiveRisk)`, which captures compounding evidence without exceeding one. The resulting live layer is stored separately from the baseline map layer; routing composes them as `1 - (1 - baseline) × (1 - dynamic)`.

## Repository layout

```text
apps/
  api/                  Express modular-monolith API
  web/                  Next.js web client
packages/
  shared/               Cross-application contracts
docker/postgres/        PostGIS initialization
.github/workflows/      Continuous integration
```

Future domain modules belong under `apps/api/src/modules`; graph structures, A*, and scoring will live under `apps/api/src/routing-engine`. Keeping these boundaries inside one deployable API makes development simpler without mixing domain logic into controllers.

## Local development

Requirements:

- Node.js 22+
- pnpm 10+
- Docker with Compose (for PostgreSQL/PostGIS and Redis)

```bash
cp .env.example .env
pnpm install
docker compose up -d postgres redis
pnpm --filter @saferoute/api db:migrate
pnpm dev
```

Open the web app at `http://localhost:3000`. The API listens at `http://localhost:4000`.

Health endpoints:

```text
GET /api/v1/health/live   process liveness
GET /api/v1/health/ready  PostgreSQL and Redis readiness
```

Run the entire stack in containers:

```bash
docker compose up --build
```

## Verification

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

The committed `pnpm-lock.yaml` keeps local, Docker, and CI installations reproducible.

## Planned phases

1. **Foundation** — complete
2. **Authentication and incidents** — complete
3. **Routing engine** — complete
4. **Safety intelligence** — complete
5. **Background processing** — BullMQ, risk recalculation, expiry, caching
6. **Map experience** — route comparison, rendering, report submission
7. **Real-time navigation** — high-risk updates and rerouting suggestions
8. **Production hardening** — rate limits, metrics, indexes, performance tests

## Current trade-offs

- SQL is explicit and repository-based so spatial behavior is visible and not limited by an ORM’s geography support.
- Redis is connected for readiness but caching and BullMQ are deferred until their domain behavior is known.
- The landing screen communicates the product direction; an interactive map belongs to Phase 6.
- Docker Compose uses local development credentials. Production credentials must come from a secret manager.
- Phase 4 recalculates affected roads synchronously after report changes so behavior is immediately consistent. BullMQ will move this work off the request path in Phase 5.
- Phase 3 loads the small development graph as one in-memory adjacency list per request. Redis graph/version caching and bounded graph loading belong to Phase 5 and production-scale work.

## Safety and privacy direction

The finished system will avoid persistent navigation histories by default, hide reporter identity, rate-limit report submission, validate evidence uploads, and use aggregated risk data rather than expose precise user movement.

## License

No license has been selected yet.
