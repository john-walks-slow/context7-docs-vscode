# Context7 Docs (For Human)

[English](README.md) | [中文](README.zh-CN.md)

[![Get VS Code Extension](https://img.shields.io/badge/VS%20Code%20Extension-Get-blue.svg)](https://marketplace.visualstudio.com/items?itemName=JohnnRen.context7-docs)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

使用 Context7 在 VS Code 中直接查询文档、代码示例和 API 说明。

> ### 0.2.0 新功能
>
> - **语言标准库检测** - 自动检测并查询语言标准库（Python stdlib、Rust std、Go stdlib、Node.js stdlib）
> - **关键词增强** - 支持为单个库 ID 绑定多个关键词，提高匹配准确性
> - **多语言支持** - 完整的中英文界面支持
> - **库选择器优化** - 按 最近使用/用户库/预设库 分组显示；用户库优先显示
> - **JSON Schema** - `context7.libraries` 和 `context7.pathPatterns` 配置支持智能提示

(眼馋 AI 的 Context7.. 终于人也能用了！)

## 特性

- **开箱即用** - 无需任何配置即可使用（通过 MCP 匿名访问）
- **智能库检测** - 基于 LSP 自动识别代码所属库 (支持 10+ 语言)
- **历史记录** - 自动记录查询历史
- **语法高亮** - 渲染代码块和 markdown，可选自动换行
- **结果缓存** - 缓存加速重复搜索

### 智能库检测

选中代码执行"搜索选中内容"时，扩展会自动检测相关库：

1. **LSP 定义追踪** - 通过语言服务器追踪符号到定义文件
2. **标准库识别** - 识别标准库路径（Python、Rust、Go、Node.js）
3. **第三方库提取** - 从依赖路径提取库名（如 `node_modules/react` → `react`）
4. **回退策略** - 无 LSP 时优先回退到语言标准库，其次使用语言 ID 或选中标识符

**支持语言：** JavaScript、TypeScript、JSX、TSX、Python、Go、Rust、Java、C#、Ruby、PHP、Dart、Vue

**已验证库：** React、Vue、Angular、Svelte、Next.js、Nuxt、Astro、Node.js stdlib、Python stdlib、Rust std、Go stdlib、Express、NestJS、Django、FastAPI 等

## 快速开始

**选中搜索：**

- 选中代码
- 右键 → "Context7: Search Selection"
- 自动识别代码所属库，获取相关文档

**使用命令面板：**

- 使用 `Context7: Search Documentation` 命令
- 选择要查询文档的库
- 输入查询内容

## 命令

| 命令                             | 说明                   |
| -------------------------------- | ---------------------- |
| `Context7: Search Documentation` | 搜索指定库的文档       |
| `Context7: Manage Libraries`     | 管理已保存的库         |
| `Context7: Search Selection`     | 智能搜索（自动识别库） |
| `Context7: Configure API Key`    | 设置 API Key（可选）   |

## 配置

通过 VS Code 设置（`settings.json`）自定义：

### 库列表

`keywords` 字段用于本地库名 → Context7 库 ID 的映射：

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

### 路径模式

添加自定义模式从文件路径提取库名：

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

用户模式会**优先于**默认模式匹配。默认支持 `node_modules`、`site-packages`、Go modules 等常见路径。

### JSON Schema 支持

`context7.libraries` 和 `context7.pathPatterns` 配置均支持 JSON Schema，在 `settings.json` 中可获得智能提示。

## 访问模式

|          | 匿名（默认） | API Key                                                              |
| -------- | ------------ | -------------------------------------------------------------------- |
| 速率限制 | 基于 IP      | 1,000/月（免费）                                                     |
| 配置     | 开箱即用     | 在 [context7.com/dashboard](https://context7.com/dashboard) 获取 Key |

## 开发

```bash
pnpm install        # 安装依赖
pnpm watch          # 开发模式

# 开发任务
pnpm watch:tsc      # TypeScript 监听模式
pnpm watch-tests    # Vitest 监听模式
pnpm build          # 构建
pnpm test           # 运行测试
pnpm test:coverage  # 测试覆盖率
pnpm lint           # 代码检查
```

按 `F5` 启动扩展调试。

## 架构

```
src/
├── extension.ts           # 入口
├── api/
│   └── context7.ts        # Context7 API 客户端
├── constants/             # 配置常量
│   ├── languagePaths.ts
│   └── libraries.ts
├── services/
│   ├── LibraryService.ts  # 库管理
│   ├── SearchService.ts    # 搜索与高亮
│   ├── SearchCache.ts     # 结果缓存
│   ├── HistoryService.ts  # 搜索历史
│   ├── BookmarkService.ts # 书签管理
│   └── I18nService.ts     # 国际化
├── providers/
│   ├── DocSearchViewProvider.ts  # Webview 提供者
│   ├── pickers/                  # QuickPick 选择器
│   │   ├── LibraryPicker.ts
│   │   └── HistoryPicker.ts
│   └── webview/                  # Webview 通信
│       ├── HtmlBuilder.ts
│       └── MessageHandler.ts
├── utils/
│   ├── libraryDetector.ts  # LSP 库检测
│   └── markdownProcessor.ts
└── types/
    └── index.ts            # 类型定义
```

## 打包

```bash
# 创建 .vsix 安装包
pnpm pack:vsix
```

## 发布

```bash
# 发布到 VS Code Marketplace
pnpm publish:vsix

# 或指定版本发布
vsce publish <version>
```

## 本地测试

```bash
# 本地安装 .vsix 进行测试
code --install-extension context7-docs-0.1.0.vsix
```

## License

MIT
