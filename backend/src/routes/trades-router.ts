import { Router } from "express";
import { getPullJob } from "../db/repositories/pull-job-repository.js";
import { listPersistedTrades } from "../db/repositories/trade-repository.js";
import { PullAlreadyRunningError, startTradePull } from "../jobs/trade-pull-job.js";

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
    response.json({ trades: await listPersistedTrades() });
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
