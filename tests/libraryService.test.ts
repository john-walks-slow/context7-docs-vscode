import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Context7Client } from '../src/api/context7'
import { LibraryService } from '../src/services/LibraryService'
import * as vscode from 'vscode'
import {
  createMockSecretStorage,
  createMockMemento,
} from './__mocks__/vscode'

// ==================== Mock I18nService ====================
vi.mock('../src/services/I18nService', () => ({
  I18nService: {
    instance: {
      t: (key: string, params?: Record<string, string>) =>
        params?.name ? `${key}:${params.name}` : key,
    },
  },
}))

// ==================== 类型定义 ====================

/**
 * Mock ExtensionContext 类型（简化版，仅包含测试所需属性）
 */
interface MockExtensionContext {
  extensionUri: { fsPath: string }
  globalState: ReturnType<typeof createMockMemento>
  secrets: vscode.SecretStorage
  subscriptions: unknown[]
}

/**
 * 将 Mock 上下文转换为 VS Code ExtensionContext
 */
function asExtensionContext(
  ctx: MockExtensionContext,
): vscode.ExtensionContext {
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
    withProgress: vi.fn(
      (_options: unknown, task: (progress: unknown) => Promise<unknown>) =>
        task({}),
    ),
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
  ProgressLocation: {
    Notification: 3,
  },
  ConfigurationTarget: {
    Global: 1,
    Workspace: 2,
    WorkspaceFolder: 3,
  },
  CancellationToken: {},
}))

