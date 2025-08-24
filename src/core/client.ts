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
    });

    addSocketListener(socket, "error", (error: any) => {
      //TODO: consider reconnection/backoff | handle errors properly
      console.error("WebSocket error", error);
    });
  }

  disconnect(): void {
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
    this.send({
      type: "steps",
      roomId: this.roomId,
      clientId: this.clientId,
      ...msg,
    });
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

  private send(message: ClientToServerMessage): void {
    const data = JSON.stringify(message);
    this.socket?.send(data);
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
        this.options.onSteps?.(parsed);
        break;
      case "presence":
        this.options.onPresence?.(parsed);
        break;
      case "ack":
      case "join":
      case "leave":
      case "error":
      default:
        break;
    }
  }
}

function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
