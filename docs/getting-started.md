# 🚀 Getting Started

> **Quick installation and basic usage guide for @olivelliott/realtime-pm**

## 📦 Installation

```bash
# Using pnpm (recommended)
pnpm add @olivelliott/realtime-pm

# Using npm
npm install @olivelliott/realtime-pm

# Using yarn
yarn add @olivelliott/realtime-pm
```

**Peer Dependencies**: `@tiptap/core` (>=2.0.0) when using the Tiptap extension

## 🎯 Quick Start Examples

### Tiptap Integration (Recommended)

```ts
import StarterKit from "@tiptap/starter-kit";
import { RealtimeExtension } from "@olivelliott/realtime-pm/tiptap";

const editor = new Editor({
  extensions: [
    StarterKit,
    RealtimeExtension.configure({
      url: "ws://localhost:3001", // Your WebSocket URL
      roomId: "doc-1",
      userId: "user-123", // Optional: for presence tracking
    }),
  ],
});
```

### Core API Usage

```ts
import { RealtimeClient } from "@olivelliott/realtime-pm";

const client = new RealtimeClient({
  url: "ws://localhost:3001",
  roomId: "doc-1",
  userId: "user-123",
  onSteps: (msg) => {
    // Apply incoming steps to your ProseMirror editor
    const { steps, version } = msg;
    // ... apply steps and update version
  },
  onPresence: (msg) => {
    // Handle presence updates (cursors, selections)
    const { users } = msg;
    // ... update remote cursors/decorations
  },
  onJoin: (msg) => {
    // Handle user joining the room
    console.log(`${msg.userId} joined the room`);
  },
  onLeave: (msg) => {
    // Handle user leaving the room
    console.log(`${msg.userId} left the room`);
  },
});

await client.connect();
```

## 🔧 Basic Configuration

### Required Options

- **`url`**: WebSocket server URL (e.g., `ws://localhost:3001`)
- **`roomId`**: Unique identifier for the collaborative document

### Optional Options

- **`userId`**: User identifier for presence tracking
- **`presence`**: Initial presence data for the user
- **`onError`**: Error handling callback

## 🧪 Testing Your Setup

1. **Start the WebSocket server**: `pnpm start` (runs on `ws://localhost:3001`)
2. **Open your app** in multiple browser tabs
3. **Start typing** in one tab
4. **Verify** real-time updates appear in other tabs

## 📚 Next Steps

- Read the [API Reference](./api-reference.md) for detailed configuration options
- Check out the [Architecture](./architecture.md) to understand how it works
- Explore [Development](./development.md) for contributing guidelines

---

**Need help?** [Open an issue](https://github.com/olivelliott/realtime-pm/issues) or [start a discussion](https://github.com/olivelliott/realtime-pm/discussions)!
