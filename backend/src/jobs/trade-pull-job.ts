import { bseConfig } from "../config/bse.js";
import { insertTrades } from "../db/repositories/trade-repository.js";
import {
  completePullJob,
  createRunningPullJob,
  failPullJob,
  getActivePullJob,
  updatePullJobProgress,
  type PullJob,
} from "../db/repositories/pull-job-repository.js";
import type { TradeRecord } from "../db/types.js";

interface BseBatchResponse {
  trades: TradeRecord[];
  pagination: { offset: number; limit: number; total: number; hasMore: boolean };
}

export class PullAlreadyRunningError extends Error {
  constructor(public readonly job: PullJob) {
    super("A trade pull is already running.");
  }
}

async function requestBseBatch(offset: number): Promise<BseBatchResponse> {
  const url = new URL("/getTrades", bseConfig.apiBaseUrl);
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("limit", String(bseConfig.defaultBatchSize));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), bseConfig.requestTimeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Mock BSE request failed with HTTP ${response.status}.`);
    return (await response.json()) as BseBatchResponse;
  } finally {
    clearTimeout(timer);
  }
}

async function runTradePull(jobId: string): Promise<void> {
  let offset = 0;
  let recordsProcessed = 0;

  try {
    console.log(`[Pull Job ${jobId}] Started`);
    while (true) {
      console.log(`[BSE] Fetching batch at offset ${offset}`);
      const batch = await requestBseBatch(offset);
      const inserted = await insertTrades(batch.trades);
      recordsProcessed += batch.trades.length;
      await updatePullJobProgress(jobId, recordsProcessed);
      console.log(`[Pull Job ${jobId}] Processed ${batch.trades.length} trades (${inserted} newly saved)`);

      if (!batch.pagination.hasMore) break;
      if (batch.trades.length === 0) throw new Error("Mock BSE returned an empty page before completion.");
      offset += batch.trades.length;
    }

    await completePullJob(jobId, recordsProcessed);
    console.log(`[Pull Job ${jobId}] Completed (${recordsProcessed} records processed)`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown trade pull failure.";
    await failPullJob(jobId, message);
    console.error(`[Pull Job ${jobId}] Failed: ${message}`);
  }
}

export async function startTradePull(): Promise<PullJob> {
  const activeJob = await getActivePullJob();
  if (activeJob) throw new PullAlreadyRunningError(activeJob);

  let job: PullJob;
  try {
    job = await createRunningPullJob();
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      const concurrentJob = await getActivePullJob();
      if (concurrentJob) throw new PullAlreadyRunningError(concurrentJob);
    }
    throw error;
  }

  setImmediate(() => void runTradePull(job.id));
  return job;
}
