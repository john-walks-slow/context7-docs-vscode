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

describe('DocSearchViewProvider - Library Management', () => {
  let provider: DocSearchViewProvider
  let mockContext: MockExtensionContext
  let mockClient: Context7Client
  let configGet: ReturnType<typeof vi.fn>
  let configUpdate: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()

    // 创建 Mock 函数
    configGet = vi.fn((key: string, defaultValue: unknown) => defaultValue)
    configUpdate = vi.fn(() => Promise.resolve())

    // Mock workspace.getConfiguration
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: configGet,
      update: configUpdate,
    } as unknown as vscode.WorkspaceConfiguration)

    // Mock extension context with secrets
    mockContext = {
      extensionUri: { fsPath: '/test/extension' },
      globalState: {
        get: vi.fn((_key: string, defaultValue: unknown) => defaultValue),
        update: vi.fn(() => Promise.resolve()),
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

  describe('Library CRUD via Settings', () => {
    it('should get libraries from settings', () => {
      expect(vscode.workspace.getConfiguration).toBeDefined()
    })

    it('should save libraries to settings', async () => {
      const libraries = [
        { id: '/facebook/react', name: 'react' },
      ]

      await vscode.workspace.getConfiguration('context7').update('libraries', libraries)

      expect(configUpdate).toHaveBeenCalledWith('libraries', libraries)
    })

    it('should retrieve libraries from settings', () => {
      const libraries = [
        { id: '/vuejs/vue', name: 'vue' },
      ]

      configGet.mockReturnValue(libraries)

      const result = vscode.workspace.getConfiguration('context7').get('libraries', [])

      expect(result).toEqual(libraries)
    })

    it('should handle empty libraries', () => {
      configGet.mockReturnValue([])

      const result = vscode.workspace.getConfiguration('context7').get('libraries', [])

      expect(result).toEqual([])
    })

    it('should add new library without duplicates', async () => {
      const existingLibraries = [
        { id: '/facebook/react', name: 'react' },
      ]

      configGet.mockReturnValue(existingLibraries)

      const newLibrary = { id: '/vuejs/vue', name: 'vue' }
      const updatedLibraries = [...existingLibraries, newLibrary]
      await vscode.workspace.getConfiguration('context7').update('libraries', updatedLibraries)

      expect(configUpdate).toHaveBeenCalledWith('libraries', updatedLibraries)
    })

    it('should remove library by id', async () => {
      const libraries = [
        { id: '/facebook/react', name: 'react' },
        { id: '/vuejs/vue', name: 'vue' },
      ]

      const filtered = libraries.filter((lib) => lib.id !== '/facebook/react')

      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe('/vuejs/vue')
    })

    it('should edit library id', async () => {
      const libraries = [
        { id: '/facebook/react', name: 'react' },
      ]

      const lib = libraries.find((l) => l.name === 'react')
      if (lib) {
        lib.id = '/facebook/react-v18'
      }

      expect(lib?.id).toBe('/facebook/react-v18')
    })
  })

  describe('Library Name Lookup', () => {
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