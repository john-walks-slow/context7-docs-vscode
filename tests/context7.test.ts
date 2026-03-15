import { describe, it, expect, vi, beforeAll } from 'vitest'
import { createMockSecretStorage } from './__mocks__/vscode'

// Mock vscode module before importing
vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: vi.fn(() => ({
      get: vi.fn(),
    })),
  },
}))

import { Context7Client } from '../src/api/context7'

describe('Context7Client', () => {
  let client: Context7Client

  beforeAll(() => {
    const mockSecrets = createMockSecretStorage()
    client = new Context7Client(mockSecrets)
  })

  describe('parseTrustScore', () => {
    it('should parse High trust score to 9', () => {
      expect(client.parseTrustScore('High')).toBe(9)
    })

    it('should parse Medium trust score to 5', () => {
      expect(client.parseTrustScore('Medium')).toBe(5)
    })

    it('should parse Low trust score to 2', () => {
      expect(client.parseTrustScore('Low')).toBe(2)
    })

    it('should parse Unknown trust score to 0', () => {
      expect(client.parseTrustScore('Unknown')).toBe(0)
    })

    it('should return 0 for unknown label', () => {
      expect(client.parseTrustScore('Invalid')).toBe(0)
      expect(client.parseTrustScore('')).toBe(0)
    })
  })

  describe('parseMcpLibraryResults', () => {
    it('should parse normal format correctly', () => {
      const text = `- Title: React Documentation
- Context7-compatible library ID: /facebook/react
- Description: A JavaScript library for building user interfaces
- Code Snippets: 1250
- Trust Score: High
- Benchmark Score: 98
- Versions: 19.0.0, 18.3.1`

      const results = client.parseMcpLibraryResults(text)

      expect(results).toHaveLength(1)
      expect(results[0]).toEqual({
        id: '/facebook/react',
        title: 'React Documentation',
        description: 'A JavaScript library for building user interfaces',
        totalSnippets: 1250,
        trustScore: 9,
        benchmarkScore: 98,
        versions: ['19.0.0', '18.3.1'],
      })
    })

    it('should parse multiple libraries separated by dashes', () => {
      const text = `- Title: React
- Context7-compatible library ID: /facebook/react
- Description: React library
- Code Snippets: 100
- Trust Score: High
- Benchmark Score: 98
----------
- Title: Vue
- Context7-compatible library ID: /vuejs/vue
- Description: Vue library
- Code Snippets: 200
- Trust Score: Medium
- Benchmark Score: 85`

      const results = client.parseMcpLibraryResults(text)

      expect(results).toHaveLength(2)
      expect(results[0].title).toBe('React')
      expect(results[1].title).toBe('Vue')
    })

    it('should handle empty result', () => {
      expect(client.parseMcpLibraryResults('')).toEqual([])
      expect(client.parseMcpLibraryResults('   ')).toEqual([])
    })

    it('should handle "No libraries found" message', () => {
      const text = 'No libraries found for the given query.'
      expect(client.parseMcpLibraryResults(text)).toEqual([])
    })

    it('should handle malformed input gracefully', () => {
      const text = `Some random text
without proper format
- Not a valid entry`

      const results = client.parseMcpLibraryResults(text)
      // Should return empty or skip invalid entries
      expect(results.every((r) => r.id && r.title)).toBe(true)
    })

    it('should handle missing optional fields', () => {
      const text = `- Title: Minimal Library
- Context7-compatible library ID: /owner/repo`

      const results = client.parseMcpLibraryResults(text)

      expect(results).toHaveLength(1)
      expect(results[0].description).toBe('')
      expect(results[0].totalSnippets).toBe(0)
      expect(results[0].trustScore).toBe(0)
      expect(results[0].benchmarkScore).toBe(0)
      expect(results[0].versions).toEqual([])
    })

    it('should parse Source Reputation field as trust score fallback', () => {
      const text = `- Title: Some Library
- Context7-compatible library ID: /owner/repo
- Source Reputation: High`

      const results = client.parseMcpLibraryResults(text)

      expect(results).toHaveLength(1)
      expect(results[0].trustScore).toBe(9)
    })

    it('should handle non-string input', () => {
      // 测试边界情况：null 和 undefined 输入
      // 使用类型断言绕过 TypeScript 类型检查，因为这是测试边界情况
      expect(client.parseMcpLibraryResults(null as unknown as string)).toEqual(
        [],
      )
      expect(
        client.parseMcpLibraryResults(undefined as unknown as string),
      ).toEqual([])
    })
  })

  describe('parseMcpDocsResult', () => {
    it('should parse code snippets correctly', () => {
      const text = `# useState Hook
This is a description.

\`\`\`typescript
const [state, setState] = useState(initialValue);
\`\`\``

      const result = client.parseMcpDocsResult(text)

      expect(result.codeSnippets).toHaveLength(1)
      expect(result.codeSnippets[0].codeTitle).toBe('useState Hook')
      expect(result.codeSnippets[0].codeDescription).toBe(
        'This is a description.',
      )
      expect(result.codeSnippets[0].codeLanguage).toBe('typescript')
      expect(result.codeSnippets[0].codeList).toHaveLength(1)
      expect(result.codeSnippets[0].codeList[0].code).toBe(
        'const [state, setState] = useState(initialValue);',
      )
    })

    it('should parse multiple code blocks in one section', () => {
      const text = `# Multiple Examples

\`\`\`typescript
const a = 1;
\`\`\`

\`\`\`javascript
const b = 2;
\`\`\``

      const result = client.parseMcpDocsResult(text)

      expect(result.codeSnippets).toHaveLength(1)
      expect(result.codeSnippets[0].codeList).toHaveLength(2)
      expect(result.codeSnippets[0].codeList[0].language).toBe('typescript')
      expect(result.codeSnippets[0].codeList[1].language).toBe('javascript')
    })

    it('should parse pure text as info snippet', () => {
      const text = `# Overview
This is a documentation section without code.
It contains multiple lines of text.`

      const result = client.parseMcpDocsResult(text)

      expect(result.infoSnippets).toHaveLength(1)
      // 标题存在 breadcrumb 中
      expect(result.infoSnippets[0].breadcrumb).toBe('Overview')
      // content 不包含标题
      expect(result.infoSnippets[0].content).not.toContain('# Overview')
      expect(result.infoSnippets[0].content).toContain(
        'documentation section without code',
      )
    })

    it('should handle separator dashes', () => {
      const text = `# First Section
Content 1
---
# Second Section
Content 2`

      const result = client.parseMcpDocsResult(text)

      expect(result.infoSnippets.length + result.codeSnippets.length).toBe(2)
    })

    it('should handle "No documentation found" message', () => {
      const text = 'No documentation found for the given query.'
      const result = client.parseMcpDocsResult(text)

      expect(result.codeSnippets).toEqual([])
      expect(result.infoSnippets).toEqual([])
    })

    it('should handle empty input', () => {
      const result = client.parseMcpDocsResult('')

      expect(result.codeSnippets).toEqual([])
      expect(result.infoSnippets).toEqual([])
    })

    it('should handle code block without language', () => {
      const text = `# Plain Code
\`\`\`
some plain code
\`\`\``

      const result = client.parseMcpDocsResult(text)

      expect(result.codeSnippets).toHaveLength(1)
      expect(result.codeSnippets[0].codeLanguage).toBe('text')
    })

    it('should handle sections without title', () => {
      const text = `Just some content without a heading.

\`\`\`javascript
console.log('hello');
\`\`\``

      const result = client.parseMcpDocsResult(text)

      expect(
        result.codeSnippets.length + result.infoSnippets.length,
      ).toBeGreaterThan(0)
    })

    it('should parse mixed content correctly', () => {
      const text = `# Code Example
Some description here.

\`\`\`typescript
const x = 1;
\`\`\`

---
# Info Section
This section has no code, just information.
---
# Another Code
\`\`\`python
x = 1
\`\`\``

      const result = client.parseMcpDocsResult(text)

      expect(result.codeSnippets.length).toBe(2)
      expect(result.infoSnippets.length).toBe(1)
    })

    it('should parse Source URL from code snippet', () => {
      const text = `### Middleware Authentication Example

Source: https://github.com/vercel/next.js/blob/canary/docs/middleware.mdx

\`\`\`typescript
export function middleware(request: NextRequest) {
  return NextResponse.next()
}
\`\`\``

      const result = client.parseMcpDocsResult(text)

      expect(result.codeSnippets).toHaveLength(1)
      expect(result.codeSnippets[0].codeTitle).toBe(
        'Middleware Authentication Example',
      )
      expect(result.codeSnippets[0].codeId).toBe(
        'https://github.com/vercel/next.js/blob/canary/docs/middleware.mdx',
      )
      // 描述应不含 Source（单独显示为链接）
      expect(result.codeSnippets[0].codeDescription).not.toContain('Source:')
    })

    it('should parse Source URL from info snippet', () => {
      const text = `### Overview
Source: https://github.com/facebook/react/blob/main/docs/hooks.md

This is a documentation section without code.`

      const result = client.parseMcpDocsResult(text)

      expect(result.infoSnippets).toHaveLength(1)
      expect(result.infoSnippets[0].pageId).toBe(
        'https://github.com/facebook/react/blob/main/docs/hooks.md',
      )
      // 标题存在 breadcrumb 中
      expect(result.infoSnippets[0].breadcrumb).toBe('Overview')
      // Info 内容不含标题和 Source
      expect(result.infoSnippets[0].content).not.toContain('### Overview')
      expect(result.infoSnippets[0].content).not.toContain('Source:')
      expect(result.infoSnippets[0].content).toContain(
        'This is a documentation section without code.',
      )
    })

    it('should handle sections without Source URL', () => {
      const text = `# No Source
\`\`\`javascript
const x = 1;
\`\`\``

      const result = client.parseMcpDocsResult(text)

      expect(result.codeSnippets).toHaveLength(1)
      expect(result.codeSnippets[0].codeId).toBeUndefined()
    })

    it('should parse ### level headings', () => {
      const text = `### Triple Hash Title

\`\`\`typescript
const x = 1;
\`\`\``

      const result = client.parseMcpDocsResult(text)

      expect(result.codeSnippets).toHaveLength(1)
      expect(result.codeSnippets[0].codeTitle).toBe('Triple Hash Title')
    })

    it('should handle APIDOC blocks with nested code blocks (real-world case)', () => {
      // Real-world case from Context7 API for vitest vi.mock
      const text = `### vi.mock() - Module Mocking

Source: https://github.com/vitest-dev/vitest/blob/main/docs/api/vi.md

Substitutes all imported modules from a provided path with a mock implementation.

\`\`\`APIDOC
## vi.mock()

### Description
Substitutes all imported modules from a provided path with another module.

### Signatures

#### String Path Signature
\`\`\`ts
function mock(
  path: string,
  factory?: MockOptions
): void
\`\`\`

### Parameters

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
\`\`\`

---
### Another Section

Some content here.`

      const result = client.parseMcpDocsResult(text)

      // APIDOC 内容应该被正确提取，嵌套的代码块应该被正确识别
      expect(result.codeSnippets.length).toBeGreaterThan(0)
      
      // 检查嵌套的 ts 代码块被正确提取
      const codeSnippet = result.codeSnippets[0]
      expect(codeSnippet.codeList.length).toBeGreaterThan(0)
      
      // 检查 description 不包含 APIDOC 标记
      expect(codeSnippet.codeDescription).not.toContain('APIDOC')
      
      // 检查嵌套代码被正确提取
      expect(codeSnippet.codeList.some(b => b.language === 'ts')).toBe(true)
    })
  })
})
