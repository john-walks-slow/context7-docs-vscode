---
description: 'Use when: 发布新版本、release、打包上架、版本号更新'
---

# Release Workflow

发布新版本时，按以下流程执行：

## 流程

### 1. 确认工作区干净

- 使用 `get_changed_files` 确认没有未提交的改动
- 如有改动，先按 `commit-workflow.instructions.md` 提交

### 2. 确定版本号

与用户确认版本号更新方式：

- **Patch**: `0.1.1523` → `0.1.1524`（bug fix、小改进）
- **Minor**: `0.1.1523` → `0.2.0`（新功能、向后兼容）
- **Major**: `0.1.1523` → `1.0.0`（破坏性变更）

### 3. 整理并更新 CHANGELOG

**先整理：**

- 合并重复或来回修改的条目（如多个相关改动合并为一条）
- 删除琐碎的中间过程记录
- 确保条目简洁、面向用户

**再更新：**

- 将 `[Unreleased]` 改为具体版本号和日期
- 格式：`## [0.1.1524] - 2026-03-21`

### 4. 更新版本号

更新 `package.json` 中的 `version` 字段。

### 5. 更新 README（使用子 Agent）

启动子 agent 更新 README 和 README.zh-CN：

**任务说明：**

- 根据 CHANGELOG 内容更新 **"What's New"** section（如有）
- 检查并更正 Features、Configuration 等章节中可能过时的内容
- 确保中英文 README 同步

**输出要求：**

- 列出所有修改点
- 说明修改原因

### 6. 打包

运行打包脚本：

```bash
pnpm build
```

确认产物生成在 `build/` 目录。

### 7. 最终确认

向用户确认：

- [ ] CHANGELOG 已更新
- [ ] package.json 版本号已更新
- [ ] README 已更新
- [ ] 构建产物已生成
- [ ] 是否需要执行 `vsce publish`？

## Checklist

- [ ] 工作区无未提交改动
- [ ] 版本号已确认
- [ ] CHANGELOG 已更新
- [ ] package.json 已更新
- [ ] README 已更新
- [ ] 构建成功
- [ ] 用户已确认发布
