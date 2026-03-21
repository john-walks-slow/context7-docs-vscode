import { describe, it, expect, vi, beforeEach } from 'vitest'

// ==================== Mock I18nService ====================
vi.mock('../src/services/I18nService', () => ({
  I18nService: {
    instance: {
      t: (key: string, params?: Record<string, string>) =>
        params?.name ? `${key}:${params.name}` : key,
    },
  },
}))

// ==================== Mock vscode 模块 ====================

// 存储当前 QuickPick 实例，供测试访问
let currentQuickPick: any = null

vi.mock('vscode', () => ({
  window: {
    showInputBox: vi.fn(),
    showQuickPick: vi.fn(),
    showWarningMessage: vi.fn(),
    showInformationMessage: vi.fn(),
    showErrorMessage: vi.fn(),
    activeTextEditor: undefined,
    onDidChangeActiveColorTheme: vi.fn(() => ({ dispose: vi.fn() })),
    activeColorTheme: { kind: 1 },
    createQuickPick: vi.fn(() => {
      const handlers: Record<string, Function[]> = {}
      const quickPick = {
        items: [] as any[],
        activeItems: [] as any[],
        selectedItems: [] as any[],
        placeholder: '',
        visible: false,
        value: '', // 添加 value 属性
        onDidTriggerItemButton: vi.fn((fn: Function) => {
          handlers.onDidTriggerItemButton =
            handlers.onDidTriggerItemButton || []
          handlers.onDidTriggerItemButton.push(fn)
          return { dispose: vi.fn() }
        }),
        onDidAccept: vi.fn((fn: Function) => {
          handlers.onDidAccept = handlers.onDidAccept || []
          handlers.onDidAccept.push(fn)
          return { dispose: vi.fn() }
        }),
        onDidChangeValue: vi.fn((fn: Function) => {
          handlers.onDidChangeValue = handlers.onDidChangeValue || []
          handlers.onDidChangeValue.push(fn)
          return { dispose: vi.fn() }
        }),
        onDidHide: vi.fn((fn: Function) => {
          handlers.onDidHide = handlers.onDidHide || []
          handlers.onDidHide.push(fn)
          return { dispose: vi.fn() }
        }),
        show: vi.fn(() => {
          quickPick.visible = true
        }),
        hide: vi.fn(() => {
          quickPick.visible = false
        }),
        dispose: vi.fn(),
        // 测试辅助方法
        _handlers: handlers,
        _selectItem: async (item: any) => {
          quickPick.activeItems = [item]
          quickPick.selectedItems = [item]
          for (const fn of handlers.onDidAccept || []) {
            await fn()
          }
        },
        _changeValue: async (value: string) => {
          quickPick.value = value // 更新 value
          for (const fn of handlers.onDidChangeValue || []) {
            await fn(value)
          }
        },
        _hide: async () => {
          for (const fn of handlers.onDidHide || []) {
            await fn()
          }
        },
        _clickButton: async (item: any, button: any) => {
          for (const fn of handlers.onDidTriggerItemButton || []) {
            await fn({ item, button })
          }
        },
      }
      currentQuickPick = quickPick
      return quickPick
    }),
  },
  workspace: {
    getConfiguration: vi.fn(() => ({ get: vi.fn(), update: vi.fn() })),
    onDidChangeConfiguration: vi.fn(() => ({ dispose: vi.fn() })),
  },
  commands: {
    registerCommand: vi.fn(),
    executeCommand: vi.fn(),
  },
  env: {
    clipboard: { writeText: vi.fn() },
    openExternal: vi.fn(),
  },
  Uri: {
    parse: vi.fn((s: string) => ({ toString: () => s, fsPath: s })),
    joinPath: vi.fn(),
  },
  QuickPickItemKind: { Separator: -1 },
  ThemeIcon: class ThemeIcon {
    constructor(public id: string) {}
  },
  ColorThemeKind: { Light: 1, Dark: 2 },
  CancellationToken: {},
  SecretStorage: {},
}))

import type { LibraryService } from '../src/services/LibraryService'
import type { LibraryInfo } from '../src/types'
import * as vscode from 'vscode'
import { LibraryPicker } from '../src/providers/pickers/LibraryPicker'

