import { Router } from "express";
import { eventManager } from "../realtime/event-manager.js";

const eventsRouter = Router();

eventsRouter.get("/api/events", (request, response) => {
  response.status(200).set({
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "Content-Type": "text/event-stream",
    "X-Accel-Buffering": "no",
  });
  response.flushHeaders();

  const removeClient = eventManager.addClient(response);
  request.on("close", removeClient);
});

export default eventsRouter;
