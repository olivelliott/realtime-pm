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
} from "./types";
import { PresenceStore } from "./presence";
import { type WSLike, addSocketListener } from "../utils/websocket";

export interface Room {
  id: RoomId;
  presence: PresenceStore;
  clients: Map<ClientId, WSLike>;
  version: number; // increment per accepted steps batch
}

export class RealtimeServer {
  private readonly rooms = new Map<RoomId, Room>();

  getOrCreateRoom(roomId: RoomId): Room {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = {
        id: roomId,
        presence: new PresenceStore(),
        clients: new Map<ClientId, WSLike>(),
        version: 0,
      };
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
  }

  private handleLeave(roomId: RoomId, clientId: ClientId) {
    const room = this.getOrCreateRoom(roomId);
    room.clients.delete(clientId);
    room.presence.remove(clientId);
    this.broadcast(room, { type: "leave", roomId, clientId });
  }

  private handleSteps(msg: StepsMessage) {
    const room = this.getOrCreateRoom(msg.roomId);
    // For simplicity, accept all steps and bump version.
    room.version += 1;

    // Rebroadcast to everyone including sender so clients are authoritative.
    const out: ServerToClientMessage = {
      ...msg,
      version: room.version,
    };
    this.broadcast(room, out);
  }

  private handlePresence(msg: PresenceMessage) {
    const room = this.getOrCreateRoom(msg.roomId);
    room.presence.upsert(msg.clientId, msg.presence);
    // Broadcast presence to everyone
    this.broadcast(room, msg);
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
}
