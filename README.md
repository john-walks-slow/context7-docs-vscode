# Context7 Docs (For Human)

[English](README.md) | [中文](README.zh-CN.md)

[![VS Code](https://img.shields.io/badge/VS%20Code-1.101+-blue.svg)](https://code.visualstudio.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Envious of your AI's Context7? Now you can have it too.

Query documentation using Context7 API directly in VS Code. Search library docs, code snippets, and examples.

## Features

- **Smart Library Detection** - Automatically detects libraries from selected code using LSP
- **Quick Library Management** - Add, edit, and remove custom libraries
- **Search History** - Automatically records query history
- **Syntax Highlighting** - Render code blocks and markdown
- **Secure API Key Storage** - Uses VS Code SecretStorage
- **Result Caching** - Cache for faster repeated searches
- **MCP Anonymous Access** - Works without API key via MCP endpoint

## Getting Started

### 1. Install the Extension

Install from VS Code Marketplace or install the `.vsix` file manually.

### 2. (Optional) Configure API Key

Run `Context7: Configure API Key` from the command palette. You can get your key from [context7.com/dashboard](https://context7.com/dashboard).

> **Note:** The extension works without an API key using anonymous MCP access. An API key provides access to the full API with better results.

### Access Modes

|            | Anonymous (Default) | API Key                                                             |
| ---------- | ------------------- | ------------------------------------------------------------------- |
| Rate Limit | IP-based            | 1,000/month (Free)                                                  |
| Setup      | Zero config         | Get key at [context7.com/dashboard](https://context7.com/dashboard) |

### 3. Search Documentation

**Via Sidebar:**

- Open the Context7 panel in the sidebar (book icon)
- Select a library or search for one
- Enter your query

**Via Selection:**

- Select code in the editor
- Right-click and choose "Context7: Search Selection"
- The extension auto-detects the library and searches

## Commands

| Command                          | Description                        |
| -------------------------------- | ---------------------------------- |
| `Context7: Search Documentation` | Search docs for a selected library |
| `Context7: Manage Libraries`     | Manage your saved libraries        |
| `Context7: Search Selection`     | Search docs for code under cursor  |
| `Context7: Configure API Key`    | Set or update API key              |

## Supported Languages

The library detector supports:

| Language                      | Package Manager / Path         |
| ----------------------------- | ------------------------------ |
| JavaScript / TypeScript / Vue | npm, yarn, pnpm, Yarn PnP      |
| Python                        | pip, poetry, conda, virtualenv |
| Go                            | Go Modules                     |
| Rust                          | Cargo                          |
| Java                          | Maven, Gradle                  |
| C#                            | NuGet                          |
| Ruby                          | rbenv, rvm, chruby             |
| PHP                           | Composer                       |
| Dart / Flutter                | pub                            |

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

## Publishing

### Prerequisites

1. Install vsce tool:

   ```bash
   pnpm add -g @vscode/vsce
   ```

2. Create a publisher at [Visual Studio Marketplace](https://marketplace.visualstudio.com/manage) if you don't have one.

3. Login to your publisher:
   ```bash
   vsce login <your-publisher-id>
   ```

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
