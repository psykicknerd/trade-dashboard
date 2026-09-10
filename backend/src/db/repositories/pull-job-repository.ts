import { randomUUID } from "node:crypto";
import { pool } from "../pool.js";
import type { PullJobStatus } from "../types.js";

export interface PullJob {
  id: string;
  status: PullJobStatus;
  startedAt: Date | null;
  completedAt: Date | null;
  recordsProcessed: number;
  error: string | null;
  createdAt: Date;
}

interface PullJobRow {
  id: string;
  status: PullJobStatus;
  started_at: Date | null;
  completed_at: Date | null;
  records_processed: number;
  error: string | null;
  created_at: Date;
}

function toPullJob(row: PullJobRow): PullJob {
  return {
    id: row.id,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    recordsProcessed: row.records_processed,
    error: row.error,
    createdAt: row.created_at,
  };
}

export async function createRunningPullJob(): Promise<PullJob> {
  const id = randomUUID();
  const result = await pool.query<PullJobRow>(
    `INSERT INTO pull_jobs (id, status, started_at) VALUES ($1, 'RUNNING', CURRENT_TIMESTAMP)
     RETURNING id, status, started_at, completed_at, records_processed, error, created_at`,
    [id]
  );
  return toPullJob(result.rows[0]);
}

export async function getPullJob(id: string): Promise<PullJob | null> {
  const result = await pool.query<PullJobRow>(
    `SELECT id, status, started_at, completed_at, records_processed, error, created_at
     FROM pull_jobs WHERE id = $1`,
    [id],
  );
  return result.rows[0] ? toPullJob(result.rows[0]) : null;
}

export async function getActivePullJob(): Promise<PullJob | null> {
  const result = await pool.query<PullJobRow>(
    `SELECT id, status, started_at, completed_at, records_processed, error, created_at
     FROM pull_jobs WHERE status IN ('PENDING', 'RUNNING') ORDER BY created_at DESC LIMIT 1`,
  );
  return result.rows[0] ? toPullJob(result.rows[0]) : null;
}

export async function getLatestPullJob(): Promise<PullJob | null> {
  const result = await pool.query<PullJobRow>(
    `SELECT id, status, started_at, completed_at, records_processed, error, created_at
     FROM pull_jobs ORDER BY created_at DESC LIMIT 1`,
  );
  return result.rows[0] ? toPullJob(result.rows[0]) : null;
}

export async function updatePullJobProgress(id: string, recordsProcessed: number): Promise<void> {
  await pool.query(
    "UPDATE pull_jobs SET records_processed = $2 WHERE id = $1 AND status = 'RUNNING'",
    [id, recordsProcessed],
  );
}

export async function completePullJob(id: string, recordsProcessed: number): Promise<void> {
  await pool.query(
    `UPDATE pull_jobs
     SET status = 'COMPLETED', records_processed = $2, completed_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND status = 'RUNNING'`,
    [id, recordsProcessed],
  );
}

export async function failPullJob(id: string, error: string): Promise<void> {
  await pool.query(
    `UPDATE pull_jobs
     SET status = 'FAILED', error = $2, completed_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND status = 'RUNNING'`,
    [id, error],
  );
}
