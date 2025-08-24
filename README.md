# 🚀 @olivelliott/realtime-pm

> **Realtime collaborative editing for ProseMirror with WebSockets**  
> Framework-agnostic core with an optional Tiptap extension

[![npm version](https://img.shields.io/npm/v/@olivelliott/realtime-pm)](https://www.npmjs.com/package/@olivelliott/realtime-pm)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)

## ✨ Features

- 🔄 **Real-time collaboration** with ProseMirror
- 🌐 **WebSocket-based** communication
- 👥 **User presence** and cursor tracking
- 🎯 **Tiptap integration** for React apps
- 📱 **Framework-agnostic** core
- 🔄 **Automatic reconnection** with backoff

## 📦 Install

```bash
pnpm add @olivelliott/realtime-pm
```

**Peer**: `@tiptap/core` (>=2.0.0) for Tiptap extension

## 🚀 Quick Start

### Tiptap (Recommended)

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
    }),
  ],
});
```

### Core API

```ts
import { RealtimeClient } from "@olivelliott/realtime-pm";

const client = new RealtimeClient({
  url: "ws://localhost:3001",
  roomId: "doc-1",
  onSteps: (msg) => {
    /* apply steps */
  },
  onPresence: (msg) => {
    /* update cursors */
  },
});

await client.connect();
```

## 🧪 Try It

```bash
# Start WebSocket server
pnpm start

# In another terminal, run the example
cd example/nextjs
pnpm dev
# Open http://localhost:3000 in multiple tabs
```

## 📚 Documentation

**📖 [View Full Documentation →](docs/)**

Our comprehensive documentation includes:

- **[🚀 Getting Started](docs/getting-started.md)** - Installation and examples
- **[🏗️ Architecture](docs/architecture.md)** - System design and components
- **[📚 API Reference](docs/api-reference.md)** - Complete API documentation
- **[🛠️ Development](docs/development.md)** - Contributing and setup guide
- **[🧪 Testing](docs/testing.md)** - Testing collaborative editing
- **[🗺️ Roadmap](docs/roadmap.md)** - Future plans and features

## 🤝 Contributing

We welcome contributions! See our [Development Guide](docs/development.md) for setup and guidelines.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

**Made with ❤️ by [Olivia Elliott](https://github.com/olivelliott)**

Questions? [Open an issue](https://github.com/olivelliott/realtime-pm/issues) or [start a discussion](https://github.com/olivelliott/realtime-pm/issues)!
