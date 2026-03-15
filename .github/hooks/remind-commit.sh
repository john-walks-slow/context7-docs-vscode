#!/bin/bash
# 任务结束时提醒 LLM 进行 git commit 和格式化

# 检查是否有未提交的更改
STAGED=$(git diff --staged --name-only 2>/dev/null | wc -l)
UNSTAGED=$(git diff --name-only 2>/dev/null | wc -l)
UNTRACKED=$(git ls-files --others --exclude-standard 2>/dev/null | wc -l)

TOTAL=$((STAGED + UNSTAGED + UNTRACKED))

if [ "$TOTAL" -eq 0 ]; then
  # 没有更改，静默通过
  exit 0
fi

# 有未提交的更改，提醒 LLM
CHANGED=$(git diff --name-only --staged 2>/dev/null | head -3 | tr '\n' ' ')
CHANGED_UNSTAGED=$(git diff --name-only 2>/dev/null | head -3 | tr '\n' ' ')
CHANGED_UNTRACKED=$(git ls-files --others --exclude-standard 2>/dev/null | head -3 | tr '\n' ' ')

MSG="检测到未提交的更改:\n"
[ -n "$CHANGED" ] && MSG+="- 已暂存: $CHANGED\n"
[ -n "$CHANGED_UNSTAGED" ] && MSG+="- 未暂存: $CHANGED_UNSTAGED\n"
[ -n "$CHANGED_UNTRACKED" ] && MSG+="- 未跟踪: $CHANGED_UNTRACKED\n"
MSG+="\n建议:\n1) git add . && git commit -m 'your message'\n2) pnpm lint --fix (如需格式化)"

jq -n "{
  hookSpecificOutput: {
    hookEventName: \"Stop\",
    additionalContext: \"$MSG\"
  }
}"