import { WebSocket, WebSocketServer } from "ws";
import { BRIDGE_PORT, BridgeAction, BridgeRequest, BridgeResponse } from "../common/protocol.js";

export class BridgeClient {
  private wss: WebSocketServer | null = null;
  private activeSocket: WebSocket | null = null;
  private pending = new Map<string, { resolve: (val: any) => void; reject: (err: any) => void; timeout: NodeJS.Timeout }>();
  private authenticatedUser: string | null = null;

  constructor() {
    this.initServer();
  }

  private initServer() {
    try {
      this.wss = new WebSocketServer({ port: BRIDGE_PORT });

      this.wss.on("connection", (ws: WebSocket) => {
        this.activeSocket = ws;

        ws.on("message", (raw: string) => {
          try {
            const msg = JSON.parse(raw.toString());

            if (msg.type === "handshake") {
              this.authenticatedUser = msg.user || null;
              return;
            }

            const handler = this.pending.get(msg.id);
            if (handler) {
              clearTimeout(handler.timeout);
              this.pending.delete(msg.id);
              if (msg.success) {
                handler.resolve(msg.data);
              } else {
                handler.reject(new Error(msg.error || "Unknown error from Vencord bridge"));
              }
            }
          } catch {
            // ignore non-json
          }
        });

        ws.on("close", () => {
          if (this.activeSocket === ws) {
            this.activeSocket = null;
          }
        });

        ws.on("error", () => {
          if (this.activeSocket === ws) {
            this.activeSocket = null;
          }
        });
      });

      this.wss.on("error", (err: any) => {
        if (err.code !== "EADDRINUSE") {
          console.error("[BridgeServer Error]", err);
        }
      });

      const cleanup = () => {
        try {
          this.activeSocket?.close();
          this.wss?.close();
        } catch { }
      };

      process.on("exit", cleanup);
      process.on("SIGINT", () => { cleanup(); process.exit(0); });
      process.on("SIGTERM", () => { cleanup(); process.exit(0); });
    } catch (e) {
      console.error("[BridgeServer Failed to start]", e);
    }
  }

  async send(action: BridgeAction, params?: Record<string, any>): Promise<any> {
    if (!this.activeSocket || this.activeSocket.readyState !== WebSocket.OPEN) {
      throw new Error(
        "Discord Vencord client is not connected to the bridge. Ensure Discord is open and the 'MCPBridge' userplugin is enabled in Vencord Settings -> Plugins."
      );
    }

    const id = Math.random().toString(36).substring(2, 10);
    const payload: BridgeRequest = { id, action, params };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Timeout waiting for response from action: ${action}`));
      }, 15000);

      this.pending.set(id, { resolve, reject, timeout });
      this.activeSocket?.send(JSON.stringify(payload));
    });
  }

  getUser(): string | null {
    return this.authenticatedUser;
  }
}
