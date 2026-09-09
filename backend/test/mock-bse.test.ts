import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

process.env.DATABASE_URL ??= "postgresql://trade_user:trade_password@localhost:5432/trade_dashboard";
process.env.BSE_DELAY_MS = "0";
process.env.BSE_DEFAULT_BATCH_SIZE = "500";

let app: Awaited<typeof import("../src/app.js")>["default"];

beforeAll(async () => {
  ({ default: app } = await import("../src/app.js"));
});

describe("GET /getTrades", () => {
  it("returns a deterministic paginated batch with the requested shape", async () => {
    const response = await request(app).get("/getTrades?offset=500&limit=3").expect(200);
    expect(response.body.pagination).toEqual({ offset: 500, limit: 3, total: 3000, hasMore: true });
    expect(response.body.trades).toHaveLength(3);
    expect(response.body.trades[0]).toMatchObject({
      tradeId: "BSE-2026-000501",
      client: "CLIENT-021",
      symbol: "INFY",
      quantity: 25,
      price: 1350,
    });
    expect(response.body.trades[0].timestamp).toEqual(expect.any(String));
  });

  it("returns the correct last page and total", async () => {
    const response = await request(app).get("/getTrades?offset=2999&limit=500").expect(200);
    expect(response.body.trades).toHaveLength(1);
    expect(response.body.pagination).toEqual({ offset: 2999, limit: 500, total: 3000, hasMore: false });
  });

  it.each(["?offset=-1", "?offset=one", "?limit=0", "?limit=1001", "?limit=1.5"])("rejects invalid parameters: %s", async (query) => {
    await request(app).get(`/getTrades${query}`).expect(400);
  });
});
