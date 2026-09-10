import cors from "cors";
import express from "express";
import { checkDatabaseConnection } from "./db/pool.js";
import mockBseRouter from "./mock-bse/mock-bse-router.js";
import eventsRouter from "./routes/events-router.js";
import tradesRouter from "./routes/trades-router.js";

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173" }));
app.use(express.json());
app.use(mockBseRouter);
app.use(tradesRouter);
app.use(eventsRouter);

app.get("/api/health", async (_request, response) => {
  const database = await checkDatabaseConnection();
  response.status(database ? 200 : 503).json({
    status: database ? "ok" : "degraded",
    service: "trade-dashboard-api",
    database: database ? "connected" : "unavailable"
  });
});

export default app;
