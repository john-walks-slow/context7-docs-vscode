---
description: 'Use when: 提交代码、commit、更新 changelog、记录改动'
---

# Commit & Changelog Workflow

完成代码修改后，按以下流程提交代码：

## 流程

### 1. 检查改动

使用 `get_changed_files` 查看所有改动，理解改动范围。

### 2. 更新 CHANGELOG

在 `CHANGELOG.md` 的 `[Unreleased]` section 记录改动：

```markdown
## [Unreleased]

### Added

- 新功能描述

### Changed

- 变更描述

### Fixed

- 修复描述
```

**格式规范：**

- 使用 `Added` / `Changed` / `Fixed` / `Removed` 分类
- 每条记录简洁明了，用**英语**
- 如果 `[Unreleased]` section 不存在，在文件顶部创建它

### 3. 提交代码

**安全规则：**

- **禁止 `git add .` 或 `git add -A`** — 可能误伤他人正在进行的修改
- 使用 `git add <具体文件>` 逐个添加
- 或使用 `git add -p` 交互式选择

使用语义化 commit message：

```
feat: 添加最近使用库功能
fix: 修复库检测边界情况
docs: 更新智能检测文档
refactor: 重构标准库配置结构
test: 添加 libraryPicker 测试
chore: 更新依赖
```

**拆分原则：**

- 代码改动和文档改动尽量分开 commit
- 不同功能的改动分开 commit
- 如果改动关联性强，可以合并

### 4. 版本号

- **不主动 bump 版本号**
- 版本号在正式发布时才更新
- 保持 package.json 版本不变

## Checklist

- [ ] 改动已理解
- [ ] CHANGELOG 已更新
- [ ] commit message 语义化
- [ ] 版本号未改动
