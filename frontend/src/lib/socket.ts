/**
 * WebSocket client manager.
 * Connects to /api/messages/ws/{token} and dispatches typed events.
 */

type Handler<T = unknown> = (payload: T) => void;

class SocketManager {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private handlers: Map<string, Set<Handler>> = new Map();
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = false;

  connect(token: string) {
    if (this.ws?.readyState === WebSocket.OPEN && this.token === token) return;
    this.token = token;
    this.shouldReconnect = true;
    this._connect();
  }

  private _connect() {
    const wsBase = (process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/api");
    const url = `${wsBase}/messages/ws/${this.token}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log("[WS] connected");
      this._startPing();
    };

    this.ws.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as { type: string; payload: unknown };
        const set = this.handlers.get(event.type);
        set?.forEach((h) => h(event.payload));
      } catch {
        // ignore malformed frames
      }
    };

    this.ws.onclose = () => {
      console.log("[WS] disconnected");
      this._stopPing();
      if (this.shouldReconnect) {
        this.reconnectTimeout = setTimeout(() => this._connect(), 3000);
      }
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  disconnect() {
    this.shouldReconnect = false;
    this._stopPing();
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.ws?.close();
    this.ws = null;
  }

  send(data: object) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  on<T = unknown>(event: string, handler: Handler<T>) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler as Handler);
  }

  off<T = unknown>(event: string, handler: Handler<T>) {
    this.handlers.get(event)?.delete(handler as Handler);
  }

  private _startPing() {
    this.pingInterval = setInterval(() => {
      this.send({ type: "ping" });
    }, 25000);
  }

  private _stopPing() {
    if (this.pingInterval) clearInterval(this.pingInterval);
  }
}

// Singleton
export const socketManager = new SocketManager();
