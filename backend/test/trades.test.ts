import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

process.env.DATABASE_URL ??= "postgresql://trade_user:trade_password@localhost:5432/trade_dashboard";
process.env.BSE_DELAY_MS = "0";

let app: Awaited<typeof import("../src/app.js")>["default"];

beforeAll(async () => {
  ({ default: app } = await import("../src/app.js"));
});

describe("Trades API", () => {
  it("GET /api/health returns database connectivity status", async () => {
    const response = await request(app).get("/api/health").expect(200);
    expect(response.body).toEqual({
      status: "ok",
      service: "trade-dashboard-api",
      database: "connected",
    });
  });

  it("GET /api/trades returns trades array and totalCount", async () => {
    const response = await request(app).get("/api/trades").expect(200);
    expect(response.body).toHaveProperty("trades");
    expect(response.body).toHaveProperty("totalCount");
    expect(Array.isArray(response.body.trades)).toBe(true);
    expect(typeof response.body.totalCount).toBe("number");
  });

  it("GET /api/trades/pull returns latest job info or null", async () => {
    const response = await request(app).get("/api/trades/pull").expect(200);
    expect(response.body).toHaveProperty("job");
    if (response.body.job !== null) {
      expect(response.body.job).toHaveProperty("jobId");
      expect(response.body.job).toHaveProperty("status");
      expect(response.body.job).toHaveProperty("recordsProcessed");
    }
  });

  it("GET /api/trades/pull/non-existent returns 404", async () => {
    await request(app).get("/api/trades/pull/00000000-0000-0000-0000-000000000000").expect(404);
  });
});
