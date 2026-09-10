# BSE Trades Dashboard

A production-grade trading operations dashboard built for technical assessment. It demonstrates how to handle long-running data ingestion (~15 minutes) against external exchange APIs without suffering HTTP connection timeouts (>30 seconds), while providing instant dashboard loading and real-time live streaming updates without polling or cron jobs.

[![Architecture Note](https://img.shields.io/badge/docs-Architecture%20Note-f43f5e?style=flat-square)](./docs/architecture.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?style=flat-square)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4.21-white?style=flat-square)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square)](https://www.postgresql.org/)

---

## 🎯 The Core Engineering Challenge

- **Scenario:** Pulling full trade records from the BSE Exchange API takes up to 15 minutes (~900 seconds).
- **Network Constraint:** Intermediate reverse proxies, load balancers, and gateways terminate any HTTP connection held open longer than 30 seconds.
- **The Solution:**
  1. **Decouple Trigger from Ingestion:** `POST /api/trades/pull` returns `202 Accepted` immediately with a `jobId` in milliseconds.
  2. **Bounded Sub-30s Chunks:** The background worker queries the Mock BSE API in paginated batches (`?offset=0&limit=500`), ensuring each HTTP request finishes well before the 30-second ceiling.
  3. **Incremental Persistence:** Batches are saved to PostgreSQL with `ON CONFLICT (trade_id) DO NOTHING` for idempotency.
  4. **Server-Sent Events (SSE):** Connected React dashboards subscribe to `GET /api/events` to stream progress and batch updates without polling loops, cron jobs, or page refreshes.

---

## 🏗️ Architecture Overview

```
                      ┌──────────────────────────────────────────────┐
                      │          React Dashboard (Port 5173)         │
                      └───────┬──────────────────────────────▲───────┘
                              │ 1. Initial Load: GET /trades │
                              │ 2. Trigger: POST /pull       │ 5. SSE Events
                              ▼                              │    (trades_updated)
                      ┌──────────────────────────────┐       │
                      │     Express API (Port 3001)  │       │
                      └───────┬──────────────────────┴───────┼───────┐
                              │ Immediate 202 Accepted       │       │
                              ▼                              │       │
                      ┌──────────────────────────────┐       │       │
                      │    Background Pull Worker    │       │       │
                      │      (trade-pull-job.ts)     │       │       │
                      └───────┬──────────────────────┘       │       │
                              │                              │       │
               3. HTTP Batches│(< 30s each)                  │       │
               (offset/limit) │                              │       │
                              ▼                              │       │
                      ┌──────────────────────────────┐       │       │
                      │        Mock BSE API          │       │       │
                      │         /getTrades           │       │       │
                      └───────┬──────────────────────┘       │       │
                              │                              │       │
               4. Persist     │                              │       │
               Incremental    ▼                              │       │
                      ┌──────────────────────────────┐       │       │
                      │     PostgreSQL Database      │       │       │
                      │   (trades & pull_jobs)       ├───────┘       │
                      └──────────────────────────────┘               │
                                     │                               │
                                     ▼                               │
                      ┌──────────────────────────────┐               │
                      │     Realtime EventManager    ├───────────────┘
                      │       (GET /api/events)      │
                      └──────────────────────────────┘
```

> Read the full architectural rationale and design choices in [docs/architecture.md](./docs/architecture.md).

---

## 📋 Assessment Requirement Mapping

| Assessment Requirement                     | Implementation Detail                                                                                                                                    | Status  |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | :-----: |
| **Mock BSE API (`GET /getTrades`)**        | Seeded with 3,000 deterministic records in `mock_bse_trades`. Returns `tradeId`, `client`, `symbol`, `quantity`, `price`, `timestamp`.                   | ✅ PASS |
| **Configurable Delay (Up to 15m)**         | Configurable via `BSE_DELAY_MS`. Includes `DEMO_MODE=true` (fast 1s batches for demo) vs `DEMO_MODE=false` (25s batches approaching 15 minutes safely).  | ✅ PASS |
| **Prevent >30s HTTP Timeouts**             | Sequential bounded HTTP batches (`limit=500`). No single HTTP request ever exceeds 29 seconds.                                                           | ✅ PASS |
| **Instant Dashboard Load**                 | React dashboard opens immediately and queries `GET /api/trades` from PostgreSQL. Previously pulled data displays in milliseconds even while a pull runs. | ✅ PASS |
| **Asynchronous Background Pull**           | `POST /api/trades/pull` returns `202 Accepted` + `jobId` in ~15ms. Ingestion runs decoupled in the background.                                           | ✅ PASS |
| **Live Updates without Polling / Refresh** | Subscribes to `GET /api/events` via native browser `EventSource` (SSE). Zero `setInterval`, zero cron jobs, zero page reloads.                           | ✅ PASS |
| **Concurrency Guard**                      | Returns `409 Conflict` if a pull is active. Enforced both in-app and by a PostgreSQL unique partial index on `pull_jobs`.                                | ✅ PASS |
| **Duplicate Prevention**                   | `ON CONFLICT (trade_id) DO NOTHING` on PostgreSQL `trades` table.                                                                                        | ✅ PASS |

---

## 🛠️ Tech Stack

- **Backend:** Node.js, Express, TypeScript, `pg` (PostgreSQL client), `dotenv`, `cors`.
- **Frontend:** React 19, TypeScript, Vite, Vanilla CSS with custom modern dark-obsidian aesthetic.
- **Database:** PostgreSQL 16 (Alpine Docker Container).
- **Real-time:** Server-Sent Events (SSE) with keepalive heartbeats and auto-reconnection.
- **Testing:** Vitest, Supertest (12/12 passing unit & integration tests).

---

## 🚀 Quickstart & Setup

### Prerequisites

- [Node.js](https://nodejs.org/) v20 or newer
- [Docker Desktop](https://www.docker.com/) (running for PostgreSQL)

### 1. Start PostgreSQL

```powershell
docker compose up -d
```

Verify the container is running and healthy:

```powershell
docker ps
```

### 2. Install Dependencies

```powershell
npm install
```

### 3. Initialize & Seed Database

Create tables (`trades`, `pull_jobs`, `mock_bse_trades`) and populate 3,000 deterministic BSE records:

```powershell
npm run db:init --workspace=backend
npm run db:seed --workspace=backend
```

### 4. Configure Environment Files

Default `.env` files are already configured:

**`backend/.env`:**

```ini
PORT=3001
CLIENT_ORIGIN=http://localhost:5173
DATABASE_URL=postgresql://trade_user:trade_password@localhost:5432/trade_dashboard
DEMO_MODE=true
BSE_DELAY_MS=1000
BSE_DEFAULT_BATCH_SIZE=500
BSE_TOTAL_RECORDS=3000
```

**`frontend/.env`:**

```ini
VITE_API_BASE_URL=http://localhost:3001
VITE_BSE_TOTAL_RECORDS=3000
```

---

## 💻 Running the Application

In your terminal, start both backend and frontend:

### Start Backend API

```powershell
npm run dev:backend
# API listening on http://localhost:3001
```

### Start Frontend Dashboard

In a second terminal:

```powershell
npm run dev:frontend
# Vite ready at http://localhost:5173
```

Open your browser to: **[http://localhost:5173](http://localhost:5173)**

---

## 🧪 Testing & Verification

Run the full integration test suite:

```powershell
npm run test --workspace=backend
```

Run static type checking across all workspaces:

```powershell
npm run typecheck
```

---

## 🔌 API Reference

| Method | Endpoint                        | Description                                | Sample Output                                                                        |
| ------ | ------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------ |
| `GET`  | `/api/health`                   | Service and database health check          | `{"status":"ok","service":"trade-dashboard-api","database":"connected"}`             |
| `GET`  | `/getTrades?offset=0&limit=500` | Mock BSE Exchange paginated trades         | `{"trades":[...],"pagination":{"offset":0,"limit":500,"total":3000,"hasMore":true}}` |
| `POST` | `/api/trades/pull`              | Trigger background trade pull (immediate)  | `HTTP 202 {"jobId":"...","status":"RUNNING"}`                                        |
| `GET`  | `/api/trades`                   | List latest persisted trades + total count | `{"trades":[...],"totalCount":3000}`                                                 |
| `GET`  | `/api/trades/pull/:jobId`       | Check status of a specific pull job        | `{"jobId":"...","status":"COMPLETED","recordsProcessed":3000}`                       |
| `GET`  | `/api/events`                   | Server-Sent Events real-time push stream   | Streams `trades_updated`, `pull_completed`, `pull_failed`                            |
| `POST` | `/api/trades/reset`             | Clear persisted trades (demo helper)       | `{"status":"cleared","totalCount":0}`                                                |

---

## 🎥 Video Walkthrough Outline (3 Minutes)

- **0:00 - 0:30 | The Core Problem**: Explain the 15-minute pull vs. 30-second network kill constraint, and how decoupling solves it.
- **0:30 - 1:15 | Instant Load & Initial State**: Open [http://localhost:5173](http://localhost:5173), show previously persisted trades loading immediately from PostgreSQL. Click "Reset DB (Demo)" to demonstrate empty state.
- **1:15 - 2:00 | Trigger Background Pull**: Click "Pull Latest Trades". Show the instant 202 Accepted response.
- **2:00 - 2:40 | Live Streaming without Polling**: Show terminal logs fetching sequential batches (`offset=0`, `offset=500`). Watch the progress bar and trade list update live via Server-Sent Events (SSE).
- **2:40 - 3:00 | Architecture Summary**: Reiterate why no HTTP connection survived 15 minutes, why SSE was chosen over polling, and show tests passing.
