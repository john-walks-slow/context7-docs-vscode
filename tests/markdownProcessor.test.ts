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

  it('should handle APIDOC block with nested code blocks (real-world case)', () => {
    // Real-world case from Context7 API for vitest vi.mock
    const input = `### vi.mock() - Module Mocking

Source: https://github.com/vitest-dev/vitest/blob/main/docs/api/vi.md

Substitutes all imported modules from a provided path with a mock implementation.

\`\`\`APIDOC
## vi.mock()

### Description
Substitutes all imported modules from a provided path with another module.

### Method
Function call (hoisted to top of file)

### Signatures

#### String Path Signature
\`\`\`ts
function mock(
  path: string,
  factory?: MockOptions | MockFactory<unknown>
): void
\`\`\`

#### Module Promise Signature
\`\`\`ts
function mock<T>(
  module: Promise<T>,
  factory?: MockOptions | MockFactory<T>
): void
\`\`\`

### Parameters

#### Path Parameters
- **path** (string) - Required - Module path to mock

### Request Example
\`\`\`ts
import { vi } from 'vitest'

vi.mock('./src/calculator.ts', () => {
  return {
    calculator: vi.fn(() => 42)
  }
})
\`\`\`

### Important Notes

- **Hoisting**: vi.mock is hoisted to the top of the file
- **Import Keyword**: Only works with \`import\` keyword
\`\`\`

--------------------------------

### More content after APIDOC`

    const result = preProcessMarkdown(input)

    // Should NOT contain APIDOC marker
    expect(result).not.toContain('```APIDOC')

    // Should contain the inner content properly
    expect(result).toContain('## vi.mock()')
    expect(result).toContain('### Description')
    expect(result).toContain('### Signatures')

    // Nested code blocks should be preserved
    expect(result).toContain('```ts')
    expect(result).toContain('function mock(')
    expect(result).toContain('import { vi } from')

    // Content after APIDOC should remain
    expect(result).toContain('More content after APIDOC')
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
