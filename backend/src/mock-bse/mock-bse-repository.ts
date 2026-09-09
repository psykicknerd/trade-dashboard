import type { QueryResultRow } from "pg";
import { pool } from "../db/pool.js";
import type { TradeRecord } from "../db/types.js";

interface MockBseTradeRow extends QueryResultRow {
  trade_id: string;
  client: string;
  symbol: string;
  quantity: number;
  price: string;
  timestamp: Date;
}

function toTradeRecord(row: MockBseTradeRow): TradeRecord {
  return {
    tradeId: row.trade_id,
    client: row.client,
    symbol: row.symbol,
    quantity: row.quantity,
    price: Number(row.price),
    timestamp: row.timestamp,
  };
}

export async function getMockBseTradeCount(): Promise<number> {
  const result = await pool.query<{ count: string }>("SELECT COUNT(*) FROM mock_bse_trades");
  return Number(result.rows[0].count);
}

export async function getMockBseTrades(offset: number, limit: number): Promise<TradeRecord[]> {
  const result = await pool.query<MockBseTradeRow>(
    `SELECT trade_id, client, symbol, quantity, price, timestamp
     FROM mock_bse_trades
     ORDER BY id ASC OFFSET $1 LIMIT $2`,
    [offset, limit],
  );
  return result.rows.map(toTradeRecord);
}
