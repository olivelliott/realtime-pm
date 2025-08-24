/**
 * 🛜 WebSocket server: handle rooms, steps, presence
 * This is a WebSocket server that provides a unified interface for different
 * WebSocket implementations. It abstracts away the differences between browser
 * WebSocket and Node.js ws libraries, but is fundamentally a WebSocket server
 * with WebSocket-specific logic.
 *
 * @example in Node with ws:
 * const wss = new WebSocketServer({ server: httpServer });
 * const realtime = new RealtimeServer();
 * wss.on('connection', (socket) => realtime.onConnection(socket));
 */

import {
  type ClientId,
  type RoomId,
  type ClientToServerMessage,
  type ServerToClientMessage,
  type StepsMessage,
  type PresenceMessage,
  type PresenceSnapshotMessage,
} from "./types";
import { PresenceStore } from "./presence";
import { type WSLike, addSocketListener } from "../utils/websocket";
import { Schema, Node as PMNode } from "prosemirror-model";
import { Step } from "prosemirror-transform";

export interface Room {
  id: RoomId;
  presence: PresenceStore;
  clients: Map<ClientId, WSLike>;
  version: number; // increment per accepted steps batch
  docJSON?: any; // authoritative document JSON
  doc?: PMNode; // authoritative server doc
}

export class RealtimeServer {
  private readonly rooms = new Map<RoomId, Room>();
  private heartbeatTimer?: any;
  private readonly heartbeatIntervalMs = 5000;
  private readonly presenceTtlMs = 15000;
  private readonly schema: Schema;

  constructor(opts?: { schema?: Schema; initialDocJSON?: any }) {
    this.schema =
      opts?.schema ??
      new Schema({
        nodes: {
          doc: { content: "block+" },
          paragraph: {
            group: "block",
            content: "inline*",
            parseDOM: [{ tag: "p" }],
            toDOM() {
              return ["p", 0];
            },
          },
          text: { group: "inline" },
        },
        marks: {},
      });
  }

