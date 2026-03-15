/**
 * 预处理 Markdown，处理 Context7 API 返回的特殊格式
 * 主要解决 APIDOC 代码块内嵌套代码块导致的解析问题
 */
export function preProcessMarkdown(markdown: string): string {
  if (!markdown) return markdown

  // 处理 APIDOC 代码块：将其内容转为普通 markdown
  // 由于 APIDOC 块内可能包含嵌套的代码块，需要正确匹配配对
  let result = markdown
  let startIndex = 0

  while (true) {
    const apidocStart = result.indexOf('```APIDOC', startIndex)
    if (apidocStart === -1) break

    // 找到 APIDOC 块开始后的第一个换行
    const contentStart = result.indexOf('\n', apidocStart)
    if (contentStart === -1) break

    // 从内容开始位置，找到正确配对的结束标记
    let depth = 1
    let searchIndex = contentStart + 1
    let apidocEnd = -1

    while (searchIndex < result.length) {
      const nextBackticks = result.indexOf('```', searchIndex)
      if (nextBackticks === -1) break

      // 检查这是开始还是结束
      const afterBackticks = result.substring(nextBackticks, nextBackticks + 10)
      if (afterBackticks.match(/^```\w/)) {
        // 这是代码块开始（如 ```ts）
        depth++
      } else {
        // 这是代码块结束
        depth--
        if (depth === 0) {
          apidocEnd = nextBackticks
          break
        }
      }
      searchIndex = nextBackticks + 3
    }

    if (apidocEnd === -1) {
      startIndex = contentStart
      continue
    }

    // 提取内容并替换 APIDOC 块
    const content = result.substring(contentStart + 1, apidocEnd)
    result =
      result.substring(0, apidocStart) +
      content +
      result.substring(apidocEnd + 3)
    startIndex = apidocStart
  }

  return result
}
