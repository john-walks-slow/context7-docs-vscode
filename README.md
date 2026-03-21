# Context7 Docs (For Human)

[English](README.md) | [中文](README.zh-CN.md)

[![Get VS Code Extension](https://img.shields.io/badge/VS%20Code%20Extension-Get-blue.svg)](https://marketplace.visualstudio.com/items?itemName=JohnnRen.context7-docs)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Search library documentations, code snippets, and examples directly in VS Code, using Context7.

> ### What's New in 0.2.0
>
> - **Language Standard Library Detection** - Automatically detects and queries language standard libraries (Python stdlib, Rust std, Go stdlib, Node.js stdlib)
> - **Enhanced Keywords** - Bind multiple keywords to a single library ID for better matching
> - **Internationalization** - Full English and Chinese UI support
> - **Improved Library Picker** - Libraries grouped by Recent/User/Preset sections; user libraries appear first
> - **JSON Schema** - IntelliSense support for `context7.libraries` and `context7.pathPatterns` settings

AI has Context7 for instant docs. Now you do too！

## Features

- **Zero Setup** - Works without API key via MCP endpoint
- **Smart Library Detection** - Auto-detects libraries from code using LSP (see below)
- **Search History** - Automatically records query history
- **Syntax Highlighting** - Render code blocks and markdown; auto-wrap
- **Result Caching** - Cache for faster repeated searches

### Smart Library Detection

When you select code and run "Search Selection", the extension automatically detects the relevant library:

1. **LSP Definition Tracking** - Traces symbol to its definition file via language server
2. **Standard Library Detection** - Recognizes stdlib paths (Python, Rust, Go, Node.js)
3. **Third-party Library Extraction** - Extracts library name from dependency paths
4. **Fallback** - Falls back to language standard library when LSP unavailable, or uses language ID/selected identifier

**Supported Languages:** JavaScript, TypeScript, JSX, TSX, Python, Go, Rust, Java, C#, Ruby, PHP, Dart, Vue

**Verified Libraries:** React, Vue, Angular, Svelte, Next.js, Nuxt, Astro, Node.js stdlib, Python stdlib, Rust std, Go stdlib, Express, NestJS, Django, FastAPI, and more.

## Getting Started

**Via Selection:**

- Select code in the editor
- Right-click and choose "Context7: Search Selection"
- The extension auto-detects the library and searches

**Via Command:**

- Use command `Context7: Search Documentation`
- Select a library or search for one
- Enter your query

## Commands

| Command                          | Description                        |
| -------------------------------- | ---------------------------------- |
| `Context7: Search Documentation` | Search docs for a selected library |
| `Context7: Manage Libraries`     | Manage your saved libraries        |
| `Context7: Search Selection`     | Search docs for code under cursor  |
| `Context7: Configure API Key`    | Set or update API key              |

## Configuration (`settings.json`)

### Libraries

The `keywords` field maps local module name to Context7 library ID.

```json
{
  "context7.libraries": [
    {
      "id": "/websites/react_dev",
      "name": "React",
      "keywords": ["react", "React", "react-dom"]
    },
    { "id": "/vuejs/docs", "name": "Vue", "keywords": ["vue", "Vue", "vuejs"] }
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

User patterns are matched **before** defaults, allowing you to override behavior for specific project structures. Defaults support common paths like `node_modules`, `site-packages`, Go modules, and more.

### JSON Schema Support

Both `context7.libraries` and `context7.pathPatterns` have JSON schema support for IntelliSense in `settings.json`.

## Access Modes

|            | Anonymous (Default) | API Key                                                             |
| ---------- | ------------------- | ------------------------------------------------------------------- |
| Rate Limit | IP-based            | 1,000/month (Free)                                                  |
| Setup      | Zero config         | Get key at [context7.com/dashboard](https://context7.com/dashboard) |

## Development

```bash
pnpm install        # Install dependencies
pnpm watch          # Development mode

# Development tasks
pnpm watch:tsc      # TypeScript watch mode
pnpm watch-tests    # Vitest watch mode
pnpm build          # Build
pnpm test           # Run tests
pnpm test:coverage  # Test coverage
pnpm lint           # Lint
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
├── api/
│   └── context7.ts        # Context7 API client
├── constants/             # Configuration constants
│   ├── languagePaths.ts
│   └── libraries.ts
├── services/
│   ├── LibraryService.ts  # Library management
│   ├── SearchService.ts   # Search & highlighting
│   ├── SearchCache.ts     # Result caching
│   ├── HistoryService.ts  # Search history
│   ├── BookmarkService.ts # Bookmark management
│   └── I18nService.ts     # Internationalization
├── providers/
│   ├── DocSearchViewProvider.ts  # Webview provider
│   ├── pickers/                  # QuickPick pickers
│   │   ├── LibraryPicker.ts
│   │   └── HistoryPicker.ts
│   └── webview/                  # Webview communication
│       ├── HtmlBuilder.ts
│       └── MessageHandler.ts
├── utils/
│   ├── libraryDetector.ts  # LSP-based library detection
│   └── markdownProcessor.ts
└── types/
    └── index.ts            # Type definitions
```

## License

MIT
