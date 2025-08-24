# 🛠️ Development

> **Development setup and contributing guidelines for @olivelliott/realtime-pm**

## 🚀 Getting Started

### Prerequisites

- **Node.js**: 18+
- **Package Manager**: pnpm (recommended)
- **TypeScript**: 5.9+
- **Git**: For version control

### Initial Setup

```bash
# 1. Clone the repository
git clone https://github.com/olivelliott/realtime-pm.git
cd realtime-pm

# 2. Install dependencies
pnpm install

# 3. Build the package
pnpm build

# 4. Start the WebSocket server
pnpm start
```

## 🏗️ Project Structure

```
realtime-pm/
├── 📦 package/              # Main package configuration
├── 🧪 example/nextjs/       # Demo Next.js application
├── 🔧 scripts/              # Development and build scripts
├── 📁 src/                  # Source code
│   ├── 🎯 core/             # Core functionality
│   │   ├── client.ts        # RealtimeClient implementation
│   │   ├── server.ts        # RealtimeServer implementation
│   │   ├── presence.ts      # Presence management
│   │   └── types.ts         # Core type definitions
│   ├── 🎨 tiptap/           # Tiptap extension
│   │   └── RealtimeExtension.ts
│   └── 🛠️ utils/            # Utility functions
│       ├── schemaHelpers.ts # Schema utilities
│       ├── stepHelpers.ts   # Step codecs
│       ├── throttle.ts      # Throttling utilities
│       └── websocket.ts     # WebSocket helpers
├── 📁 docs/                 # Documentation
├── 📁 dist/                 # Build output
└── 📄 Configuration files
```

## 🔧 Development Commands

```bash
# Development
pnpm dev          # TypeScript compilation in watch mode
pnpm build        # Build for production
pnpm start        # Start WebSocket server (ws://localhost:3001)

# Example app
cd example/nextjs
pnpm dev          # Start Next.js dev server (http://localhost:3000)
```

## 🧪 Testing

### Manual Testing

The easiest way to test collaborative editing:

1. **Start the WebSocket server**:

   ```bash
   pnpm start
   ```

2. **Run the example app**:

   ```bash
   cd example/nextjs
   pnpm dev
   ```

3. **Open multiple browser tabs** to `http://localhost:3000`

4. **Test collaboration**:
   - Type in one tab
   - Verify real-time updates in other tabs
   - Move cursors around to test presence
   - Test with different room IDs

## 📝 Code Style

### TypeScript

- **Strict mode**: Always enabled
- **No `any` types**: Use proper type definitions
- **Interfaces vs Types**: Prefer types for simple structures
- **Generic types**: Use when appropriate for reusability

### Naming Conventions

- **Files**: kebab-case (`realtime-client.ts`)
- **Components**: PascalCase (`RealtimeClient`)
- **Functions**: camelCase (`connectToRoom`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RECONNECT_ATTEMPTS`)
- **Types**: PascalCase (`RealtimeConfig`)

### Code Organization

```ts
// 1. Imports (external first, then internal)
import { Step } from "prosemirror-transform";
import { RealtimeClient } from "./client";

// 2. Type definitions
type MessageHandler = (msg: Message) => void;

// 3. Constants
const DEFAULT_RECONNECT_DELAY = 1000;

// 4. Main class/function
export class MessageProcessor {
  // Public methods first
  public processMessage(msg: Message): void {
    // Implementation
  }

  // Private methods last
  private validateMessage(msg: Message): boolean {
    // Implementation
  }
}

// 5. Exports
export { MessageProcessor };
```

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### 1. Fork and Clone

```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/realtime-pm.git
cd realtime-pm

# Add the upstream remote
git remote add upstream https://github.com/olivelliott/realtime-pm.git
```

### 2. Create a Feature Branch

```bash
# Create and checkout a new branch
git checkout -b feature/amazing-feature

# Or for bug fixes
git checkout -b fix/bug-description
```

### 3. Make Your Changes

- **Follow the code style** guidelines above
- **Add tests** for new functionality
- **Update documentation** if needed
- **Keep commits focused** and atomic

### 4. Test Your Changes

```bash
# Build the package
pnpm build

# Test the example app
cd example/nextjs
pnpm dev

# Run any automated tests
pnpm test
```

### 5. Commit Your Changes

```bash
# Use conventional commit format
git commit -m "feat: add amazing feature"
git commit -m "fix: resolve connection issue"
git commit -m "docs: update API documentation"
```

**Conventional Commit Types**:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### 6. Push and Create PR

```bash
# Push your branch
git push origin feature/amazing-feature

# Create a Pull Request on GitHub
# Include:
# - Clear description of changes
# - Testing instructions
# - Any breaking changes
```

## 🐛 Debugging

### Common Issues

#### WebSocket Connection Failed

```bash
# Check if server is running
pnpm start

# Verify port 3001 is available
lsof -i :3001

# Check firewall settings
```

#### TypeScript Compilation Errors

```bash
# Clean build
rm -rf dist/
pnpm build

# Check TypeScript version
npx tsc --version
```

#### Example App Issues

```bash
# Clear Next.js cache
cd example/nextjs
rm -rf .next/
pnpm dev
```

## 📦 Building and Publishing

### Local Build

```bash
# Build for production
pnpm build

# Check build output
ls -la dist/
```

### Publishing

```bash
# Login to npm
npm login

# Build and publish
pnpm build
npm publish

# Or for beta releases
npm publish --tag beta
```

## 🔄 Development Workflow

### Daily Development

1. **Pull latest changes**:

   ```bash
   git pull upstream main
   ```

2. **Make changes** in feature branch

3. **Test locally**:

   ```bash
   pnpm build
   pnpm start
   # Test in another terminal
   cd example/nextjs && pnpm dev
   ```

4. **Commit and push**:
   ```bash
   git add .
   git commit -m "feat: description"
   git push origin feature/branch
   ```

### Release Process

1. **Update version** in `package.json`
2. **Update changelog** (coming soon)
3. **Create release branch**:
   ```bash
   git checkout -b release/v1.0.0
   ```
4. **Test thoroughly**:
   ```bash
   pnpm build
   pnpm test
   ```
5. **Merge to main** and tag release
6. **Publish to npm**

## 📚 Additional Resources

- **ProseMirror Documentation**: https://prosemirror.net/docs/
- **Tiptap Documentation**: https://tiptap.dev/
- **WebSocket API**: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/

---

**Questions?** [Open an issue](https://github.com/olivelliott/realtime-pm/issues) or [start a discussion](https://github.com/olivelliott/realtime-pm/discussions)!
