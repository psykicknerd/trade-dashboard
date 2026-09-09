import "dotenv/config";
import { pool } from "./pool.js";
import type { TradeRecord } from "./types.js";

const symbols = ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "SBIN"];
const totalRecords = Number(process.env.BSE_TOTAL_RECORDS ?? 3000);
const batchSize = 500;
const start = Date.UTC(2026, 0, 2, 3, 45, 0);

function createTrade(index: number): TradeRecord {
  return {
    tradeId: `BSE-2026-${String(index + 1).padStart(6, "0")}`,
    client: `CLIENT-${String((index % 240) + 1).padStart(3, "0")}`,
    symbol: symbols[index % symbols.length],
    quantity: ((index % 20) + 1) * 25,
    price: Number((850 + ((index * 37) % 3600) + (index % 100) / 100).toFixed(2)),
    timestamp: new Date(start + index * 30_000)
  };
}

async function seedMockBseTrades() {
  if (!Number.isInteger(totalRecords) || totalRecords <= 0) {
    throw new Error("BSE_TOTAL_RECORDS must be a positive integer.");
  }
  let inserted = 0;
  for (let offset = 0; offset < totalRecords; offset += batchSize) {
    const records = Array.from({ length: Math.min(batchSize, totalRecords - offset) }, (_, index) => createTrade(offset + index));
    const values = records.flatMap((trade) => [trade.tradeId, trade.client, trade.symbol, trade.quantity, trade.price, trade.timestamp]);
    const placeholders = records.map((_, index) => {
      const valueOffset = index * 6;
      return `($${valueOffset + 1}, $${valueOffset + 2}, $${valueOffset + 3}, $${valueOffset + 4}, $${valueOffset + 5}, $${valueOffset + 6})`;
    }).join(", ");
    const result = await pool.query(
      `INSERT INTO mock_bse_trades (trade_id, client, symbol, quantity, price, timestamp)
       VALUES ${placeholders} ON CONFLICT (trade_id) DO NOTHING`,
      values
    );
    inserted += result.rowCount ?? 0;
  }
  console.log(`Mock BSE seed complete: ${inserted} new records (${totalRecords} requested).`);
}

seedMockBseTrades()
  .catch((error: unknown) => {
    console.error("Mock BSE seeding failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => pool.end());
