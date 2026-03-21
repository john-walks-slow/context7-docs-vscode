# Context7 Docs VSCode Extension

VS Code extension for querying documentation using Context7 API.

## Build and Test

```bash
pnpm install      # 安装依赖
pnpm watch        # 开发模式（热重载）
pnpm build        # 生产构建
pnpm test         # 运行测试（vitest）
```

开发时按 F5 启动 Extension Development Host。

## Architecture

```
src/
├── extension.ts          # 入口：命令注册、服务初始化
├── api/context7.ts       # Context7 API 客户端（MCP 端点通信）
├── services/             # 业务逻辑层
│   ├── LibraryService    # 库管理（VS Code 配置存储）
│   ├── SearchService     # 搜索 + Shiki 语法高亮 + 缓存
│   ├── HistoryService    # 搜索历史
│   └── BookmarkService   # 书签管理
├── providers/
│   ├── DocSearchViewProvider  # Sidebar Webview 主控制器
│   ├── webview/               # Webview 通信（HtmlBuilder + MessageHandler）
│   └── pickers/               # QuickPick 选择器
├── utils/
│   ├── libraryDetector   # LSP 语言检测 → 库名推断
│   └── markdownProcessor # Markdown 渲染
└── types/                # 类型定义 + 类型守卫
```

**依赖注入模式**：`DocSearchViewProvider` 组合所有服务，构造函数注入依赖。

## Code Style

- TypeScript 严格模式，避免 `any`
- 代码注释使用中文
- 变量/函数命名使用英文
- 使用类型守卫进行运行时类型验证（见 `api/context7.ts`）
- VS Code API 模式：`context.subscriptions.push()` 注册可释放资源

## Key Patterns

| 场景         | 模式                                                         |
| ------------ | ------------------------------------------------------------ |
| 配置存储     | `vscode.workspace.getConfiguration('context7')`              |
| 安全存储     | `context.secrets.store/get()` (API Key)                      |
| 用户输入     | `vscode.window.showInputBox/showQuickPick`                   |
| 加载提示     | `vscode.window.withProgress`                                 |
| Webview 通信 | `webview.postMessage` + `window.addEventListener('message')` |
| 主题适配     | `vscode.window.onDidChangeActiveColorTheme`                  |

## Testing

- 框架：Vitest + `tests/__mocks__/vscode.ts` 模拟 VS Code API
- 每个服务/工具有对应的 `*.test.ts` 文件
- Mock 模式：工厂函数创建 mock 对象（见 `createMockQuickPick`）

## Pitfalls

- **不要在 Webview 中直接执行 Node.js API**：Webview 运行在隔离环境，通过 postMessage 与扩展通信
- **API Key 不要明文存储**：使用 `context.secrets` API
- **缓存键格式**：`{libraryId}:{query}` 小写 + trim
- **库 ID 格式**：Context7 库 ID 格式为 `/org/repo` 或 `/websites/xxx`
