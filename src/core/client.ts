/**
 * 🤝 Client-side: minimal, framework-agnostic WebSocket client for broadcasting steps and presence
 *
 * This is a minimal client that is framework-agnostic. You can wire it to
 * ProseMirror EditorState/Dispatch in your app or via Tiptap.
 * 
 * @example 
    const client = new RealtimeClient({
        url: 'wss://your-server/ws',
        roomId: 'doc-123',
        onSteps: (msg) => applyStepsToProseMirror(msg.steps),
        onPresence: (msg) => updateRemoteCursors(msg.presence),
    });
    await client.connect();
    client.sendSteps({ steps, version });
    client.sendPresence({ presence });
 */

import {
  type ClientToServerMessage,
  type ServerToClientMessage,
  type RealtimeClientOptions,
  type StepsMessage,
  type PresenceMessage,
  type RoomId,
  type ClientId,
} from "./types";
import { type WSLike, addSocketListener } from "../utils/websocket";

export class RealtimeClient {
  private socket?: WSLike;
  private readonly url: string;
  private readonly roomId: RoomId;
  private readonly clientId: ClientId;
  private readonly options: RealtimeClientOptions;
  private reconnectAttempts = 0;
  private reconnectTimer?: any;
  private shouldReconnect = true;
  private docVersion = 0;
  private pendingLocalSteps: { version: number; steps: any[] }[] = [];
  private historyRequested = false;
  private lastKnownServerVersion = 0;
  private rebaseAfterSnapshotPending = false;

  constructor(options: RealtimeClientOptions) {
    this.options = options;
    this.url = options.url;
    this.roomId = options.roomId;
    this.clientId = options.clientId ?? generateId("client");
  }

  // Establish the WebSocket connection and send a join message
  async connect(): Promise<void> {
    const token = this.options.getAuthToken
      ? await this.options.getAuthToken()
      : undefined;
    const urlWithQuery = token
      ? `${this.url}?token=${encodeURIComponent(token)}`
      : this.url;

    const socket = (
      this.options.socketFactory
        ? this.options.socketFactory(urlWithQuery)
        : new (globalThis as any).WebSocket(urlWithQuery)
    ) as WSLike;
    this.socket = socket;

    addSocketListener(socket, "open", () => {
      this.options.onConnectionChange?.(true);
      this.send({
        type: "join",
        roomId: this.roomId,
        clientId: this.clientId,
        presence: this.options.presence,
      });
    });

    addSocketListener(socket, "message", (event: any) => {
      const data: string = typeof event?.data === "string" ? event.data : event;
      this.handleIncoming(data);
    });

    addSocketListener(socket, "close", () => {
      this.options.onConnectionChange?.(false);
      if (this.shouldReconnect) this.scheduleReconnect();
    });

    addSocketListener(socket, "error", (error: any) => {
      console.error("WebSocket error", error);
      if (this.shouldReconnect) this.scheduleReconnect();
    });
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (!this.socket) return;
    try {
      this.send({
        type: "leave",
        roomId: this.roomId,
        clientId: this.clientId,
      });
    } finally {
      this.socket.close?.();
      this.socket = undefined;
    }
  }

  // Broadcast steps to the room - steps should be PM Step JSON via codec.serialize
  sendSteps(msg: Omit<StepsMessage, "type" | "roomId" | "clientId">): void {
    const payload = {
      type: "steps",
      roomId: this.roomId,
      clientId: this.clientId,
      version: this.docVersion,
      ...msg,
    } as const;
    // queue a copy for potential rebase if server requests snapshot
    this.pendingLocalSteps.push({
      version: this.docVersion,
      steps: (msg as any).steps ?? [],
    });
    this.send(payload as any);
  }

  // Broadcast presence updates such as cursor position
  sendPresence(
    msg: Omit<PresenceMessage, "type" | "roomId" | "clientId">
  ): void {
    this.send({
      type: "presence",
      roomId: this.roomId,
      clientId: this.clientId,
      ...msg,
    });
  }

  // Getter for client ID
  getClientId(): ClientId {
    return this.clientId;
  }

