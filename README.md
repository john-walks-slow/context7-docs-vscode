# Context7 Docs - VS Code Extension

Query documentation using Context7 API directly in VS Code.

## Features

- **Command Palette Search**: Press `Ctrl+Shift+P` and run "Context7: Search Documentation"
- **Sidebar Panel**: Documentation results displayed in a dedicated panel
- **Code Snippets**: Copy code snippets with one click
- **API Key Management**: Secure storage of your Context7 API key

## Getting Started

### 1. Get Your API Key

Visit [context7.com/dashboard](https://context7.com/dashboard) to get your API key.

### 2. Configure API Key

Run `Context7: Configure API Key` from the command palette and enter your key.

### 3. Search Documentation

- Open the Context7 panel in the sidebar (book icon)
- Enter your query and press Enter
- Results appear with code snippets and documentation

## Commands

| Command | Description |
|---------|-------------|
| `Context7: Search Documentation` | Open search dialog |
| `Context7: Configure API Key` | Set or update API key |

## Configuration

| Setting | Description |
|---------|-------------|
| `context7.apiKey` | Your Context7 API key |

## Development

```bash
# Install dependencies
pnpm install

# Watch mode
pnpm watch

# Build
pnpm build
```

Press `F5` to launch the extension in development mode.

## License

MIT