# Context7 Docs (For Human)

[English](README.md) | [中文](README.zh-CN.md)

[![VS Code](https://img.shields.io/badge/VS%20Code-1.101+-blue.svg)](https://code.visualstudio.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Search library documentations, code snippets, and examples directly in VS Code, using Context7.

![alt text](resources/screenshot.png)

> AI has Context7 for instant docs. Now you do too！

## ✨ Features

- **Zero Setup** - Works without API key via MCP endpoint
- **Smart Library Detection** - Automatically detects libraries from selected code using LSP (Support 10+ languages)
- **Search History** - Automatically records query history
- **Syntax Highlighting** - Render code blocks and markdown; auto-wrap
- **Secure API Key Storage** - Uses VS Code SecretStorage
- **Result Caching** - Cache for faster repeated searches
- **Quick Library Management** - Add, edit, and remove custom libraries

## 🚀 Getting Started

**Via Selection:**

- Select code in the editor
- Right-click and choose "Context7: Search Selection"
- The extension auto-detects the library and searches

**Via Command:**

- Use command `Context7: Search Documentation`
- Select a library or search for one
- Enter your query

## 📋 Commands

| Command                          | Description                        |
| -------------------------------- | ---------------------------------- |
| `Context7: Search Documentation` | Search docs for a selected library |
| `Context7: Manage Libraries`     | Manage your saved libraries        |
| `Context7: Search Selection`     | Search docs for code under cursor  |
| `Context7: Configure API Key`    | Set or update API key              |

## ⚙️ Configuration (`settings.json`)

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

Default:

```json
[
  {
    "languages": [
      "javascript",
      "typescript",
      "javascriptreact",
      "typescriptreact",
      "vue"
    ],
    "pattern": ".*node_modules/@types/([^/]+)"
  },
  {
    "languages": [
      "javascript",
      "typescript",
      "javascriptreact",
      "typescriptreact",
      "vue"
    ],
    "pattern": ".*node_modules/(@[^/]+/[^/]+|[^/]+)"
  },
  { "languages": ["python"], "pattern": ".*site-packages/([^/]+)" },
  { "languages": ["go"], "pattern": ".*pkg/mod/(.+)@" },
  { "languages": ["rust"], "pattern": ".*registry/src/[^/]+/(.+)-\\d+\\.\\d+" },
  { "languages": ["java"], "pattern": ".*\\.m2/repository/(.+/[^/]+)/\\d" },
  {
    "languages": ["java"],
    "pattern": ".*\\.gradle/caches/modules-\\d+/files-\\d+\\.\\d+/([^/]+/[^/]+)"
  },
  {
    "languages": ["csharp"],
    "pattern": ".*[/\\\\](?:\\.nuget/packages|packages)[/\\\\]([^/\\\\]+)"
  },
  { "languages": ["ruby"], "pattern": ".*gems/(.+)-\\d+\\.\\d+" },
  { "languages": ["php"], "pattern": ".*vendor/([^/]+/[^/]+)" },
  {
    "languages": ["dart"],
    "pattern": ".*(?:\\.pub-cache|Pub/Cache)/hosted/[^/]+/(.+)-\\d+\\.\\d+"
  }
]
```

User patterns are matched **before** defaults, allowing you to override behavior for specific project structures.

## 🔑 Access Modes

|            | Anonymous (Default) | API Key                                                             |
| ---------- | ------------------- | ------------------------------------------------------------------- |
| Rate Limit | IP-based            | 1,000/month (Free)                                                  |
| Setup      | Zero config         | Get key at [context7.com/dashboard](https://context7.com/dashboard) |

## 🛠️ Development

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

## 📐 Architecture

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
