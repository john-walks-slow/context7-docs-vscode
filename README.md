# Context7 Docs (For Human)

[English](README.md) | [中文](README.zh-CN.md)

[![VS Code](https://img.shields.io/badge/VS%20Code-1.101+-blue.svg)](https://code.visualstudio.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Search library documentations, code snippets, and examples directly in VS Code, using Context7.

![alt text](resources/screenshot.png)

## Features

- **Zero Setup** - Works without API key via MCP endpoint
- **Smart Library Detection** - Automatically detects libraries from selected code using LSP
- **Search History** - Automatically records query history
- **Syntax Highlighting** - Render code blocks and markdown
- **Secure API Key Storage** - Uses VS Code SecretStorage
- **Result Caching** - Cache for faster repeated searches
- **Quick Library Management** - Add, edit, and remove custom libraries

## Getting Started

**Via Selection:**

- Select code in the editor
- Right-click and choose "Context7: Search Selection"
- The extension auto-detects the library and searches

**Via Sidebar:**

- Open the Context7 panel in the sidebar
- Select a library or search for one
- Enter your query

## Supported Languages

The library detector supports:

| Language                | Package Manager / Path         |
| ----------------------- | ------------------------------ |
| JavaScript / TypeScript | npm, yarn, pnpm, Yarn PnP      |
| Python                  | pip, poetry, conda, virtualenv |
| Go                      | Go Modules                     |
| Rust                    | Cargo                          |
| Java                    | Maven, Gradle                  |
| C#                      | NuGet                          |
| Ruby                    | rbenv, rvm, chruby             |
| PHP                     | Composer                       |
| Dart / Flutter          | pub                            |

## Commands

| Command                          | Description                        |
| -------------------------------- | ---------------------------------- |
| `Context7: Search Documentation` | Search docs for a selected library |
| `Context7: Manage Libraries`     | Manage your saved libraries        |
| `Context7: Search Selection`     | Search docs for code under cursor  |
| `Context7: Configure API Key`    | Set or update API key              |

## Configuration

Customize via VS Code settings (`settings.json`):

### Libraries

```json
{
  "context7.libraries": [
    { "id": "/websites/react_dev", "name": "react" },
    { "id": "/vuejs/vue", "name": "vue" }
  ]
}
```

### Path Patterns

Add custom patterns to extract library names from file paths:

```json
{
  "context7.pathPatterns": [
    {
      "languages": ["javascript", "typescript"],
      "pattern": "my-monorepo/packages/([^/]+)"
    }
  ]
}
```

User patterns are matched **before** defaults, allowing you to override behavior for specific project structures.

### Access Modes

|            | Anonymous (Default) | API Key                                                             |
| ---------- | ------------------- | ------------------------------------------------------------------- |
| Rate Limit | IP-based            | 1,000/month (Free)                                                  |
| Setup      | Zero config         | Get key at [context7.com/dashboard](https://context7.com/dashboard) |

## Development

```bash
# Install dependencies
pnpm install

# Development mode
pnpm watch

# Build
pnpm build

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Lint
pnpm lint
```

Press `F5` to launch the extension in development mode.

### Build Package

```bash
# Create .vsix package
pnpm pack:vsix
```

### Publish

```bash
# Publish to Marketplace
pnpm publish:vsix

# Or publish with specific version
vsce publish <version>
```

### Local Testing

```bash
# Install the .vsix locally to test
code --install-extension context7-docs-0.1.0.vsix
```

## Architecture

```
src/
├── extension.ts           # Entry point
├── api/context7.ts        # Context7 API client
├── services/
│   ├── LibraryService.ts  # Library management
│   ├── SearchService.ts   # Search & highlighting
│   └── SearchCache.ts     # Result caching
├── providers/
│   └── DocSearchViewProvider.ts  # Webview provider
├── utils/
│   └── libraryDetector.ts # LSP-based library detection
└── constants/             # Configuration
```

## License

MIT
