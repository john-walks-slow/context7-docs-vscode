# Context7 Docs (For Human Being)

用 Context7 查询任何文档。

> (眼馋你的 AI 的 Context7 ？现在你也可以用了)

## 快速开始

- 选中代码，右键 → "Context7: Search Selected Code"
- 在侧边栏浏览文档和代码示例

## 功能

- 智能识别来源库（支持 14+ 语言）
- 管理常用库
- 开箱即用

## 智能识别

选中代码后执行搜索，扩展会自动识别所属库：

1. 通过 LSP 追踪定义位置 → 从依赖路径提取库名
2. 回退：直接使用选中的标识符

支持语言：

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

## 命令

| 命令                             | 快捷键          | 说明                   |
| -------------------------------- | --------------- | ---------------------- |
| `Context7: Search Documentation` | -               | 打开搜索对话框         |
| `Context7: Search Selected Code` | `Ctrl+Shift+F7` | 智能搜索（自动识别库） |
| `Context7: Configure API Key`    | -               | 设置 API Key（可选）   |

## 访问模式

|          | 匿名（默认） | API Key                                                              |
| -------- | ------------ | -------------------------------------------------------------------- |
| 速率限制 | 基于 IP      | 1,000/月（免费）                                                     |
| 配置     | 开箱即用     | 在 [context7.com/dashboard](https://context7.com/dashboard) 获取 Key |

## 开发

```bash
pnpm install && pnpm watch  # 安装并监听
pnpm build                  # 构建
```

按 `F5` 启动扩展调试。

## License

MIT
