# Changelog

## [Unreleased]

### Added

- 最近使用库功能：自动记录和显示最近使用的库
- 库选择器现在区分预设库和用户库，预设库不可删除
- 国际化支持（中文/英文）
- 语言标准库路径检测：自动从依赖路径推断库名

### Changed

- manage 模式只显示用户库（非预设库）
- 库列表排序：用户库排在预设库前面
- Sidebar 标题动态显示当前库名
- 发布脚本将 vsix 包输出到 `build` 目录
- 删除库时不再需要确认，直接删除
- 重命名 `COMMON_LIBRARIES` 为 `PRESET_LIBRARIES`
- 标准库配置改用 `languages` 字段替代 `keywords`

### Fixed

- 仅在用户明确选择时绑定关键词，避免自由搜索时自动关联

## [0.1.0] - Initial Release
