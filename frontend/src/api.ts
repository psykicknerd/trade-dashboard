const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export type PullStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

export interface Trade {
  tradeId: string;
  client: string;
  symbol: string;
  quantity: number;
  price: number;
  timestamp: string;
}

export interface PullJob {
  jobId: string;
  status: PullStatus;
  recordsProcessed: number;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, options);
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(
      body?.error ?? `Request failed with HTTP ${response.status}.`,
    );
  }
  return response.json() as Promise<T>;
}

export function getTrades() {
  return request<{ trades: Trade[]; totalCount: number }>("/api/trades");
}

export function getLatestPullJob() {
  return request<{ job: PullJob | null }>("/api/trades/pull");
}

export function startPull() {
  return request<{ jobId: string; status: PullStatus }>("/api/trades/pull", {
    method: "POST",
  });
}

export function resetTrades() {
  return request<{ status: string; totalCount: number }>("/api/trades/reset", {
    method: "POST",
  });
}

export function eventsUrl() {
  return `${apiBaseUrl}/api/events`;
}
