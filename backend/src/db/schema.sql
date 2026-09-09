CREATE TABLE IF NOT EXISTS trades (
  id BIGSERIAL PRIMARY KEY,
  trade_id VARCHAR(100) NOT NULL UNIQUE,
  client VARCHAR(100) NOT NULL,
  symbol VARCHAR(50) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price NUMERIC(15, 2) NOT NULL CHECK (price >= 0),
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS trades_timestamp_idx ON trades (timestamp DESC);

CREATE TABLE IF NOT EXISTS pull_jobs (
  id UUID PRIMARY KEY,
  status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  records_processed INTEGER NOT NULL DEFAULT 0 CHECK (records_processed >= 0),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS pull_jobs_status_idx ON pull_jobs (status);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_pull_job_idx
  ON pull_jobs ((true))
  WHERE status IN ('PENDING', 'RUNNING');

-- Seeded data source for the Mock BSE API to be added in Phase 2.
CREATE TABLE IF NOT EXISTS mock_bse_trades (
  id BIGSERIAL PRIMARY KEY,
  trade_id VARCHAR(100) NOT NULL UNIQUE,
  client VARCHAR(100) NOT NULL,
  symbol VARCHAR(50) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price NUMERIC(15, 2) NOT NULL CHECK (price >= 0),
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS mock_bse_trades_timestamp_idx ON mock_bse_trades (timestamp DESC);
