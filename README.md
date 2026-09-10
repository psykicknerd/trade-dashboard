# BSE Trades Dashboard

Technical-assessment project for a dashboard that reads persisted trade data and receives live updates while a trade pull runs in the background.

## Foundation status

This initial phase creates the monorepo, Express and React/Vite application shells, environment templates, and PostgreSQL Docker Compose configuration. Phase 1 adds PostgreSQL tables, repositories, and deterministic Mock BSE seed data. The API endpoint, background jobs, and SSE will be added in later phases.

## Prerequisites

- Node.js 20 or newer
- npm
- Docker Desktop (for PostgreSQL)

## Setup

Run `npm install`, copy each `.env.example` file to `.env`, then run `docker compose up -d`.

Initialize and seed PostgreSQL:

```powershell
npm run db:init --workspace=backend
npm run db:seed --workspace=backend
```

## Run

Start the backend with `npm run dev:backend` and the frontend with `npm run dev:frontend`.

- Backend health endpoint: `http://localhost:3000/api/health`
- Frontend: `http://localhost:5173`

## Structure

- `backend/`: Express API application
- `frontend/`: React + Vite dashboard application
- `docs/`: Architecture and assessment documentation
- `docker-compose.yml`: Local PostgreSQL service

## Database foundation

- `trades` holds records persisted by pull jobs. `trade_id` is unique, and writes use `ON CONFLICT DO NOTHING` to prevent duplicates.
- `pull_jobs` stores the future pull-job lifecycle and only accepts `PENDING`, `RUNNING`, `COMPLETED`, or `FAILED`.
- `mock_bse_trades` is a separate deterministic source of 3,000 records for the Phase 2 Mock BSE API. Keeping it separate allows a pull to demonstrate moving source data into persisted `trades`.

## Mock BSE API

`GET /getTrades?offset=0&limit=500` returns a bounded page from the seeded source table. Its response contains `trades` and `pagination` (`offset`, `limit`, `total`, and `hasMore`). `offset` must be a non-negative integer; `limit` must be between 1 and 1,000.

`BSE_DELAY_MS` simulates external latency for each individual request and is capped at 29 seconds. Demo mode uses a short delay; normal mode can use a 25-second delay with a smaller batch size to approach a 15-minute total pull without exceeding the per-request connection limit.

Run API integration tests against initialized, seeded PostgreSQL:

```powershell
npm run test --workspace=backend
```

## Background trade pull

`POST /api/trades/pull` creates a `RUNNING` job and replies with `202 Accepted` immediately. The in-process worker then makes short, sequential requests to `GET /getTrades`, persists each batch in `trades`, and records progress in `pull_jobs`.

```text
POST /api/trades/pull
GET  /api/trades
GET  /api/trades/pull/:jobId
```

Only one pull may run at a time. A second request receives `409 Conflict` with the active job ID. The database's partial unique index enforces that rule even if requests arrive concurrently. If a BSE request or database operation fails, the job is marked `FAILED` with its error message.

## Real-time events (SSE)

`GET /api/events` opens a Server-Sent Events connection from a browser to the backend. This is separate from BSE batch requests: the BSE calls remain short-lived, while SSE only pushes backend-to-browser notifications.

| Event | Payload |
| --- | --- |
| `trades_updated` | `jobId`, `recordsAdded`, `totalProcessed` |
| `pull_completed` | `jobId`, `status`, `recordsProcessed` |
| `pull_failed` | `jobId`, `status`, `error` |

Verify the stream in a terminal with `curl.exe -N http://localhost:3001/api/events`, then start a pull in a second terminal. Events appear without polling or a page refresh.

## Dashboard

The React dashboard loads persisted records through `GET /api/trades` immediately, then opens an `EventSource` connection to `/api/events`. Each `trades_updated` event refreshes the displayed persisted records and updates progress; completion and failure events update status. There is no `setInterval`, page refresh, or cron job.
