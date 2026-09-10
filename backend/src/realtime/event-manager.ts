import type { Response } from "express";

export type TradeEventName = "trades_updated" | "pull_completed" | "pull_failed";

interface ClientConnection {
  response: Response;
  heartbeat: NodeJS.Timeout;
}

class EventManager {
  private readonly clients = new Set<ClientConnection>();

  addClient(response: Response): () => void {
    response.write("retry: 3000\n\n");
    response.write(`event: connected\ndata: ${JSON.stringify({ connected: true })}\n\n`);

    const client: ClientConnection = {
      response,
      heartbeat: setInterval(() => response.write(": keepalive\n\n"), 25_000),
    };
    this.clients.add(client);

    return () => {
      clearInterval(client.heartbeat);
      this.clients.delete(client);
    };
  }

  publish(event: TradeEventName, payload: object): void {
    const message = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const client of this.clients) {
      try {
        client.response.write(message);
      } catch {
        clearInterval(client.heartbeat);
        this.clients.delete(client);
      }
    }
  }

  get clientCount(): number {
    return this.clients.size;
  }
}

export const eventManager = new EventManager();
