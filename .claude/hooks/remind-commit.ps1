# 任务结束时提醒 LLM 进行 git commit 和格式化

$ErrorActionPreference = "SilentlyContinue"

# 检查是否有未提交的更改
$staged = (git diff --staged --name-only 2>$null | Measure-Object).Count
$unstaged = (git diff --name-only 2>$null | Measure-Object).Count
$untracked = (git ls-files --others --exclude-standard 2>$null | Measure-Object).Count

$total = $staged + $unstaged + $untracked

if ($total -eq 0) {
  # 没有更改，静默通过
  exit 0
}

# 有未提交的更改，提醒 LLM
$msg = "检测到未提交的更改:`n"
$changedStaged = git diff --name-only --staged 2>$null | Select-Object -First 3
$changedUnstaged = git diff --name-only 2>$null | Select-Object -First 3
$changedUntracked = git ls-files --others --exclude-standard 2>$null | Select-Object -First 3

if ($changedStaged) { $msg += "- 已暂存: $($changedStaged -join ' ')`n" }
if ($changedUnstaged) { $msg += "- 未暂存: $($changedUnstaged -join ' ')`n" }
if ($changedUntracked) { $msg += "- 未跟踪: $($changedUntracked -join ' ')`n" }

$msg += "`n建议:`n1) git add . && git commit -m 'your message'`n2) pnpm lint --fix (如需格式化)"

$output = @{
  hookSpecificOutput = @{
    hookEventName = "Stop"
    additionalContext = $msg
  }
}

$output | ConvertTo-Json -Compress