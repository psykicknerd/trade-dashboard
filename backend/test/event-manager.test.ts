import { describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import { eventManager } from "../src/realtime/event-manager.js";

describe("EventManager", () => {
  it("formats and publishes named SSE events, then cleans up disconnected clients", () => {
    const write = vi.fn();
    const removeClient = eventManager.addClient({ write } as unknown as Response);

    eventManager.publish("trades_updated", { jobId: "job-1", recordsAdded: 500, totalProcessed: 500 });

    expect(write).toHaveBeenCalledWith("event: trades_updated\ndata: {\"jobId\":\"job-1\",\"recordsAdded\":500,\"totalProcessed\":500}\n\n");
    expect(eventManager.clientCount).toBe(1);

    removeClient();
    expect(eventManager.clientCount).toBe(0);
  });
});
