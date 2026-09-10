import { useCallback, useEffect, useMemo, useState } from "react";
import {
  eventsUrl,
  getLatestPullJob,
  getTrades,
  resetTrades,
  startPull,
  type PullJob,
  type Trade,
} from "./api";

const expectedTotal = Number(import.meta.env.VITE_BSE_TOTAL_RECORDS ?? 3000);

function formatDate(value: string | null): string {
  return value
    ? new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "medium",
      }).format(new Date(value))
    : "—";
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function App() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [totalTradesCount, setTotalTradesCount] = useState(0);
  const [job, setJob] = useState<PullJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingPull, setStartingPull] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [totalRecords, setTotalRecords] = useState(expectedTotal);

  const loadTrades = useCallback(async () => {
    const response = await getTrades();
    setTrades(response.trades);
    setTotalTradesCount(response.totalCount);
  }, []);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const [tradesResponse, jobResponse] = await Promise.all([
        getTrades(),
        getLatestPullJob(),
      ]);
      setTrades(tradesResponse.trades);
      setTotalTradesCount(tradesResponse.totalCount);
      setJob(jobResponse.job);
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load dashboard data.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const source = new EventSource(eventsUrl());
    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);
    source.addEventListener("trades_updated", (event) => {
      const payload = JSON.parse(event.data) as {
        jobId: string;
        totalProcessed: number;
        totalRecords: number;
      };
      setJob((current) => ({
        jobId: payload.jobId,
        status: "RUNNING",
        recordsProcessed: payload.totalProcessed,
        startedAt: current?.startedAt ?? new Date().toISOString(),
        completedAt: null,
        error: null,
      }));
      setTotalRecords(payload.totalRecords);
      void loadTrades().catch((loadError: unknown) =>
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to refresh trades.",
        ),
      );
    });
    source.addEventListener("pull_completed", (event) => {
      const payload = JSON.parse(event.data) as {
        jobId: string;
        recordsProcessed: number;
        totalRecords: number;
      };
      setJob((current) => ({
        jobId: payload.jobId,
        status: "COMPLETED",
        recordsProcessed: payload.recordsProcessed,
        startedAt: current?.startedAt ?? new Date().toISOString(),
        completedAt: new Date().toISOString(),
        error: null,
      }));
      setTotalRecords(payload.totalRecords);
      void loadTrades().catch((loadError: unknown) =>
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to refresh trades.",
        ),
      );
    });
    source.addEventListener("pull_failed", (event) => {
      const payload = JSON.parse(event.data) as {
        jobId: string;
        error: string;
      };
      setJob((current) =>
        current ? { ...current, status: "FAILED", error: payload.error } : null,
      );
      setError(payload.error);
    });
    return () => source.close();
  }, [loadTrades]);

  const beginPull = async () => {
    try {
      setStartingPull(true);
      setError(null);
      const response = await startPull();
      setJob({
        jobId: response.jobId,
        status: response.status,
        recordsProcessed: 0,
        startedAt: new Date().toISOString(),
        completedAt: null,
        error: null,
      });
    } catch (startError) {
      setError(
        startError instanceof Error
          ? startError.message
          : "Unable to start pull.",
      );
    } finally {
      setStartingPull(false);
    }
  };

  const beginReset = async () => {
    try {
      setResetting(true);
      setError(null);
      await resetTrades();
      setTrades([]);
      setTotalTradesCount(0);
      setJob(null);
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : "Unable to reset trades.",
      );
    } finally {
      setResetting(false);
    }
  };

  const progress = useMemo(() => {
    if (!job || totalRecords === 0) return 0;
    return Math.min(
      100,
      Math.round((job.recordsProcessed / totalRecords) * 100),
    );
  }, [job, totalRecords]);
  const isRunning = job?.status === "RUNNING";

  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="nav-brand">
          <span className="brand-dot" />
          <span className="brand-name">BSE Terminal</span>
          <span className="brand-badge">Assessment v1.0</span>
        </div>
        <div className="nav-links">
          <span className="nav-item">Exchange API</span>
          <span className="nav-item">SSE Stream</span>
          <span className="nav-item">PostgreSQL</span>
          <a
            href="http://localhost:3001/api/health"
            target="_blank"
            rel="noreferrer"
            className="nav-btn"
          >
            API Health
          </a>
        </div>
      </nav>

      <main className="page">
        <header className="hero">
          <div className="badge-row">
            <span className="pill-badge">
              <svg
                className="pill-icon"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              3,000 Seeded Records
            </span>
            <span className="pill-badge">
              <svg
                className="pill-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Sub-30s HTTP Chunks
            </span>
            <span className="pill-badge">
              <svg
                className="pill-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              SSE Live Stream
            </span>
          </div>

          <p className="eyebrow">
            INDEPENDENT BACKGROUND PULL • REAL-TIME SSE STREAM
          </p>
          <h1 className="hero-title">BSE Trades Dashboard</h1>
          <p className="hero-description">
            Fetch trade data from Mock BSE safely within{" "}
            <span className="highlight-tag">30-second network timeouts</span>.
            Persist incrementally to{" "}
            <span className="highlight-tag">PostgreSQL</span> while the open
            dashboard streams live updates via{" "}
            <span className="highlight-tag">Server-Sent Events</span>.
          </p>

          <div className="hero-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={() => void beginPull()}
              disabled={isRunning || startingPull || resetting}
            >
              <svg
                className="btn-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {isRunning
                ? "Pull in progress…"
                : startingPull
                  ? "Starting…"
                  : "Pull Latest Trades"}
            </button>

            <button
              type="button"
              className="btn-ghost"
              onClick={() => void beginReset()}
              disabled={isRunning || startingPull || resetting}
              title="Clear persisted trades to demonstrate empty state and fresh pull"
            >
              <svg
                className="btn-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="1 4 1 10 7 10" />
                <polyline points="23 20 23 14 17 14" />
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
              </svg>
              {resetting ? "Resetting…" : "Reset DB (Demo)"}
            </button>

            <div
              className={`connection-pill ${connected ? "online" : "offline"}`}
            >
              <span className="status-dot" />
              <span>
                {connected ? "Live events connected" : "Reconnecting stream…"}
              </span>
            </div>
          </div>
        </header>

        {error && (
          <div className="alert-box" role="alert">
            <svg
              className="alert-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <section className="stats-grid" aria-label="Trade summary">
          <article className="stat-card">
            <div className="card-top">
              <span className="card-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <ellipse cx="12" cy="5" rx="9" ry="3" />
                  <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                  <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                </svg>
              </span>
              <span className="stat-label">Total Trades</span>
            </div>
            <strong className="stat-value">
              {totalTradesCount.toLocaleString()}
            </strong>
            <small className="stat-sub">Persisted in PostgreSQL</small>
          </article>

          <article className="stat-card">
            <div className="card-top">
              <span className="card-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </span>
              <span className="stat-label">Pull Status</span>
            </div>
            <strong
              className={`stat-value status-${job?.status?.toLowerCase() ?? "idle"}`}
            >
              {job?.status ?? "IDLE"}
            </strong>
            <small className="stat-sub">
              {isRunning
                ? "Sequential BSE Batches"
                : connected
                  ? "Real-time SSE active"
                  : "Stream reconnecting"}
            </small>
          </article>

          <article className="stat-card">
            <div className="card-top">
              <span className="card-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  <polyline points="2 17 12 22 22 17" />
                  <polyline points="2 12 12 17 22 12" />
                </svg>
              </span>
              <span className="stat-label">Records Processed</span>
            </div>
            <strong className="stat-value">
              {job?.recordsProcessed.toLocaleString() ?? "0"}
            </strong>
            <small className="stat-sub">
              of {totalRecords.toLocaleString()} source records
            </small>
          </article>

          <article className="stat-card">
            <div className="card-top">
              <span className="card-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </span>
              <span className="stat-label">Last Pull Time</span>
            </div>
            <strong className="stat-value date-value">
              {formatDate(job?.completedAt ?? null)}
            </strong>
            <small className="stat-sub">Completion timestamp</small>
          </article>
        </section>

        <section className="dashboard-panel progress-panel">
          <div className="panel-header">
            <div>
              <h2>Pull Progress</h2>
              <p>
                {isRunning
                  ? "Processing short-lived BSE batches in the background (<30s each)."
                  : "Start a pull to fetch seeded Mock BSE source records into PostgreSQL."}
              </p>
            </div>
            <span className="percentage-badge">{progress}%</span>
          </div>

          <div className="progress-track" aria-label={`${progress}% complete`}>
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>

          <div className="progress-meta">
            <span>
              {job?.recordsProcessed.toLocaleString() ?? "0"} /{" "}
              {totalRecords.toLocaleString()} records
            </span>
            <span>
              {job?.error ??
                (isRunning
                  ? "Live events streaming through SSE"
                  : "Worker ready")}
            </span>
          </div>
        </section>

        <section className="dashboard-panel table-panel">
          <div className="panel-header">
            <div>
              <h2>Persisted Trades</h2>
              <p>
                Data loads instantly from PostgreSQL and remains visible while a
                pull runs.
              </p>
            </div>
            <span className="table-count-pill">
              {totalTradesCount > trades.length
                ? `Showing latest ${trades.length} of ${totalTradesCount.toLocaleString()} records`
                : `${trades.length} records in view`}
            </span>
          </div>

          {loading ? (
            <div className="empty-state">Loading persisted trades…</div>
          ) : trades.length === 0 ? (
            <div className="empty-state">
              No trades have been pulled yet. Click{" "}
              <strong>"Pull Latest Trades"</strong> above to start the first
              pull.
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Trade ID</th>
                    <th>Client</th>
                    <th>Symbol</th>
                    <th>Quantity</th>
                    <th>Price</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((trade) => (
                    <tr key={trade.tradeId}>
                      <td className="trade-id-cell">{trade.tradeId}</td>
                      <td>{trade.client}</td>
                      <td>
                        <span className="symbol-chip">{trade.symbol}</span>
                      </td>
                      <td className="quantity-cell">
                        {trade.quantity.toLocaleString()}
                      </td>
                      <td className="price-cell">
                        {formatCurrency(trade.price)}
                      </td>
                      <td className="date-cell">
                        {formatDate(trade.timestamp)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
