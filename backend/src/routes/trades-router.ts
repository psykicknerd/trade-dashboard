import { Router } from "express";
import {
  getLatestPullJob,
  getPullJob,
} from "../db/repositories/pull-job-repository.js";
import {
  clearPersistedTrades,
  getPersistedTradeCount,
  listPersistedTrades,
} from "../db/repositories/trade-repository.js";
import {
  PullAlreadyRunningError,
  startTradePull,
} from "../jobs/trade-pull-job.js";

const tradesRouter = Router();

tradesRouter.post("/api/trades/pull", async (_request, response, next) => {
  try {
    const job = await startTradePull();
    response.status(202).json({ jobId: job.id, status: job.status });
  } catch (error) {
    if (error instanceof PullAlreadyRunningError) {
      response.status(409).json({
        error: error.message,
        jobId: error.job.id,
        status: error.job.status,
      });
      return;
    }
    next(error);
  }
});

tradesRouter.get("/api/trades", async (_request, response, next) => {
  try {
    const [trades, totalCount] = await Promise.all([
      listPersistedTrades(),
      getPersistedTradeCount(),
    ]);
    response.json({ trades, totalCount });
  } catch (error) {
    next(error);
  }
});

tradesRouter.post("/api/trades/reset", async (_request, response, next) => {
  try {
    await clearPersistedTrades();
    response.json({ status: "cleared", totalCount: 0 });
  } catch (error) {
    next(error);
  }
});

tradesRouter.get("/api/trades/pull", async (_request, response, next) => {
  try {
    const job = await getLatestPullJob();
    response.json({
      job: job
        ? {
            jobId: job.id,
            status: job.status,
            recordsProcessed: job.recordsProcessed,
            startedAt: job.startedAt,
            completedAt: job.completedAt,
            error: job.error,
          }
        : null,
    });
  } catch (error) {
    next(error);
  }
});

tradesRouter.get("/api/trades/pull/:jobId", async (request, response, next) => {
  try {
    const job = await getPullJob(request.params.jobId);
    if (!job) {
      response.status(404).json({ error: "Pull job not found." });
      return;
    }
    response.json({
      jobId: job.id,
      status: job.status,
      recordsProcessed: job.recordsProcessed,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      error: job.error,
    });
  } catch (error) {
    next(error);
  }
});

export default tradesRouter;
