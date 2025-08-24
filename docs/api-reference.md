# 📚 API Reference

> **Complete API reference for @olivelliott/realtime-pm**

## 🎯 RealtimeClient

The main client class for real-time collaborative editing.

### Constructor

```ts
new RealtimeClient(config: RealtimeClientConfig): RealtimeClient
```

### Configuration Interface

```ts
interface RealtimeClientConfig {
  // Required options
  url: string; // WebSocket server URL
  roomId: string; // Document room identifier

  // Optional options
  userId?: string; // User identifier for presence tracking
  presence?: UserPresence; // Initial presence data

  // Event handlers
  onSteps?: (msg: StepMessage) => void;
  onPresence?: (msg: PresenceMessage) => void;
  onJoin?: (msg: JoinMessage) => void;
  onLeave?: (msg: LeaveMessage) => void;
  onError?: (error: Error) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;

  // Connection options
  reconnectAttempts?: number; // Max reconnection attempts (default: 5)
  reconnectDelay?: number; // Initial reconnect delay in ms (default: 1000)
  maxReconnectDelay?: number; // Max reconnect delay in ms (default: 30000)
  heartbeatInterval?: number; // Heartbeat interval in ms (default: 30000)
}
```

### Methods

#### connect()

Establishes WebSocket connection and joins the room.

```ts
async connect(): Promise<void>
```

**Returns**: Promise that resolves when connection is established

**Example**:

```ts
try {
  await client.connect();
  console.log("Connected to room:", client.roomId);
} catch (error) {
  console.error("Connection failed:", error);
}
```

#### disconnect()

Closes the WebSocket connection.

```ts
disconnect(): void
```

**Example**:

```ts
client.disconnect();
```

#### sendSteps(steps, version)

Sends ProseMirror steps to the server.

```ts
sendSteps(steps: Step[], version: number): void
```

**Parameters**:

- `steps`: Array of ProseMirror steps to send
- `version`: Current document version

**Example**:

```ts
const steps = [
  /* ProseMirror steps */
];
client.sendSteps(steps, documentVersion);
```

#### updatePresence(presence)

Updates the user's presence information.

```ts
updatePresence(presence: Partial<UserPresence>): void
```

**Parameters**:

- `presence`: Partial presence data to update

**Example**:

```ts
client.updatePresence({
  cursor: { pos: 100 },
  selection: { from: 95, to: 105 },
});
```

#### joinRoom()

Explicitly joins the room (usually called automatically by connect).

```ts
joinRoom(): void
```

#### leaveRoom()

Explicitly leaves the room.

```ts
leaveRoom(): void
```

### Properties

```ts
interface RealtimeClient {
  readonly connected: boolean; // Connection status
  readonly roomId: string; // Current room ID
  readonly userId?: string; // Current user ID
  readonly presence: UserPresence; // Current presence data
}
```

### Events

#### onSteps

Called when steps are received from other users.

```ts
onSteps: (msg: StepMessage) => void
```

**Message Structure**:

```ts
interface StepMessage {
  type: "steps";
  steps: Step[];
  version: number;
  userId: string;
  timestamp: number;
}
```

#### onPresence

Called when presence updates are received.

```ts
onPresence: (msg: PresenceMessage) => void
```

**Message Structure**:

```ts
interface PresenceMessage {
  type: "presence";
  users: Record<string, UserPresence>;
  timestamp: number;
}
```

#### onJoin

Called when a user joins the room.

```ts
onJoin: (msg: JoinMessage) => void
```

**Message Structure**:

```ts
interface JoinMessage {
  type: "join";
  userId: string;
  presence?: UserPresence;
  timestamp: number;
}
```

#### onLeave

Called when a user leaves the room.

```ts
onLeave: (msg: LeaveMessage) => void
```

**Message Structure**:

```ts
interface LeaveMessage {
  type: "leave";
  userId: string;
  timestamp: number;
}
```

## 🎨 RealtimeExtension

Tiptap extension for real-time collaborative editing.

### Configuration

```ts
interface RealtimeExtensionConfig {
  // Required options
  url: string; // WebSocket server URL
  roomId: string; // Document room identifier

  // Optional options
  userId?: string; // User identifier for presence tracking
  presence?: UserPresence; // Initial presence data

  // Event handlers
  onError?: (error: Error) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;

  // Connection options
  reconnectAttempts?: number; // Max reconnection attempts
  reconnectDelay?: number; // Initial reconnect delay
  maxReconnectDelay?: number; // Max reconnect delay
  heartbeatInterval?: number; // Heartbeat interval
}
```

### Usage

```ts
import StarterKit from "@tiptap/starter-kit";
import { RealtimeExtension } from "@olivelliott/realtime-pm/tiptap";

const editor = new Editor({
  extensions: [
    StarterKit,
    RealtimeExtension.configure({
      url: "ws://localhost:3001",
      roomId: "doc-1",
      userId: "user-123",
      onError: (error) => console.error("Realtime error:", error),
    }),
  ],
});
```

## 👥 UserPresence Interface

```ts
interface UserPresence {
  cursor?: {
    pos: number; // Document position
    coords?: {
      // Screen coordinates (optional)
      x: number;
      y: number;
    };
  };
  selection?: {
    from: number; // Selection start position
    to: number; // Selection end position
  };
  metadata?: Record<string, any>; // Custom user data
}
```

## 🔧 Utility Functions

### Step Codecs

```ts
import {
  defaultStepCodec,
  prosemirrorStepCodec,
} from "@olivelliott/realtime-pm";

// Default step codec (JSON-based)
const codec = defaultStepCodec;

// ProseMirror-specific step codec
const pmCodec = prosemirrorStepCodec;

// Encode steps for transmission
const encoded = codec.encode(steps);

// Decode steps from transmission
const decoded = codec.decode(encoded);
```

### Throttling

```ts
import { throttle } from "@olivelliott/realtime-pm";

// Throttle presence updates to avoid spam
const throttledUpdatePresence = throttle(
  (presence) => client.updatePresence(presence),
  100 // Update at most every 100ms
);
```

## 📝 Type Definitions

### Message Types

```ts
type Message =
  | StepMessage
  | PresenceMessage
  | JoinMessage
  | LeaveMessage
  | ErrorMessage;
```

### Step Types

```ts
import type { Step } from "prosemirror-transform";
```

### Error Types

```ts
interface RealtimeError extends Error {
  code: string;
  details?: any;
}
```

## 🚨 Error Handling

### Common Error Codes

- **`CONNECTION_FAILED`**: WebSocket connection failed
- **`ROOM_NOT_FOUND`**: Specified room doesn't exist
- **`AUTHENTICATION_FAILED`**: Authentication failed (if implemented)
- **`INVALID_STEPS`**: Received invalid step data
- **`VERSION_MISMATCH`**: Document version conflict

### Error Handling Example

```ts
const client = new RealtimeClient({
  url: "ws://localhost:3001",
  roomId: "doc-1",
  onError: (error) => {
    if (error.code === "CONNECTION_FAILED") {
      console.log("Connection failed, retrying...");
    } else if (error.code === "VERSION_MISMATCH") {
      console.log("Version mismatch, syncing document...");
      // Implement document sync logic
    }
  },
});
```

---

**Next**: Check out the [Development](./development.md) guide for contributing guidelines.