  private send(message: ClientToServerMessage): void {
    const data = JSON.stringify(message);
    this.socket?.send(data);
  }

  // Send steps without enqueuing (used during optimistic reapply after snapshot)
  private sendRawSteps(steps: any[]): void {
    const payload = {
      type: "steps",
      roomId: this.roomId,
      clientId: this.clientId,
      version: this.docVersion,
      steps,
    } as any;
    this.send(payload);
  }

  // Dispatch incoming messages to consumer callbacks
  private handleIncoming(raw: string): void {
    let parsed: ServerToClientMessage | undefined;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }

    switch (parsed?.type) {
      case "steps":
        if (typeof parsed.version === "number") {
          this.docVersion = parsed.version;
          this.lastKnownServerVersion = parsed.version;
        }
        this.options.onSteps?.(parsed);
        break;
      case "presence":
        this.options.onPresence?.(parsed);
        break;
      case "presence-snapshot":
        for (const entry of (parsed as any).presences ?? []) {
          this.options.onPresence?.({
            type: "presence",
            roomId: (parsed as any).roomId,
            clientId: entry.clientId,
            presence: entry.presence,
          });
        }
        break;
      case "doc-snapshot":
        this.docVersion = parsed.version;
        this.lastKnownServerVersion = parsed.version;
        this.options.onDocSnapshot?.(parsed);
        // Request history and mark rebase pending if we have queued local steps.
        if (!this.historyRequested) {
          this.historyRequested = true;
          this.send({ type: "history-request", roomId: (parsed as any).roomId, clientId: this.clientId, sinceVersion: this.lastKnownServerVersion } as any);
        }
        this.rebaseAfterSnapshotPending = this.pendingLocalSteps.length > 0;
        break;
      case "history":
        this.historyRequested = false;
        this.options.onHistory?.(parsed as any);
        // Compute a Mapping across server steps and rebase queued local steps.
        if (this.rebaseAfterSnapshotPending) {
          try {
            // schema is required to construct Steps
            const schema: any = (this.options as any).schema;
            if (!schema) throw new Error('No schema provided for rebase');
            const { steps: serverStepsJson = [] } = parsed as any;
            // Build mapping from server steps
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { Step, Mapping } = require('prosemirror-transform');
            const mapping = new Mapping();
            for (const json of serverStepsJson) {
              const st = Step.fromJSON(schema, json);
              const m = st.getMap();
              if (m) mapping.appendMap(m);
            }
            const queued = this.pendingLocalSteps.slice();
            this.pendingLocalSteps = [];
            for (const entry of queued) {
              const transformed: any[] = [];
              for (const sjson of entry.steps) {
                const s = Step.fromJSON(schema, sjson);
                const mapped = s.map(mapping);
                if (mapped) transformed.push(mapped.toJSON());
              }
              if (transformed.length) this.sendRawSteps(transformed);
            }
          } catch {
            // Fallback: if rebase fails, resend queued as-is
            const queued = this.pendingLocalSteps.slice();
            this.pendingLocalSteps = [];
            for (const entry of queued) this.sendRawSteps(entry.steps);
          } finally {
            this.rebaseAfterSnapshotPending = false;
          }
        }
        break;
      case "ping":
        this.options.onPing?.(parsed.ts);
        // auto reply pong
        this.send({
          type: "pong",
          roomId: parsed.roomId,
          clientId: this.clientId,
          ts: parsed.ts,
        } as any);
        break;
      case "error":
        this.options.onError?.(parsed as any);
        break;
      case "ack":
        this.options.onAck?.(parsed as any);
        if ((parsed as any).ackType === "steps") {
          this.pendingLocalSteps.shift();
        }
        break;
      case "join":
        this.options.onJoin?.(parsed as any);
        break;
      case "leave":
        this.options.onLeave?.(parsed as any);
        break;
      default:
        break;
    }
  }

  private scheduleReconnect() {
    const base = 300; // ms
    const max = 8000;
    const attempt = Math.min(this.reconnectAttempts++, 6);
    const delay =
      Math.min(max, base * Math.pow(2, attempt)) +
      Math.floor(Math.random() * 200);
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(() => {});
    }, delay);
  }
}

function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
