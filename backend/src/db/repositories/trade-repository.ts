import type { QueryResultRow } from "pg";
import { pool } from "../pool.js";
import type { TradeRecord } from "../types.js";

interface TradeRow extends QueryResultRow {
  trade_id: string;
  client: string;
  symbol: string;
  quantity: number;
  price: string;
  timestamp: Date;
}

function mapTrade(row: TradeRow): TradeRecord {
  return {
    tradeId: row.trade_id,
    client: row.client,
    symbol: row.symbol,
    quantity: row.quantity,
    price: Number(row.price),
    timestamp: row.timestamp,
  };
}

export async function getPersistedTradeCount(): Promise<number> {
  const result = await pool.query<{ count: string }>(
    "SELECT COUNT(*) FROM trades",
  );
  return Number(result.rows[0].count);
}

export async function clearPersistedTrades(): Promise<void> {
  await pool.query("TRUNCATE TABLE trades");
}

export async function listPersistedTrades(limit = 100): Promise<TradeRecord[]> {
  const result = await pool.query<TradeRow>(
    `SELECT trade_id, client, symbol, quantity, price, timestamp
     FROM trades ORDER BY timestamp DESC LIMIT $1`,
    [limit],
  );
  return result.rows.map(mapTrade);
}

export async function insertTrades(trades: TradeRecord[]): Promise<number> {
  if (trades.length === 0) return 0;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let inserted = 0;
    for (const trade of trades) {
      const result = await client.query(
        `INSERT INTO trades (trade_id, client, symbol, quantity, price, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (trade_id) DO NOTHING`,
        [
          trade.tradeId,
          trade.client,
          trade.symbol,
          trade.quantity,
          trade.price,
          trade.timestamp,
        ],
      );
      inserted += result.rowCount ?? 0;
    }
    await client.query("COMMIT");
    return inserted;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
