// 📝 Type definitions (steps, users, rooms, etc)

export type RoomId = string;
export type ClientId = string;

// Generic JSON helpers for messages
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonObject
  | JsonArray;
export interface JsonObject {
  [key: string]: JsonValue;
}
export interface JsonArray extends Array<JsonValue> {}

// Minimal shape of a ProseMirror Step JSON
// When you add prosemirror-transform, this aligns with Step.toJSON() output.
export interface PM_StepJSON extends JsonObject {
  stepType: string;
}

export interface UserInfo {
  id: string;
  name?: string;
  color?: string; // Useful for cursor colors
}

export interface CursorRange {
  from: number;
  to: number;
}

export interface UserPresence {
  user: UserInfo;
  cursor?: CursorRange;
  meta?: JsonObject;
  timestamp?: number; // server or client generated
}

export interface BaseMessage {
  roomId: RoomId;
  clientId: ClientId;
}

export interface StepsMessage extends BaseMessage {
  type: "steps";
  version?: number; // optional doc version for conflict detection
  steps: PM_StepJSON[];
  clientSelection?: CursorRange; // optional selection snapshot
  doc?: JsonObject; // optional full document snapshot for server authoritative state
}

export interface PresenceMessage extends BaseMessage {
  type: "presence";
  presence: UserPresence;
}

export interface PresenceSnapshotMessage extends BaseMessage {
  type: "presence-snapshot";
  presences: Array<{ clientId: ClientId; presence: UserPresence }>;
}

export interface JoinMessage extends BaseMessage {
  type: "join";
  presence?: UserPresence;
}

export interface LeaveMessage extends BaseMessage {
  type: "leave";
}

export interface AckMessage extends BaseMessage {
  type: "ack";
  ackType: "steps" | "presence" | "join" | "leave";
  ok: boolean;
  reason?: string;
  version?: number;
}

export interface ErrorMessage extends BaseMessage {
  type: "error";
  code: string;
  reason: string;
}

// Document snapshot exchange
export interface DocSnapshotMessage extends BaseMessage {
  type: "doc-snapshot";
  version: number;
  doc: JsonObject; // ProseMirror Node JSON
}

export interface DocRequestMessage extends BaseMessage {
  type: "doc-request";
}

// Server history for Mapping-based rebase (flattened step sequence)
export interface HistoryRequestMessage extends BaseMessage {
  type: "history-request";
  sinceVersion: number;
}

export interface HistoryMessage extends BaseMessage {
  type: "history";
  fromVersion: number;
  toVersion: number;
  steps: PM_StepJSON[];
}

// Heartbeat ping/pong
export interface PingMessage extends BaseMessage {
  type: "ping";
  ts: number;
}

export interface PongMessage extends BaseMessage {
  type: "pong";
  ts: number;
}

export type ClientToServerMessage =
  | StepsMessage
  | PresenceMessage
  | JoinMessage
  | LeaveMessage
  | DocRequestMessage
  | HistoryRequestMessage
  | PongMessage;

export type ServerToClientMessage =
  | StepsMessage
  | PresenceMessage
  | PresenceSnapshotMessage
  | DocSnapshotMessage
  | PingMessage
  | HistoryMessage
  | AckMessage
  | ErrorMessage
  | JoinMessage
  | LeaveMessage;

// Codec to serialize/deserialize steps. Implementations live in utils/stepHelpers.ts
export interface StepCodec {
  serialize(steps: unknown[]): PM_StepJSON[];
  deserialize(schema: unknown, steps: PM_StepJSON[]): unknown[];
}

// Client options to configure networking and callbacks
export interface RealtimeClientOptions {
  url: string; // ws(s):// endpoint
  roomId: RoomId;
  clientId?: ClientId; // if omitted, a random one will be generated
  presence?: UserPresence; // optional initial presence
  schema?: unknown; // pass a ProseMirror schema if you want client-side decode
  codec?: StepCodec; // step serializer/decoder
  // Optional factory to construct a WebSocket-like object (useful in Node).
  socketFactory?: (url: string) => unknown;

  // Callbacks
  onSteps?: (msg: StepsMessage) => void;
  onPresence?: (msg: PresenceMessage) => void;
  onConnectionChange?: (isConnected: boolean) => void;
  onDocSnapshot?: (msg: DocSnapshotMessage) => void;
  onError?: (msg: ErrorMessage) => void;
  onPing?: (ts: number) => void;
  onAck?: (msg: AckMessage) => void;
  onJoin?: (msg: JoinMessage) => void;
  onLeave?: (msg: LeaveMessage) => void;
  onHistory?: (msg: HistoryMessage) => void;

  // Optional: provide a token to authenticate, returned as string
  getAuthToken?: () => Promise<string> | string;
}