describe('LibraryPicker', () => {
  let libraryPicker: LibraryPicker
  let mockLibraryService: LibraryService

  const mockLibraries = [
    { id: '/facebook/react', name: 'react', keywords: ['react', 'React'] },
    { id: '/vuejs/vue', name: 'vue', keywords: ['vue', 'Vue'] },
    { id: '/axios/axios', name: 'axios', keywords: ['axios'] },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    currentQuickPick = null

    mockLibraryService = {
      getLibraries: vi.fn(() => mockLibraries),
      getSortedLibraries: vi.fn(() => mockLibraries),
      getRecentLibraries: vi.fn(() => []),
      addRecentLibrary: vi.fn(),
      searchAndSelectLibrary: vi.fn(),
      addLibraryById: vi.fn(),
      addLibrary: vi.fn(),
      addKeyword: vi.fn(),
      removeLibrary: vi.fn(),
      editLibrary: vi.fn(),
      findLibraryById: vi.fn(),
      resolveByKeyword: vi.fn(),
    } as unknown as LibraryService

    libraryPicker = new LibraryPicker(mockLibraryService)
  })

  describe('selectLibrary - search 模式', () => {
    it('选择已有库时调用 onSearch 回调，不弹出输入框', async () => {
      const onSearch = vi.fn()

      // 启动 selectLibrary（不等待）
      const promise = libraryPicker.selectLibrary('search', onSearch)

      // 获取 QuickPick 实例
      expect(currentQuickPick).toBeTruthy()
      const qp = currentQuickPick

      // 找到 react 库项
      const reactItem = qp.items.find(
        (i: any) => i.libraryId === '/facebook/react',
      )
      expect(reactItem).toBeTruthy()

      // 模拟用户选择
      await qp._selectItem(reactItem)
      await promise

      // 验证 onSearch 被调用
      expect(onSearch).toHaveBeenCalledWith('/facebook/react', 'react')
      // 验证没有弹出输入框（由调用方处理）
      expect(vscode.window.showInputBox).not.toHaveBeenCalled()
    })

    it('选择 "Search library..." 时调用 searchAndSelectLibrary 然后 onSearch', async () => {
      const onSearch = vi.fn()
      const mockResult = {
        library: { id: '/lodash/lodash', name: 'lodash' },
        keyword: 'lodash',
      }
      vi.mocked(mockLibraryService.searchAndSelectLibrary).mockResolvedValue(
        mockResult,
      )

      const promise = libraryPicker.selectLibrary('search', onSearch)
      const qp = currentQuickPick

      const searchOption = qp.items.find(
        (i: any) => i.libraryId === '__search__',
      )
      await qp._selectItem(searchOption)
      await promise

      expect(mockLibraryService.searchAndSelectLibrary).toHaveBeenCalledWith()
      expect(onSearch).toHaveBeenCalledWith('/lodash/lodash', 'lodash')
    })

    it('选择 "Add library by ID..." 时调用 addLibraryById 然后 onSearch', async () => {
      const onSearch = vi.fn()
      const mockResult: LibraryInfo = { id: '/custom/lib', name: 'lib' }
      vi.mocked(mockLibraryService.addLibraryById).mockResolvedValue(mockResult)

      const promise = libraryPicker.selectLibrary('search', onSearch)
      const qp = currentQuickPick

      const addByIdOption = qp.items.find(
        (i: any) => i.libraryId === '__addById__',
      )
      await qp._selectItem(addByIdOption)
      await promise

      expect(mockLibraryService.addLibraryById).toHaveBeenCalledWith()
      expect(onSearch).toHaveBeenCalledWith('/custom/lib', 'lib')
    })

    it('searchAndSelectLibrary 返回 undefined 时不调用 onSearch', async () => {
      const onSearch = vi.fn()
      vi.mocked(mockLibraryService.searchAndSelectLibrary).mockResolvedValue(
        undefined,
      )

      const promise = libraryPicker.selectLibrary('search', onSearch)
      const qp = currentQuickPick

      const searchOption = qp.items.find(
        (i: any) => i.libraryId === '__search__',
      )
      await qp._selectItem(searchOption)
      await promise

      expect(onSearch).not.toHaveBeenCalled()
    })
  })

  describe('selectLibrary - manage 模式', () => {
    it('选择已有库时打开外部链接', async () => {
      const promise = libraryPicker.selectLibrary('manage')
      const qp = currentQuickPick

      const reactItem = qp.items.find(
        (i: any) => i.libraryId === '/facebook/react',
      )
      await qp._selectItem(reactItem)
      await promise

      expect(vscode.env.openExternal).toHaveBeenCalled()
    })

    it('manage 模式不调用 onSearch 回调', async () => {
      const onSearch = vi.fn()

      const promise = libraryPicker.selectLibrary('manage', onSearch)
      const qp = currentQuickPick

      const reactItem = qp.items.find(
        (i: any) => i.libraryId === '/facebook/react',
      )
      await qp._selectItem(reactItem)
      await promise

      expect(onSearch).not.toHaveBeenCalled()
    })
  })

  describe('selectLibrary - 按钮交互', () => {
    it('点击 "Open in Context7" 按钮打开链接', async () => {
      const promise = libraryPicker.selectLibrary('search')
      const qp = currentQuickPick

      const reactItem = qp.items.find(
        (i: any) => i.libraryId === '/facebook/react',
      )
      await qp._clickButton(reactItem, { tooltip: 'command.openInBrowser' })
      await promise

      expect(vscode.env.openExternal).toHaveBeenCalled()
    })

    it('点击 "Remove" 按钮删除用户库', async () => {
      const promise = libraryPicker.selectLibrary('search')
      const qp = currentQuickPick

      const axiosItem = qp.items.find(
        (i: any) => i.libraryId === '/axios/axios',
      )
      expect(axiosItem?.isUser).toBe(true)

      await qp._clickButton(axiosItem, { tooltip: 'command.removeBookmark' })
      await promise

      expect(mockLibraryService.removeLibrary).toHaveBeenCalledWith(
        '/axios/axios',
      )
    })

    it('点击 "Edit ID" 按钮编辑库 ID', async () => {
      vi.mocked(vscode.window.showInputBox).mockResolvedValue(
        '/axios/axios-new',
      )

      const promise = libraryPicker.selectLibrary('search')
      const qp = currentQuickPick

      const axiosItem = qp.items.find(
        (i: any) => i.libraryId === '/axios/axios',
      )
      await qp._clickButton(axiosItem, { tooltip: 'command.editBookmark' })
      await promise

      expect(mockLibraryService.editLibrary).toHaveBeenCalledWith(
        'axios',
        '/axios/axios-new',
      )
    })

    it('预设库不显示删除和编辑按钮', async () => {
      // 覆盖 getSortedLibraries 返回预设库
      vi.mocked(mockLibraryService.getSortedLibraries).mockReturnValue([
        { id: '/facebook/react', name: 'react', isPreset: true },
        { id: '/axios/axios', name: 'axios' },
      ])

      const promise = libraryPicker.selectLibrary('search')
      const qp = currentQuickPick

      const reactItem = qp.items.find(
        (i: any) => i.libraryId === '/facebook/react',
      )
      const axiosItem = qp.items.find(
        (i: any) => i.libraryId === '/axios/axios',
      )

      // 预设库 isUser 为 false
      expect(reactItem?.isUser).toBe(false)
      // 用户库 isUser 为 true
      expect(axiosItem?.isUser).toBe(true)

      // 预设库只有打开链接按钮，没有删除和编辑按钮
      expect(reactItem?.buttons).toHaveLength(1)
      expect(reactItem?.buttons[0].tooltip).toBe('command.openInBrowser')

      // 用户库有三个按钮
      expect(axiosItem?.buttons).toHaveLength(3)

      await qp._hide()
      await promise
    })
  })

  describe('selectLibrary - 动态搜索', () => {
    it('输入非匹配文本时显示动态搜索项', async () => {
      const promise = libraryPicker.selectLibrary('search')
      const qp = currentQuickPick

      await qp._changeValue('unknown-lib')

      const dynamicSearch = qp.items.find(
        (i: any) => i.libraryId === '__search_input__',
      )
      expect(dynamicSearch).toBeTruthy()
      expect(dynamicSearch.label).toContain('label.searching:unknown-lib')

      await qp._hide()
      await promise
    })

    it('选择动态搜索项调用 searchAndSelectLibrary', async () => {
      const onSearch = vi.fn()
      const mockResult = {
        library: { id: '/test/lib', name: 'lib' },
        keyword: 'test-lib',
      }
      vi.mocked(mockLibraryService.searchAndSelectLibrary).mockResolvedValue(
        mockResult,
      )

      const promise = libraryPicker.selectLibrary('search', onSearch)
      const qp = currentQuickPick

      await qp._changeValue('test-lib')

      const dynamicSearch = qp.items.find(
        (i: any) => i.libraryId === '__search_input__',
      )
      await qp._selectItem(dynamicSearch)
      await promise

      expect(mockLibraryService.searchAndSelectLibrary).toHaveBeenCalledWith(
        'test-lib',
      )
      expect(onSearch).toHaveBeenCalledWith('/test/lib', 'lib')
    })

    it('过滤显示匹配的库', async () => {
      const promise = libraryPicker.selectLibrary('search')
      const qp = currentQuickPick

      await qp._changeValue('react')

      // 应该只显示 react
      const libraryItems = qp.items.filter(
        (i: any) =>
          i.isUser ||
          i.libraryId === '__search_input__' ||
          i.libraryId === '__search__' ||
          i.libraryId === '__addById__',
      )
      expect(
        libraryItems.some((i: any) => i.libraryId === '/facebook/react'),
      ).toBe(true)
      expect(libraryItems.some((i: any) => i.libraryId === '/vuejs/vue')).toBe(
        false,
      )

      await qp._hide()
      await promise
    })
  })
})
