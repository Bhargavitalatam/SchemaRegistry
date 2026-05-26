# Schema Registry

A production-style **JSON Schema Registry** with contract enforcement: versioned schemas per subject, compatibility rules (BACKWARD, FORWARD, FULL), REST API, and a React UI for exploration and validation.

Built for microservice-style data contracts—prevent breaking schema changes before they reach production.

---

## Features

- **Schema versioning** per subject with PostgreSQL persistence
- **Compatibility engine** (implemented from scratch—no comparison library)
  - BACKWARD, FORWARD, FULL, and NONE modes
- **REST API** with API-key protection on mutating routes
- **Payload validation** endpoint using Ajv against the latest schema
- **React UI**: subject browser, side-by-side version diff, compatibility matrix, payload validator
- **Docker Compose** one-command stack (API + Postgres + frontend)

---

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Frontend   │────▶│  API (Node)  │────▶│  PostgreSQL 14  │
│  React/Vite │     │  Express     │     │  subjects +     │
│  Nginx :80  │     │  :3001       │     │  schema_versions│
└─────────────┘     └──────────────┘     └─────────────────┘
                           │
                    seeds/ (JSON on startup)
```

| Layer | Tech |
|-------|------|
| API | Node.js 20, Express, `pg`, Ajv |
| DB | PostgreSQL 14 |
| UI | React 18, Vite, react-diff-viewer-continued |
| Deploy | Docker Compose, multi-stage frontend build |

---

## Quick start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose v2

### Run everything

```bash
cp .env.example .env
docker compose up --build
```

| Service | URL |
|---------|-----|
| **UI** | http://localhost:8080 |
| **Health** | http://localhost:3001/health |

Default API key (see `submission.json`): `a-secure-test-api-key-12345`  
Header: `X-API-KEY`

All services include health checks; the API waits for Postgres and seeds data from `seeds/` on startup.

---

## Seeded data

| Subject | Versions | Compatibility |
|---------|----------|-----------------|
| `user-profile` | 2 | BACKWARD |
| `order-event` | 1 | FULL |

Configured in `submission.json` for automated evaluation.

---

## API reference

Base path: `/api/schemas` and `/api/validate` (legacy `/schemas` and `/validate` also work).

**Authentication:** mutating routes require `X-API-KEY`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | Liveness + DB check |
| GET | `/api/schemas/subjects` | No | List subjects |
| GET | `/api/schemas/{subject}` | No | Latest active schema |
| GET | `/api/schemas/{subject}/versions` | No | `{ "versions": [1,2] }` |
| GET | `/api/schemas/{subject}/versions/{v}` | No | Schema at version |
| POST | `/api/schemas/{subject}` | Yes | Register version (compatibility check) |
| DELETE | `/api/schemas/{subject}/versions/{v}` | Yes | Soft-deprecate (204) |
| PUT | `/api/schemas/config/{subject}` | Yes | Set compatibility mode |
| POST | `/api/schemas/{subject}/compatibility` | No* | Check candidate `{ "schema": ... }` → `{ "is_compatible": bool }` |
| POST | `/api/validate/{subject}` | No | Validate body → `{ "status": "valid" }` or 400 |

\*Compatibility POST with `base_version` / `target_version` is also supported for the UI matrix.

### Examples

**Register schema (201 / 409):**

```bash
curl -X POST http://localhost:3001/api/schemas/my-subject \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: a-secure-test-api-key-12345" \
  -d '{"schema":{"type":"object","required":["id"],"properties":{"id":{"type":"string"}}}}'
```

**Validate payload:**

```bash
curl -X POST http://localhost:3001/api/validate/order-event \
  -H "Content-Type: application/json" \
  -d '{"orderId":"o-1","amount":42.5}'
```

---

## Compatibility rules

Implemented in `backend/src/compatibility/` (flatten + checker):

| Mode | Meaning |
|------|---------|
| **BACKWARD** | New schema can read data written with the old schema |
| **FORWARD** | Old schema can read data written with the new schema |
| **FULL** | Both |
| **NONE** | Always allow |

---

## Frontend

Open http://localhost:8080:

1. **Subject list** — browse subjects and versions
2. **Version diff** — select two versions for a side-by-side JSON diff
3. **Compatibility matrix** — grid of version pairs
4. **Payload validator** — paste JSON and validate against the latest schema

---

## Configuration

Copy `.env.example` to `.env`. Key variables:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres connection (local dev) |
| `API_PORT` | API port (default 3001) |
| `FRONTEND_PORT` | UI port (default 8080) |
| `API_KEY` | Mutating API auth |
| `POSTGRES_*` | Database container |
| `SEED_DIR` | Seed JSON directory |
| `VITE_API_URL` / `VITE_API_KEY` | Frontend build-time (empty `VITE_API_URL` in Docker uses nginx proxy) |

---

## Development

```bash
# Backend
cd backend && npm install && npm run dev

# Frontend (proxies to :3001)
cd frontend && npm install && npm run dev

# E2E (stack must be running on :8080)
npm install && npx playwright test
```

---

## Project structure

```
SchemaRegistry/
├── docker-compose.yml
├── .env.example
├── submission.json
├── seeds/
├── backend/
│   ├── Dockerfile
│   └── src/
│       ├── compatibility/   # Core compatibility logic
│       ├── middleware/
│       ├── routes/
│       └── services/
├── frontend/
│   ├── Dockerfile
│   └── src/
└── e2e/                       # Playwright tests
```

---

## License

MIT
