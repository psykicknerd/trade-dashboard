export type PullJobStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

export interface TradeRecord {
  tradeId: string;
  client: string;
  symbol: string;
  quantity: number;
  price: number;
  timestamp: Date;
}
