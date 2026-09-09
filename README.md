# BSE Trades Dashboard

Technical-assessment project for a dashboard that reads persisted trade data and receives live updates while a trade pull runs in the background.

## Foundation status

This initial phase creates the monorepo, Express and React/Vite application shells, environment templates, and PostgreSQL Docker Compose configuration. Trade storage, the Mock BSE API, background jobs, and SSE will be added in later phases.

## Prerequisites

- Node.js 20 or newer
- npm
- Docker Desktop (for PostgreSQL)

## Setup

Run `npm install`, copy each `.env.example` file to `.env`, then run `docker compose up -d`.

## Run

Start the backend with `npm run dev:backend` and the frontend with `npm run dev:frontend`.

- Backend health endpoint: `http://localhost:3000/api/health`
- Frontend: `http://localhost:5173`

## Structure

- `backend/`: Express API application
- `frontend/`: React + Vite dashboard application
- `docs/`: Architecture and assessment documentation
- `docker-compose.yml`: Local PostgreSQL service
