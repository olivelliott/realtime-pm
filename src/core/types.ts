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
