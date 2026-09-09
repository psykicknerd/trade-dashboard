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

export async function createPullJob(): Promise<PullJob> {
  const id = randomUUID();
  const result = await pool.query(
    `INSERT INTO pull_jobs (id, status) VALUES ($1, 'PENDING')
     RETURNING id, status, started_at, completed_at, records_processed, error, created_at`,
    [id]
  );
  const row = result.rows[0];
  return {
    id: row.id,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    recordsProcessed: row.records_processed,
    error: row.error,
    createdAt: row.created_at
  };
}
