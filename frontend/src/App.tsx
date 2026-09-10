import { useCallback, useEffect, useMemo, useState } from "react";
import { eventsUrl, getLatestPullJob, getTrades, startPull, type PullJob, type Trade } from "./api";

const expectedTotal = Number(import.meta.env.VITE_BSE_TOTAL_RECORDS ?? 3000);

function formatDate(value: string | null): string {
  return value ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "medium" }).format(new Date(value)) : "—";
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value);
}

function App() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [job, setJob] = useState<PullJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingPull, setStartingPull] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [totalRecords, setTotalRecords] = useState(expectedTotal);

  const loadTrades = useCallback(async () => {
    const response = await getTrades();
    setTrades(response.trades);
  }, []);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const [tradesResponse, jobResponse] = await Promise.all([getTrades(), getLatestPullJob()]);
      setTrades(tradesResponse.trades);
      setJob(jobResponse.job);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadDashboard(); }, [loadDashboard]);

  useEffect(() => {
    const source = new EventSource(eventsUrl());
    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);
    source.addEventListener("trades_updated", (event) => {
      const payload = JSON.parse(event.data) as { jobId: string; totalProcessed: number; totalRecords: number };
      setJob((current) => ({
        jobId: payload.jobId,
        status: "RUNNING",
        recordsProcessed: payload.totalProcessed,
        startedAt: current?.startedAt ?? new Date().toISOString(),
        completedAt: null,
        error: null,
      }));
      setTotalRecords(payload.totalRecords);
      void loadTrades().catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Unable to refresh trades."));
    });
    source.addEventListener("pull_completed", (event) => {
      const payload = JSON.parse(event.data) as { jobId: string; recordsProcessed: number; totalRecords: number };
      setJob((current) => ({
        jobId: payload.jobId,
        status: "COMPLETED",
        recordsProcessed: payload.recordsProcessed,
        startedAt: current?.startedAt ?? new Date().toISOString(),
        completedAt: new Date().toISOString(),
        error: null,
      }));
      setTotalRecords(payload.totalRecords);
      void loadTrades().catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Unable to refresh trades."));
    });
    source.addEventListener("pull_failed", (event) => {
      const payload = JSON.parse(event.data) as { jobId: string; error: string };
      setJob((current) => current ? { ...current, status: "FAILED", error: payload.error } : null);
      setError(payload.error);
    });
    return () => source.close();
  }, [loadTrades]);

  const beginPull = async () => {
    try {
      setStartingPull(true);
      setError(null);
      const response = await startPull();
      setJob({ jobId: response.jobId, status: response.status, recordsProcessed: 0, startedAt: new Date().toISOString(), completedAt: null, error: null });
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "Unable to start pull.");
    } finally {
      setStartingPull(false);
    }
  };

  const progress = useMemo(() => {
    if (!job || totalRecords === 0) return 0;
    return Math.min(100, Math.round((job.recordsProcessed / totalRecords) * 100));
  }, [job, totalRecords]);
  const isRunning = job?.status === "RUNNING";

  return (
    <main className="page">
      <header className="topbar">
        <div>
          <p className="eyebrow">LIVE MARKET OPERATIONS</p>
          <h1>BSE Trades Dashboard</h1>
        </div>
        <div className="actions">
          <span className={`connection ${connected ? "online" : "offline"}`}><i /> {connected ? "Live updates connected" : "Reconnecting…"}</span>
          <button type="button" onClick={() => void beginPull()} disabled={isRunning || startingPull}>{isRunning ? "Pull in progress" : "Pull Latest Trades"}</button>
        </div>
      </header>

      {error && <div className="alert" role="alert">{error}</div>}

      <section className="stats" aria-label="Trade summary">
        <article><span>Total Trades</span><strong>{trades.length.toLocaleString()}</strong><small>Most recent persisted records</small></article>
        <article><span>Pull Status</span><strong className={`status ${job?.status?.toLowerCase() ?? "idle"}`}>{job?.status ?? "IDLE"}</strong><small>{connected ? "Receiving live events" : "Event stream reconnecting"}</small></article>
        <article><span>Records Processed</span><strong>{job?.recordsProcessed.toLocaleString() ?? "0"}</strong><small>of {totalRecords.toLocaleString()} source records</small></article>
        <article><span>Last Pull</span><strong className="date-value">{formatDate(job?.completedAt ?? null)}</strong><small>Completion time</small></article>
      </section>

      <section className="panel progress-panel">
        <div className="panel-heading"><div><h2>Pull progress</h2><p>{isRunning ? "Processing short-lived BSE batches in the background." : "Start a pull to fetch the latest Mock BSE source records."}</p></div><strong>{progress}%</strong></div>
        <div className="progress-track" aria-label={`${progress}% complete`}><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
        <div className="progress-meta"><span>{job?.recordsProcessed.toLocaleString() ?? "0"} / {totalRecords.toLocaleString()} records</span><span>{job?.error ?? (isRunning ? "Updates arrive through SSE" : "Ready")}</span></div>
      </section>

      <section className="panel table-panel">
        <div className="panel-heading"><div><h2>Persisted trades</h2><p>Data stays visible while a new pull is running.</p></div><span className="table-count">{trades.length} records shown</span></div>
        {loading ? <div className="empty-state">Loading persisted trades…</div> : trades.length === 0 ? <div className="empty-state">No trades have been pulled yet. Start the first pull above.</div> : <div className="table-wrap"><table><thead><tr><th>Trade ID</th><th>Client</th><th>Symbol</th><th>Quantity</th><th>Price</th><th>Timestamp</th></tr></thead><tbody>{trades.map((trade) => <tr key={trade.tradeId}><td className="trade-id">{trade.tradeId}</td><td>{trade.client}</td><td><span className="symbol">{trade.symbol}</span></td><td>{trade.quantity.toLocaleString()}</td><td>{formatCurrency(trade.price)}</td><td>{formatDate(trade.timestamp)}</td></tr>)}</tbody></table></div>}
      </section>
    </main>
  );
}

export default App;
