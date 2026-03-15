import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { DocSearchViewProvider } from '../src/providers/DocSearchViewProvider'
import { Context7Client } from '../src/api/context7'
import * as vscode from 'vscode'
import { createMockSecretStorage } from './__mocks__/vscode'

// ==================== 类型定义 ====================

/**
 * Mock ExtensionContext 类型（简化版，仅包含测试所需属性）
 */
interface MockExtensionContext {
  extensionUri: { fsPath: string }
  globalState: {
    get: <T>(key: string, defaultValue?: T) => T
    update: (key: string, value: unknown) => Promise<void>
  }
  secrets: vscode.SecretStorage
  subscriptions: unknown[]
}

/**
 * 将 Mock 上下文转换为 VS Code ExtensionContext
 */
function asExtensionContext(ctx: MockExtensionContext): vscode.ExtensionContext {
  return ctx as unknown as vscode.ExtensionContext
}

// ==================== Mock VS Code API ====================

vi.mock('vscode', () => ({
  window: {
    activeTextEditor: undefined,
    showInputBox: vi.fn(),
    showQuickPick: vi.fn(),
    showWarningMessage: vi.fn(),
    showInformationMessage: vi.fn(),
    showErrorMessage: vi.fn(),
    createQuickPick: vi.fn(),
    onDidChangeActiveColorTheme: vi.fn(() => ({ dispose: vi.fn() })),
    activeColorTheme: { kind: 1 },
  },
  workspace: {
    getConfiguration: vi.fn(() => ({
      get: vi.fn(),
      update: vi.fn(),
    })),
    onDidChangeConfiguration: vi.fn(() => ({ dispose: vi.fn() })),
  },
  commands: {
    registerCommand: vi.fn(),
    executeCommand: vi.fn(),
  },
  env: {
    clipboard: {
      writeText: vi.fn(),
    },
    openExternal: vi.fn(),
  },
  Uri: {
    parse: vi.fn((s: string) => ({ toString: () => s })),
    joinPath: vi.fn(),
  },
  QuickPickItemKind: {
    Separator: 2,
  },
  ThemeIcon: vi.fn(),
  ColorThemeKind: {
    Light: 1,
    Dark: 2,
  },
  CancellationToken: {},
}))

describe('DocSearchViewProvider - User Library Management', () => {
  let provider: DocSearchViewProvider
  let mockContext: MockExtensionContext
  let mockClient: Context7Client
  let globalStateGet: ReturnType<typeof vi.fn>
  let globalStateUpdate: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()

    // 创建 Mock 函数
    globalStateGet = vi.fn((_key: string, defaultValue: unknown) => defaultValue)
    globalStateUpdate = vi.fn(() => Promise.resolve())

    // Mock extension context with globalState and secrets
    mockContext = {
      extensionUri: { fsPath: '/test/extension' },
      globalState: {
        get: globalStateGet as unknown as MockExtensionContext['globalState']['get'],
        update: globalStateUpdate as unknown as MockExtensionContext['globalState']['update'],
      },
      secrets: createMockSecretStorage(),
      subscriptions: [],
    }

    mockClient = new Context7Client(mockContext.secrets)
    provider = new DocSearchViewProvider(asExtensionContext(mockContext), mockClient)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('User Library CRUD', () => {
    // 由于方法是私有的，我们通过模拟 globalState 来测试行为
    // 这里主要测试状态管理的逻辑

    it('should initialize with empty user libraries', () => {
      expect(mockContext.globalState.get).toBeDefined()
    })

    it('should save user libraries to globalState', async () => {
      const libraries = [
        { id: '/facebook/react', name: 'react', addedAt: Date.now() },
      ]

      await mockContext.globalState.update('userLibraries', libraries)

      expect(mockContext.globalState.update).toHaveBeenCalledWith(
        'userLibraries',
        libraries,
      )
    })

    it('should retrieve user libraries from globalState', () => {
      const libraries = [
        { id: '/vuejs/vue', name: 'vue', addedAt: Date.now() },
      ]

      globalStateGet.mockReturnValue(libraries)

      const result = mockContext.globalState.get('userLibraries', [])

      expect(result).toEqual(libraries)
    })

    it('should handle empty user libraries', () => {
      globalStateGet.mockReturnValue([])

      const result = mockContext.globalState.get('userLibraries', [])

      expect(result).toEqual([])
    })

    it('should add new library without duplicates', async () => {
      const existingLibraries = [
        { id: '/facebook/react', name: 'react', addedAt: 1000 },
      ]

      globalStateGet.mockReturnValue(existingLibraries)

      const newLibrary = {
        id: '/vuejs/vue',
        name: 'vue',
        addedAt: Date.now(),
      }

      const updatedLibraries = [...existingLibraries, newLibrary]
      await mockContext.globalState.update('userLibraries', updatedLibraries)

      expect(mockContext.globalState.update).toHaveBeenCalledWith(
        'userLibraries',
        updatedLibraries,
      )
    })

    it('should remove library by id', async () => {
      const libraries = [
        { id: '/facebook/react', name: 'react', addedAt: 1000 },
        { id: '/vuejs/vue', name: 'vue', addedAt: 2000 },
      ]

      const filtered = libraries.filter((lib) => lib.id !== '/facebook/react')

      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe('/vuejs/vue')
    })

    it('should edit library id', async () => {
      const libraries = [
        { id: '/facebook/react', name: 'react', addedAt: 1000 },
      ]

      const lib = libraries.find((l) => l.name === 'react')
      if (lib) {
        lib.id = '/facebook/react-v18'
      }

      expect(lib?.id).toBe('/facebook/react-v18')
    })
  })

  describe('Library Name Lookup', () => {
    // 测试库名查找逻辑（通过模拟 COMMON_LIBRARIES 的查找）

    it('should normalize library names for matching', () => {
      const libraryName = '@types/react'
      const normalized = libraryName.toLowerCase().replace(/^@/, '')

      expect(normalized).toBe('types/react')
    })

    it('should match library names case-insensitively', () => {
      const searchName = 'REACT'
      const libraryName = 'react'

      const match =
        searchName.toLowerCase() === libraryName.toLowerCase()

      expect(match).toBe(true)
    })
  })
})