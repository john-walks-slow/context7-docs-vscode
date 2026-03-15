import { describe, it, expect } from 'vitest'
import { preProcessMarkdown } from '../src/utils/markdownProcessor'

describe('preProcessMarkdown', () => {
  it('should return empty string for empty input', () => {
    expect(preProcessMarkdown('')).toBe('')
  })

  it('should return unchanged markdown without APIDOC blocks', () => {
    const markdown = `
## Heading

Some text with \`inline code\` and:

\`\`\`ts
const x = 1
\`\`\`
`
    expect(preProcessMarkdown(markdown)).toBe(markdown)
  })

  it('should handle APIDOC block with nested code blocks', () => {
    // APIDOC 块包含嵌套代码块，需要正确提取内容
    const input = `### Title

\`\`\`APIDOC
## API Section

\`\`\`ts
const x = 1
\`\`\`
\`\`\``

    const result = preProcessMarkdown(input)

    // APIDOC 包装被移除，内部内容保留
    expect(result).not.toContain('```APIDOC')
    expect(result).toContain('## API Section')
    expect(result).toContain('```ts')
    expect(result).toContain('const x = 1')
  })

  it('should handle multiple APIDOC blocks', () => {
    const input = `## First

\`\`\`APIDOC
## API 1

\`\`\`ts
code1
\`\`\`
\`\`\`

## Middle

\`\`\`APIDOC
## API 2

\`\`\`js
code2
\`\`\`
\`\`\`

## End`

    const result = preProcessMarkdown(input)

    expect(result).not.toContain('```APIDOC')
    expect(result).toContain('## API 1')
    expect(result).toContain('## API 2')
    expect(result).toContain('code1')
    expect(result).toContain('code2')
    expect(result).toContain('## Middle')
    expect(result).toContain('## End')
  })

  it('should handle APIDOC without nested blocks', () => {
    const input = `## Simple

\`\`\`APIDOC
## Simple API

Just plain text without code blocks.
\`\`\`

End`

    const result = preProcessMarkdown(input)

    expect(result).not.toContain('```APIDOC')
    expect(result).toContain('## Simple API')
    expect(result).toContain('Just plain text')
  })

  it('should handle deeply nested code blocks in APIDOC', () => {
    const input = `\`\`\`APIDOC
## Title

\`\`\`ts
// outer
const x = \`\`\`  // this is just text
\`\`\`

\`\`\`js
// another block
\`\`\`
\`\`\``

    const result = preProcessMarkdown(input)

    expect(result).not.toContain('```APIDOC')
    expect(result).toContain('## Title')
    expect(result).toContain('// outer')
    expect(result).toContain('// another block')
  })
})
