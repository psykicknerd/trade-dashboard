import { bseConfig } from "../config/bse.js";
import { getMockBseTradeCount, getMockBseTrades } from "./mock-bse-repository.js";

export interface MockBseResponse {
  trades: Awaited<ReturnType<typeof getMockBseTrades>>;
  pagination: { offset: number; limit: number; total: number; hasMore: boolean };
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function fetchMockBseTradeBatch(offset: number, limit: number): Promise<MockBseResponse> {
  const [trades, total] = await Promise.all([getMockBseTrades(offset, limit), getMockBseTradeCount()]);
  if (bseConfig.delayMs > 0) await wait(bseConfig.delayMs);
  return {
    trades,
    pagination: { offset, limit, total, hasMore: offset + trades.length < total },
  };
}
