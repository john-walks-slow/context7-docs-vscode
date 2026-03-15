# Context7 Docs - VS Code 扩展

[![VS Code](https://img.shields.io/badge/VS%20Code-1.101+-blue.svg)](https://code.visualstudio.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> (眼馋你的 AI 的 Context7 ？现在你也可以用了)

在 VS Code 中直接查询文档、代码示例和 API 说明。

## ✨ 特性

- 🔍 **智能库检测** - 通过 LSP 自动识别代码所属库
- 📚 **库管理** - 添加、编辑、删除自定义库
- 🎨 **语法高亮** - 使用 Shiki 渲染代码
- 🔐 **安全存储** - API Key 使用 VS Code SecretStorage
- ⚡ **结果缓存** - 5 分钟缓存，加速重复搜索
- 🌐 **匿名访问** - 无需 API Key 也可通过 MCP 使用

## 🚀 快速开始

### 安装

从 VS Code 扩展市场安装，或手动安装 `.vsix` 文件。

### 使用

**侧边栏搜索：**

- 打开侧边栏的 Context7 面板（书本图标）
- 选择或搜索库
- 输入查询内容

**选中搜索：**

- 选中代码
- 右键 → "Context7: Search Selection"
- 扩展自动识别库并搜索

## 🌍 支持语言

| 语言                          | 包管理器 / 路径                |
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

## 📋 命令

| 命令                             | 说明                   |
| -------------------------------- | ---------------------- |
| `Context7: Search Documentation` | 搜索指定库的文档       |
| `Context7: Manage Libraries`     | 管理已保存的库         |
| `Context7: Search Selection`     | 智能搜索（自动识别库） |
| `Context7: Configure API Key`    | 设置 API Key（可选）   |

## 🔑 访问模式

|          | 匿名（默认） | API Key                                                              |
| -------- | ------------ | -------------------------------------------------------------------- |
| 速率限制 | 基于 IP      | 1,000/月（免费）                                                     |
| 配置     | 开箱即用     | 在 [context7.com/dashboard](https://context7.com/dashboard) 获取 Key |

## 🛠️ 开发

```bash
pnpm install        # 安装依赖
pnpm watch          # 开发模式
pnpm build          # 构建
pnpm test           # 运行测试
pnpm test:coverage  # 测试覆盖率
pnpm lint           # 代码检查
```

按 `F5` 启动扩展调试。

## 📐 架构

```
src/
├── extension.ts           # 入口
├── api/context7.ts        # Context7 API 客户端
├── services/
│   ├── LibraryService.ts  # 库管理
│   ├── SearchService.ts   # 搜索与高亮
│   └── SearchCache.ts     # 结果缓存
├── providers/
│   └── DocSearchViewProvider.ts  # Webview 提供者
├── utils/
│   └── libraryDetector.ts # LSP 库检测
└── constants/             # 配置
```

## License

MIT