  getOrCreateRoom(roomId: RoomId): Room {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = {
        id: roomId,
        presence: new PresenceStore(),
        clients: new Map<ClientId, WSLike>(),
        version: 0,
      };
      // Initialize server doc
      const initial = this.schema.topNodeType.createAndFill();
      if (initial) {
        room.doc = initial;
        room.docJSON = initial.toJSON();
      }
      this.rooms.set(roomId, room);
    }
    return room;
  }

  onConnection(socket: WSLike) {
    addSocketListener(socket, "message", (event: any) => {
      const data: string = typeof event?.data === "string" ? event.data : event;
      let msg: ClientToServerMessage | undefined;
      try {
        msg = JSON.parse(data);
      } catch {
        return;
      }
      if (!msg) return;
      this.handleMessage(socket, msg);
    });

    addSocketListener(socket, "close", () => {
      // ? We don't know the room/client without tracking join - handled in handleLeave
    });

    // Start heartbeat if not started
    if (!this.heartbeatTimer) {
      this.heartbeatTimer = setInterval(
        () => this.heartbeat(),
        this.heartbeatIntervalMs
      );
    }
  }

  private handleMessage(socket: WSLike, msg: ClientToServerMessage) {
    switch (msg.type) {
      case "join":
        this.handleJoin(socket, msg.roomId, msg.clientId);
        if (msg.presence) {
          this.handlePresence({
            type: "presence",
            roomId: msg.roomId,
            clientId: msg.clientId,
            presence: msg.presence,
          });
        }
        break;
      case "leave":
        this.handleLeave(msg.roomId, msg.clientId);
        break;
      case "steps":
        this.handleSteps(msg);
        break;
      case "presence":
        this.handlePresence(msg);
        break;
      case "doc-request":
        this.handleDocRequest(msg.roomId, msg.clientId);
        break;
      case "pong":
        // Update presence timestamp on pong
        this.getOrCreateRoom(msg.roomId).presence.upsert(msg.clientId, {
          user: { id: msg.clientId },
          timestamp: Date.now(),
        } as any);
        break;
    }
  }

  private handleJoin(socket: WSLike, roomId: RoomId, clientId: ClientId) {
    const room = this.getOrCreateRoom(roomId);
    room.clients.set(clientId, socket);

    // Broadcast join to others
    this.broadcast(
      room,
      {
        type: "join",
        roomId,
        clientId,
      },
      clientId
    );

    // If we have an authoritative doc, push snapshot to joining client
    if (room.docJSON) {
      const snapshot = {
        type: "doc-snapshot",
        roomId,
        clientId,
        version: room.version,
        doc: room.docJSON,
      } as const;
      try {
        socket.send(JSON.stringify(snapshot));
      } catch {}
    }

    // Send initial presence snapshot to the joining client
    const snapshot: PresenceSnapshotMessage = {
      type: "presence-snapshot",
      roomId,
      clientId,
      presences: room.presence.entries(),
    };
    try {
      socket.send(JSON.stringify(snapshot));
    } catch {}
  }

  private handleLeave(roomId: RoomId, clientId: ClientId) {
    const room = this.getOrCreateRoom(roomId);
    room.clients.delete(clientId);
    room.presence.remove(clientId);
    this.broadcast(room, { type: "leave", roomId, clientId });
  }

  private handleSteps(msg: StepsMessage) {
    const room = this.getOrCreateRoom(msg.roomId);
    // Version gate (very simple): require client to send current version
    if (typeof msg.version === "number" && msg.version !== room.version) {
      const err = {
        type: "error",
        roomId: msg.roomId,
        clientId: msg.clientId,
        code: "version_mismatch",
        reason: `expected ${room.version}, got ${msg.version}`,
      } as const;
      this.sendTo(room, msg.clientId, err);
      // Proactively send doc snapshot so client can resync
      if (room.docJSON) {
        const snap = {
          type: "doc-snapshot",
          roomId: msg.roomId,
          clientId: msg.clientId,
          version: room.version,
          doc: room.docJSON,
        } as const;
        this.sendTo(room, msg.clientId, snap);
      }
      return;
    }

    // Apply steps to authoritative server doc
    try {
      if (!room.doc) {
        const initDoc = this.schema.topNodeType.createAndFill();
        if (initDoc) room.doc = initDoc;
      }
      const jsonSteps = msg.steps ?? [];
      let doc = room.doc!;
      for (const json of jsonSteps) {
        const step = Step.fromJSON(this.schema as any, json as any);
        const result = step.apply(doc);
        if (!result.doc) throw new Error("Step application failed");
        doc = result.doc as PMNode;
      }
      room.doc = doc;
      room.docJSON = doc.toJSON();
      room.version += 1;
    } catch (e) {
      const err = {
        type: "error",
        roomId: msg.roomId,
        clientId: msg.clientId,
        code: "apply_failed",
        reason: (e as Error)?.message ?? "failed to apply steps",
      } as const;
      this.sendTo(room, msg.clientId, err);
      return;
    }

    // Rebroadcast to everyone including sender so clients are authoritative.
    const out: ServerToClientMessage = {
      ...msg,
      version: room.version,
    };
    // Avoid echoing back to the sender to prevent duplicate application
    this.broadcast(room, out, msg.clientId);
    // Ack sender with new version
    const ack = {
      type: "ack",
      roomId: msg.roomId,
      clientId: msg.clientId,
      ackType: "steps",
      ok: true,
      version: room.version,
    } as const;
    this.sendTo(room, msg.clientId, ack);
  }

  private handleDocRequest(roomId: RoomId, clientId: ClientId) {
    const room = this.getOrCreateRoom(roomId);
    if (!room.docJSON) return;
    const snap = {
      type: "doc-snapshot",
      roomId,
      clientId,
      version: room.version,
      doc: room.docJSON,
    } as const;
    this.sendTo(room, clientId, snap);
  }

  private handlePresence(msg: PresenceMessage) {
    const room = this.getOrCreateRoom(msg.roomId);
    room.presence.upsert(msg.clientId, msg.presence);
    // Broadcast presence to everyone
    this.broadcast(room, msg);
  }

  private heartbeat() {
    for (const room of this.rooms.values()) {
      // Send ping to all clients
      const ts = Date.now();
      const ping = {
        type: "ping",
        roomId: room.id,
        clientId: "server",
        ts,
      } as const;
      this.broadcast(room, ping);

      // Prune stale presences
      const removed = room.presence.pruneOlderThan(this.presenceTtlMs);
      if (removed.length) {
        for (const cid of removed) {
          this.broadcast(room, {
            type: "leave",
            roomId: room.id,
            clientId: cid,
          });
        }
      }
    }
  }

  private broadcast(
    room: Room,
    message: ServerToClientMessage,
    excludeClientId?: ClientId
  ) {
    const payload = JSON.stringify(message);
    for (const [cid, ws] of room.clients.entries()) {
      if (excludeClientId && cid === excludeClientId) continue;
      try {
        ws.send(payload);
      } catch {
        /* ignore */
      }
    }
  }

  private sendTo(
    room: Room,
    clientId: ClientId,
    message: ServerToClientMessage
  ) {
    const ws = room.clients.get(clientId);
    if (!ws) return;
    try {
      ws.send(JSON.stringify(message));
    } catch {}
  }
}
