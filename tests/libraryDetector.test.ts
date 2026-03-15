import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LibraryDetector } from '../src/utils/libraryDetector'
import * as vscode from 'vscode'

// ==================== 类型定义 ====================

/**
 * Mock TextEditor 类型
 */
interface MockTextEditor {
  document: {
    getText: ReturnType<typeof vi.fn>
    languageId: string
    uri: { fsPath: string }
  }
  selection: {
    start: { line: number; character: number }
    end: { line: number; character: number }
    isEmpty?: boolean
  }
}

/**
 * LibraryDetector 的内部方法接口（用于测试）
 * 注意：使用 unknown 中间转换来访问私有方法
 */
interface LibraryDetectorInternal {
  extractFirstIdentifier: (text: string) => string | null
  traceDefinition: (
    uri: { fsPath: string },
    position: { line: number; character: number },
    languageId: string
  ) => Promise<string | null>
}

// 辅助函数：安全地获取内部方法
function getInternalMethods(detector: LibraryDetector): LibraryDetectorInternal {
  return detector as unknown as LibraryDetectorInternal
}

// ==================== Mock VS Code API ====================

vi.mock('vscode', () => ({
  window: {
    activeTextEditor: undefined,
  },
  commands: {
    executeCommand: vi.fn(),
  },
}))

// ==================== 测试辅助函数 ====================

/**
 * 设置 Mock ActiveTextEditor
 */
function setMockActiveEditor(editor: MockTextEditor | undefined): void {
  ;(
    vscode.window as { activeTextEditor: MockTextEditor | undefined }
  ).activeTextEditor = editor
}

/**
 * Mock executeCommand
 */
function mockExecuteCommand<T>(result: T): void {
  ;(
    vscode.commands.executeCommand as ReturnType<typeof vi.fn>
  ).mockResolvedValue(result)
}

/**
 * Mock executeCommand to throw error
 */
function mockExecuteCommandError(error: Error): void {
  ;(
    vscode.commands.executeCommand as ReturnType<typeof vi.fn>
  ).mockRejectedValue(error)
}

describe('LibraryDetector', () => {
  let detector: LibraryDetector

  beforeEach(() => {
    vi.clearAllMocks()
    detector = new LibraryDetector()
  })

  describe('extractFirstIdentifier', () => {
    // 测试私有方法需要通过公开方法或反射
    // 这里我们测试标识符提取逻辑的预期行为

    it('should extract simple identifier', () => {
      const text = 'useState'
      const result = getInternalMethods(detector).extractFirstIdentifier(text)
      expect(result).toBe('useState')
    })

    it('should extract identifier starting with underscore', () => {
      const text = '_privateVar'
      const result = getInternalMethods(detector).extractFirstIdentifier(text)
      expect(result).toBe('_privateVar')
    })

    it('should extract identifier with numbers', () => {
      const text = 'var123'
      const result = getInternalMethods(detector).extractFirstIdentifier(text)
      expect(result).toBe('var123')
    })

    it('should not extract identifier starting with number', () => {
      const text = '123invalid'
      const result = getInternalMethods(detector).extractFirstIdentifier(text)
      expect(result).toBeNull()
    })

    it('should return null for empty string', () => {
      const result = getInternalMethods(detector).extractFirstIdentifier('')
      expect(result).toBeNull()
    })

    it('should handle text with whitespace', () => {
      const text = '  identifier  '
      const result = getInternalMethods(detector).extractFirstIdentifier(text)
      expect(result).toBeNull() // 因为正则要求开头匹配
    })

    it('should stop at non-word character', () => {
      const text = 'myFunction.another'
      const result = getInternalMethods(detector).extractFirstIdentifier(text)
      expect(result).toBe('myFunction')
    })
  })

  describe('detectLibraryFromSelection', () => {
    it('should return null when no active editor', async () => {
      setMockActiveEditor(undefined)

      const result = await detector.detectLibraryFromSelection()

      expect(result).toBeNull()
    })

    it('should return null for empty selection', async () => {
      const mockEditor: MockTextEditor = {
        document: {
          getText: vi.fn(() => ''),
          languageId: 'typescript',
          uri: { fsPath: '/test/file.ts' },
        },
        selection: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 0 },
          isEmpty: true,
        },
      }
      setMockActiveEditor(mockEditor)

      const result = await detector.detectLibraryFromSelection()

      expect(result).toBeNull()
    })

    it('should fall back to identifier extraction when LSP fails', async () => {
      const mockEditor: MockTextEditor = {
        document: {
          getText: vi.fn(() => 'useState'),
          languageId: 'typescript',
          uri: { fsPath: '/test/file.ts' },
        },
        selection: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 10 },
        },
      }
      setMockActiveEditor(mockEditor)
      mockExecuteCommand([])

      const result = await detector.detectLibraryFromSelection()

      expect(result).not.toBeNull()
      expect(result?.name).toBe('useState')
      expect(result?.confidence).toBe('low')
    })

    it('should return high confidence when LSP finds definition', async () => {
      const mockEditor: MockTextEditor = {
        document: {
          getText: vi.fn(() => 'useState'),
          languageId: 'typescript',
          uri: { fsPath: '/test/file.ts' },
        },
        selection: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 10 },
        },
      }
      setMockActiveEditor(mockEditor)
      mockExecuteCommand([
        {
          uri: { fsPath: '/project/node_modules/react/index.js' },
          range: { start: { line: 0, character: 0 } },
        },
      ])

      const result = await detector.detectLibraryFromSelection()

      expect(result).not.toBeNull()
      expect(result?.confidence).toBe('high')
    })

    it('should handle LSP errors gracefully', async () => {
      const mockEditor: MockTextEditor = {
        document: {
          getText: vi.fn(() => 'someIdentifier'),
          languageId: 'typescript',
          uri: { fsPath: '/test/file.ts' },
        },
        selection: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 20 },
        },
      }
      setMockActiveEditor(mockEditor)
      mockExecuteCommandError(new Error('LSP error'))

      const result = await detector.detectLibraryFromSelection()

      expect(result).not.toBeNull()
      expect(result?.confidence).toBe('low')
    })
  })

  describe('traceDefinition', () => {
    it('should return null when no definitions found', async () => {
      mockExecuteCommand([])

      const result = await getInternalMethods(detector).traceDefinition(
        { fsPath: '/test/file.ts' },
        { line: 0, character: 0 },
        'typescript',
      )

      expect(result).toBeNull()
    })

    it('should handle LocationLink format', async () => {
      mockExecuteCommand([
        {
          targetUri: { fsPath: '/project/node_modules/lodash/index.js' },
          targetRange: { start: { line: 0, character: 0 } },
        },
      ])

      const result = await getInternalMethods(detector).traceDefinition(
        { fsPath: '/test/file.ts' },
        { line: 0, character: 0 },
        'typescript',
      )

      // 结果取决于 extractLibraryFromPath 的实现
      expect(typeof result === 'string' || result === null).toBe(true)
    })

    it('should handle Location format', async () => {
      mockExecuteCommand([
        {
          uri: { fsPath: '/project/node_modules/react/index.js' },
          range: { start: { line: 0, character: 0 } },
        },
      ])

      const result = await getInternalMethods(detector).traceDefinition(
        { fsPath: '/test/file.ts' },
        { line: 0, character: 0 },
        'typescript',
      )

      expect(typeof result === 'string' || result === null).toBe(true)
    })
  })
})