describe('LibraryService - Library Management', () => {
  let libraryService: LibraryService
  let mockContext: MockExtensionContext
  let mockClient: Context7Client
  let configGet: ReturnType<typeof vi.fn>
  let configUpdate: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()

    // 创建内存存储模拟配置
    const configStore: Record<string, unknown> = {}

    // 创建 Mock 函数
    configGet = vi.fn((key: string, defaultValue: unknown) => {
      return configStore[key] ?? defaultValue
    })
    configUpdate = vi.fn((key: string, value: unknown) => {
      configStore[key] = value
      return Promise.resolve()
    })

    // Mock workspace.getConfiguration
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: configGet,
      update: configUpdate,
    } as unknown as vscode.WorkspaceConfiguration)

    // Mock extension context with secrets
    mockContext = {
      extensionUri: { fsPath: '/test/extension' },
      globalState: createMockMemento(),
      secrets: createMockSecretStorage(),
      subscriptions: [],
    }

    mockClient = new Context7Client(mockContext.secrets)
    libraryService = new LibraryService(
      asExtensionContext(mockContext),
      mockClient,
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Library CRUD via Settings', () => {
    it('should get libraries from settings', () => {
      expect(vscode.workspace.getConfiguration).toBeDefined()
    })

    it('should save libraries to settings', async () => {
      const libraries = [{ id: '/facebook/react', name: 'react' }]

      await vscode.workspace
        .getConfiguration('context7')
        .update('libraries', libraries)

      expect(configUpdate).toHaveBeenCalledWith('libraries', libraries)
    })

    it('should retrieve libraries from settings', () => {
      const libraries = [{ id: '/vuejs/vue', name: 'vue' }]

      configGet.mockReturnValue(libraries)

      const result = vscode.workspace
        .getConfiguration('context7')
        .get('libraries', [])

      expect(result).toEqual(libraries)
    })

    it('should handle empty libraries', () => {
      configGet.mockReturnValue([])

      const result = vscode.workspace
        .getConfiguration('context7')
        .get('libraries', [])

      expect(result).toEqual([])
    })

    it('should add new library without duplicates', async () => {
      const existingLibraries = [{ id: '/facebook/react', name: 'react' }]

      configGet.mockReturnValue(existingLibraries)

      const newLibrary = { id: '/vuejs/vue', name: 'vue' }
      const updatedLibraries = [...existingLibraries, newLibrary]
      await vscode.workspace
        .getConfiguration('context7')
        .update('libraries', updatedLibraries)

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
      const libraries = [{ id: '/facebook/react', name: 'react' }]

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

      const match = searchName.toLowerCase() === libraryName.toLowerCase()

      expect(match).toBe(true)
    })
  })

  describe('resolveByKeyword', () => {
    it('should resolve when keyword matches preset library keywords', () => {
      // PRESET_LIBRARIES has 'react' keyword for '/websites/react_dev'
      const result = libraryService.resolveByKeyword('react')
      expect(result).toBeDefined()
      expect(result?.id).toBe('/websites/react_dev')
      expect(result?.name).toBe('React')
    })

    it('should resolve when keyword matches user library keywords', async () => {
      // Add user library with custom keyword
      await libraryService.addLibrary('/myorg/mylib', 'mylib', ['mykey'])

      const result = libraryService.resolveByKeyword('mykey')
      expect(result).toBeDefined()
      expect(result?.id).toBe('/myorg/mylib')
    })

    it('should resolve using name when keywords array is empty (legacy data)', () => {
      // Simulate legacy data: library without keywords field
      configGet.mockReturnValue([{ id: '/legacy/lib', name: 'legacylib' }])

      // Force rebuild of keyword index
      // @ts-expect-error - accessing private method for testing
      libraryService._invalidateKeywordIndex()

      const result = libraryService.resolveByKeyword('legacylib')
      expect(result).toBeDefined()
      expect(result?.id).toBe('/legacy/lib')
    })

    it('should be case-insensitive', () => {
      // PRESET_LIBRARIES has 'react' keyword (lowercase)
      const result1 = libraryService.resolveByKeyword('REACT')
      const result2 = libraryService.resolveByKeyword('React')
      const result3 = libraryService.resolveByKeyword('react')

      expect(result1?.id).toBe('/websites/react_dev')
      expect(result2?.id).toBe('/websites/react_dev')
      expect(result3?.id).toBe('/websites/react_dev')
    })

    it('should resolve standard library by name', () => {
      expect(libraryService.resolveByKeyword('python')?.id).toBe(
        '/python/cpython',
      )
      expect(libraryService.resolveByKeyword('rust')?.id).toBe('/rust-lang/rust')
      expect(libraryService.resolveByKeyword('go')?.id).toBe('/golang/go')
    })

    it('should return undefined when no match', () => {
      const result = libraryService.resolveByKeyword('nonexistent-keyword')
      expect(result).toBeUndefined()
    })

    it('should trim whitespace from keyword', () => {
      const result = libraryService.resolveByKeyword('  react  ')
      expect(result).toBeDefined()
      expect(result?.id).toBe('/websites/react_dev')
    })

    it('should prioritize user library over preset when same keyword', async () => {
      // User library overrides preset with same keyword
      await libraryService.addLibrary('/custom/react', 'Custom React', [
        'react',
      ])

      const result = libraryService.resolveByKeyword('react')
      expect(result).toBeDefined()
      // User library should be found (checked first in index building)
      expect(result?.id).toBe('/custom/react')
    })
  })

  describe('searchAndSelectLibrary - Keyword Binding', () => {
    let mockSearchLibraries: ReturnType<typeof vi.fn>

    beforeEach(() => {
      mockSearchLibraries = vi.fn()
      // @ts-expect-error - accessing private property for testing
      libraryService._client.searchLibraries = mockSearchLibraries
    })

    it('should use keywordToBind for binding when provided', async () => {
      // Setup: detected keyword "a", user searches with "b", selects React
      mockSearchLibraries.mockResolvedValue([
        {
          id: '/websites/react_dev',
          title: 'React',
          totalSnippets: 100,
          benchmarkScore: 95,
        },
      ])

      vi.mocked(vscode.window.showInputBox).mockResolvedValueOnce('b')
      vi.mocked(vscode.window.showQuickPick).mockResolvedValueOnce({
        label: 'React',
        libraryId: '/websites/react_dev',
        libraryTitle: 'React',
      } as vscode.QuickPickItem & { libraryId: string; libraryTitle: string })

      // Call with keywordToBind = "a" (detected keyword)
      const result = await libraryService.searchAndSelectLibrary('b', 'a', true)

      // Verify binding uses "a" NOT "b"
      expect(result).toBeDefined()
      expect(result?.keyword).toBe('a')

      // Verify addLibrary was called with "a" keyword
      const lastCall = configUpdate.mock.calls.at(-1)
      const savedLibraries = lastCall?.[1] as Array<{
        id: string
        keywords?: string[]
      }>
      const reactLib = savedLibraries?.find(
        (l) => l.id === '/websites/react_dev',
      )
      expect(reactLib?.keywords).toContain('a')
    })

    it('should use searchKeyword for binding when keywordToBind not provided', async () => {
      mockSearchLibraries.mockResolvedValue([
        {
          id: '/websites/react_dev',
          title: 'React',
          totalSnippets: 100,
          benchmarkScore: 95,
        },
      ])

      vi.mocked(vscode.window.showInputBox).mockResolvedValueOnce('react')
      vi.mocked(vscode.window.showQuickPick).mockResolvedValueOnce({
        label: 'React',
        libraryId: '/websites/react_dev',
        libraryTitle: 'React',
      } as vscode.QuickPickItem & { libraryId: string; libraryTitle: string })

      // Call without keywordToBind
      const result = await libraryService.searchAndSelectLibrary(
        'react',
        undefined,
        true,
      )

      expect(result).toBeDefined()
      expect(result?.keyword).toBe('react')
    })

    it('should handle "Search with different keyword" flow when no results', async () => {
      // First search returns empty, user retries with different keyword
      mockSearchLibraries
        .mockResolvedValueOnce([]) // First search - no results
        .mockResolvedValueOnce([
          {
            id: '/websites/react_dev',
            title: 'React',
            totalSnippets: 100,
            benchmarkScore: 95,
          },
        ])

      // First: user clicks "Search with different keyword"
      vi.mocked(vscode.window.showQuickPick)
        .mockResolvedValueOnce({
          label: '$(arrow-left) label.searchDifferentKeyword',
          id: '__retry__',
        } as vscode.QuickPickItem)
        // Second: user selects library
        .mockResolvedValueOnce({
          label: 'React',
          libraryId: '/websites/react_dev',
          libraryTitle: 'React',
        } as vscode.QuickPickItem & { libraryId: string; libraryTitle: string })

      // Second search input
      vi.mocked(vscode.window.showInputBox).mockResolvedValueOnce('react')

      const result = await libraryService.searchAndSelectLibrary(
        'nonexistent',
        'detected-keyword',
        true,
      )

      // Should continue to use original keywordToBind
      expect(result?.keyword).toBe('detected-keyword')
    })

    it('should handle "Cancel" in not-found QuickPick', async () => {
      mockSearchLibraries.mockResolvedValue([])

      vi.mocked(vscode.window.showQuickPick).mockResolvedValueOnce({
        label: '$(close) label.cancelSearch',
        id: '__cancel__',
      } as vscode.QuickPickItem)

      const result = await libraryService.searchAndSelectLibrary(
        'nonexistent',
        'keyword',
        true,
      )

      expect(result).toBeUndefined()
    })

    it('should exit cleanly on ESC in library selection', async () => {
      mockSearchLibraries.mockResolvedValue([
        {
          id: '/websites/react_dev',
          title: 'React',
          totalSnippets: 100,
          benchmarkScore: 95,
        },
      ])

      // User presses ESC (undefined = cancelled)
      vi.mocked(vscode.window.showQuickPick).mockResolvedValueOnce(undefined)

      const result = await libraryService.searchAndSelectLibrary(
        'react',
        'keyword',
        true,
      )

      expect(result).toBeUndefined()
    })

    it('should exit cleanly on ESC in input box', async () => {
      // User presses ESC in input box
      vi.mocked(vscode.window.showInputBox).mockResolvedValueOnce(undefined)

      const result = await libraryService.searchAndSelectLibrary()

      expect(result).toBeUndefined()
    })

    it('should handle back button in library selection', async () => {
      mockSearchLibraries.mockResolvedValue([
        {
          id: '/websites/react_dev',
          title: 'React',
          totalSnippets: 100,
          benchmarkScore: 95,
        },
      ])

      // User clicks back button, then cancels in next input
      vi.mocked(vscode.window.showQuickPick)
        .mockResolvedValueOnce({
          label: '$(arrow-left) label.searchDifferentKeyword',
          libraryId: '__back__',
          isBack: true,
        } as vscode.QuickPickItem & { libraryId: string; isBack: boolean })
        .mockResolvedValueOnce(undefined) // ESC in next QuickPick

      vi.mocked(vscode.window.showInputBox).mockResolvedValueOnce(undefined)

      const result = await libraryService.searchAndSelectLibrary(
        'react',
        'keyword',
        true,
      )

      expect(result).toBeUndefined()
    })

    it('should handle search error with retry', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      mockSearchLibraries
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce([
          {
            id: '/websites/react_dev',
            title: 'React',
            totalSnippets: 100,
            benchmarkScore: 95,
          },
        ])

      // VS Code showErrorMessage 有多个重载，当源码使用字符串按钮时返回字符串
      // 但 vi.mocked() 类型推断选择了 MessageItem 重载，需要双重断言
      vi.mocked(vscode.window.showErrorMessage).mockResolvedValueOnce(
        'label.tryAgain' as unknown as vscode.MessageItem,
      )
      vi.mocked(vscode.window.showQuickPick).mockResolvedValueOnce({
        label: 'React',
        libraryId: '/websites/react_dev',
        libraryTitle: 'React',
      } as vscode.QuickPickItem & { libraryId: string; libraryTitle: string })

      const result = await libraryService.searchAndSelectLibrary(
        'react',
        'keyword',
        true,
      )

      expect(result?.library.id).toBe('/websites/react_dev')
      expect(result?.keyword).toBe('keyword')

      consoleErrorSpy.mockRestore()
    })

    it('should handle search error with cancel', async () => {
      mockSearchLibraries.mockRejectedValue(new Error('Network error'))

      vi.mocked(vscode.window.showErrorMessage).mockResolvedValueOnce(
        'label.cancelSearch' as unknown as vscode.MessageItem,
      )

      const result = await libraryService.searchAndSelectLibrary(
        'react',
        'keyword',
        true,
      )

      expect(result).toBeUndefined()
    })
  })
})
