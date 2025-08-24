# 🏗️ Architecture

> **Deep dive into the architecture and design of @olivelliott/realtime-pm**

## 🎯 Core Components

### RealtimeClient

The main client class that handles WebSocket connections and message processing.

**Key Responsibilities:**

- WebSocket connection management with automatic reconnection
- Message serialization/deserialization
- Step queuing and conflict resolution
- Presence tracking and broadcasting

**Features:**

- Exponential backoff reconnection strategy
- Message buffering during disconnections
- Automatic room joining/leaving

### RealtimeServer

WebSocket server that manages collaborative editing sessions.

**Key Responsibilities:**

- Room management and user sessions
- Step broadcasting and conflict resolution
- Presence state management
- Document version control

**Features:**

- Multi-room support
- User session tracking
- Step ordering and validation

### PresenceStore

Manages real-time user presence information.

**Key Responsibilities:**

- User presence state tracking
- Presence change broadcasting
- Cursor and selection synchronization
- User join/leave notifications

**Features:**

- Real-time presence updates
- Efficient change broadcasting
- Presence data serialization

### Step Codecs

Handle ProseMirror step serialization and deserialization.

**Key Responsibilities:**

- Step object serialization for network transmission
- Step object deserialization from network messages
- Step validation and error handling

**Features:**

- Efficient binary serialization
- Step integrity validation
- Error recovery mechanisms

## 📡 Message Protocol

The system uses a JSON-based message protocol over WebSocket for real-time communication.

### Message Types

#### Step Messages

```ts
interface StepMessage {
  type: "steps";
  steps: Step[]; // Array of ProseMirror steps
  version: number; // Document version number
  userId: string; // User who generated the steps
  timestamp: number; // Unix timestamp
}
```

#### Presence Messages

```ts
interface PresenceMessage {
  type: "presence";
  users: Record<string, UserPresence>; // User ID → presence data
  timestamp: number; // Unix timestamp
}
```

#### Join Messages

```ts
interface JoinMessage {
  type: "join";
  userId: string; // User joining the room
  presence?: UserPresence; // Initial presence data
  timestamp: number; // Unix timestamp
}
```

#### Leave Messages

```ts
interface LeaveMessage {
  type: "leave";
  userId: string; // User leaving the room
  timestamp: number; // Unix timestamp
}
```

#### Error Messages

```ts
interface ErrorMessage {
  type: "error";
  code: string; // Error code
  message: string; // Human-readable error message
  timestamp: number; // Unix timestamp
}
```

### User Presence Data

```ts
interface UserPresence {
  cursor?: {
    // Current cursor position
    pos: number; // Document position
    coords?: {
      // Screen coordinates (optional)
      x: number;
      y: number;
    };
  };
  selection?: {
    // Current text selection
    from: number; // Selection start
    to: number; // Selection end
  };
  metadata?: Record<string, any>; // Custom user data
}
```

## 🔄 Data Flow

### Step Synchronization

1. **User types** → Local ProseMirror applies step
2. **Step serialized** → Sent to server via WebSocket
3. **Server validates** → Applies step to authoritative document
4. **Step broadcast** → Sent to all other users in room
5. **Remote users receive** → Step applied to their local documents

### Presence Synchronization

1. **User moves cursor** → Local presence updated
2. **Presence serialized** → Sent to server via WebSocket
3. **Server broadcasts** → Presence sent to all other users
4. **Remote users receive** → Update remote cursor decorations

### Connection Management

1. **Client connects** → WebSocket connection established
2. **Room joined** → Client sends join message with presence
3. **Server responds** → Sends current room state
4. **Disconnection** → Client attempts reconnection with backoff
5. **Reconnection** → Client rejoins room and syncs state

## 🏛️ System Architecture

```
┌─────────────────┐    WebSocket    ┌─────────────────┐
│   Tiptap App   │ ◄──────────────► │  RealtimeServer │
│                 │                 │                 │
│ ┌─────────────┐ │                 │ ┌─────────────┐ │
│ │RealtimeExt  │ │                 │ │Room Manager │ │
│ └─────────────┘ │                 │ └─────────────┘ │
└─────────────────┘                 │ ┌─────────────┐ │
                                    │ │PresenceStore│ │
┌─────────────────┐                 │ └─────────────┘ │
│  Core App      │ ◄──────────────► │ ┌─────────────┐ │
│                 │                 │ │Doc Manager  │ │
│ ┌─────────────┐ │                 │ └─────────────┘ │
│ │RealtimeClient│ │                 └─────────────────┘
│ └─────────────┘ │
└─────────────────┘
```

## 🔒 Security Considerations

- **No built-in authentication** - Implement at application level
- **Room isolation** - Users can only access rooms they're explicitly joined to
- **Input validation** - All incoming steps are validated before application
- **Rate limiting** - Consider implementing at the WebSocket level

## 📈 Performance Characteristics

- **Latency**: Sub-100ms for local operations, network-dependent for remote
- **Throughput**: Handles thousands of steps per second per room
- **Memory**: Minimal overhead per user (~1KB per presence entry)
- **Scalability**: Horizontal scaling possible with room-based sharding

---

**Next**: Read the [API Reference](./api-reference.md) for detailed configuration options.
