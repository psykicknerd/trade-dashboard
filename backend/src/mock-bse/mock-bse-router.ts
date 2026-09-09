import { Router } from "express";
import { bseConfig } from "../config/bse.js";
import { fetchMockBseTradeBatch } from "./mock-bse-service.js";

const mockBseRouter = Router();

function parseNonNegativeInteger(value: unknown, parameter: string, fallback?: number): number {
  if (value === undefined && fallback !== undefined) return fallback;
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new Error(`${parameter} must be a non-negative integer.`);
  }
  return Number(value);
}

mockBseRouter.get("/getTrades", async (request, response, next) => {
  try {
    const offset = parseNonNegativeInteger(request.query.offset, "offset", 0);
    const limit = parseNonNegativeInteger(request.query.limit, "limit", bseConfig.defaultBatchSize);
    if (limit === 0 || limit > bseConfig.maxBatchSize) {
      response.status(400).json({ error: `limit must be between 1 and ${bseConfig.maxBatchSize}.` });
      return;
    }
    response.json(await fetchMockBseTradeBatch(offset, limit));
  } catch (error) {
    if (error instanceof Error && error.message.includes("must be a non-negative integer")) {
      response.status(400).json({ error: error.message });
      return;
    }
    next(error);
  }
});

export default mockBseRouter;
