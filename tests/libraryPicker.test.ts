import { describe, it, expect, vi, beforeEach } from 'vitest'

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

import type {
  LibraryService,
  LibraryInfo,
} from '../src/services/LibraryService'
import * as vscode from 'vscode'
import { LibraryPicker } from '../src/providers/pickers/LibraryPicker'

describe('LibraryPicker', () => {
  let libraryPicker: LibraryPicker
  let mockLibraryService: LibraryService

  const mockUserLibraries = [
    { id: '/facebook/react', name: 'react', addedAt: Date.now() },
    { id: '/vuejs/vue', name: 'vue', addedAt: Date.now() },
    { id: '/axios/axios', name: 'axios', addedAt: Date.now() },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    currentQuickPick = null

    mockLibraryService = {
      getUserLibraries: vi.fn(() => mockUserLibraries),
      getSortedLibraries: vi.fn(() => mockUserLibraries),
      searchAndAddLibrary: vi.fn(),
      addLibraryById: vi.fn(),
      removeUserLibrary: vi.fn(),
      editUserLibrary: vi.fn(),
      findLibraryById: vi.fn(),
      findLibraryByName: vi.fn(),
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

    it('选择 "Search library..." 时调用 searchAndAddLibrary 然后 onSearch', async () => {
      const onSearch = vi.fn()
      const mockResult: LibraryInfo = { id: '/lodash/lodash', name: 'lodash' }
      vi.mocked(mockLibraryService.searchAndAddLibrary).mockResolvedValue(
        mockResult,
      )

      const promise = libraryPicker.selectLibrary('search', onSearch)
      const qp = currentQuickPick

      const searchOption = qp.items.find(
        (i: any) => i.libraryId === '__search__',
      )
      await qp._selectItem(searchOption)
      await promise

      expect(mockLibraryService.searchAndAddLibrary).toHaveBeenCalledWith(
        undefined,
        true,
      )
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

      expect(mockLibraryService.addLibraryById).toHaveBeenCalledWith(true)
      expect(onSearch).toHaveBeenCalledWith('/custom/lib', 'lib')
    })

    it('searchAndAddLibrary 返回 undefined 时不调用 onSearch', async () => {
      const onSearch = vi.fn()
      vi.mocked(mockLibraryService.searchAndAddLibrary).mockResolvedValue(
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
      await qp._clickButton(reactItem, { tooltip: 'Open in Context7' })
      await promise

      expect(vscode.env.openExternal).toHaveBeenCalled()
    })

    it('点击 "Remove" 按钮删除用户库', async () => {
      vi.mocked(vscode.window.showWarningMessage).mockResolvedValue(
        'Remove' as any,
      )

      const promise = libraryPicker.selectLibrary('search')
      const qp = currentQuickPick

      const axiosItem = qp.items.find(
        (i: any) => i.libraryId === '/axios/axios',
      )
      expect(axiosItem?.isUser).toBe(true)

      await qp._clickButton(axiosItem, { tooltip: 'Remove' })
      await promise

      expect(mockLibraryService.removeUserLibrary).toHaveBeenCalledWith(
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
      await qp._clickButton(axiosItem, { tooltip: 'Edit ID' })
      await promise

      expect(mockLibraryService.editUserLibrary).toHaveBeenCalledWith(
        'axios',
        '/axios/axios-new',
      )
    })

    it('用户取消删除时不调用 removeUserLibrary', async () => {
      vi.mocked(vscode.window.showWarningMessage).mockResolvedValue(
        'Cancel' as any,
      )

      const promise = libraryPicker.selectLibrary('search')
      const qp = currentQuickPick

      const axiosItem = qp.items.find(
        (i: any) => i.libraryId === '/axios/axios',
      )
      await qp._clickButton(axiosItem, { tooltip: 'Remove' })
      await promise

      expect(mockLibraryService.removeUserLibrary).not.toHaveBeenCalled()
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
      expect(dynamicSearch.label).toContain('unknown-lib')

      await qp._hide()
      await promise
    })

    it('选择动态搜索项调用 searchAndAddLibrary', async () => {
      const onSearch = vi.fn()
      const mockResult: LibraryInfo = { id: '/test/lib', name: 'lib' }
      vi.mocked(mockLibraryService.searchAndAddLibrary).mockResolvedValue(
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

      expect(mockLibraryService.searchAndAddLibrary).toHaveBeenCalledWith(
        'test-lib',
        true,
        true, // skipConfirm - 直接搜索无需确认
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

  describe('selectLibraryForSearch', () => {
    it('检测到库名时显示两个选项', async () => {
      const mockResult: LibraryInfo = { id: '/lodash/lodash', name: 'lodash' }
      vi.mocked(mockLibraryService.searchAndAddLibrary).mockResolvedValue(
        mockResult,
      )

      vi.mocked(vscode.window.showQuickPick).mockResolvedValue({
        label: 'Search "lodash" in Context7',
        id: '__search__',
      } as any)

      const result = await libraryPicker.selectLibraryForSearch('lodash')

      expect(vscode.window.showQuickPick).toHaveBeenCalled()
      const items = vi.mocked(vscode.window.showQuickPick).mock
        .calls[0][0] as any[]
      expect(items).toHaveLength(2)
      expect(items[0].id).toBe('__search__')
      expect(items[1].id).toBe('__list__')

      expect(result).toEqual(mockResult)
    })

    it('用户取消时返回 undefined', async () => {
      vi.mocked(vscode.window.showQuickPick).mockResolvedValue(undefined)

      const result = await libraryPicker.selectLibraryForSearch('lodash')

      expect(result).toBeUndefined()
    })
  })

  describe('pickLibraryFromList', () => {
    it('包含预设库、用户库和操作项', async () => {
      const promise = libraryPicker.pickLibraryFromList()
      const qp = currentQuickPick

      expect(
        qp.items.find((i: any) => i.libraryId === '/facebook/react'),
      ).toBeTruthy()
      expect(
        qp.items.find((i: any) => i.libraryId === '/axios/axios'),
      ).toBeTruthy()
      expect(
        qp.items.find((i: any) => i.libraryId === '__search__'),
      ).toBeTruthy()

      // 清理
      await qp._hide()
      await promise
    })

    it('选择已有库返回库信息', async () => {
      const promise = libraryPicker.pickLibraryFromList()
      const qp = currentQuickPick

      const reactItem = qp.items.find(
        (i: any) => i.libraryId === '/facebook/react',
      )
      await qp._selectItem(reactItem)
      const result = await promise

      expect(result).toEqual({ id: '/facebook/react', name: 'react' })
    })

    it('输入非匹配文本时显示动态搜索项', async () => {
      const promise = libraryPicker.pickLibraryFromList()
      const qp = currentQuickPick

      // 模拟输入
      await qp._changeValue('unknown-lib')

      // 应该有动态搜索项
      const dynamicSearch = qp.items.find(
        (i: any) => i.libraryId === '__search_input__',
      )
      expect(dynamicSearch).toBeTruthy()
      expect(dynamicSearch.label).toContain('unknown-lib')

      // 清理
      await qp._hide()
      await promise
    })

    it('选择动态搜索项调用 searchAndAddLibrary', async () => {
      const mockResult: LibraryInfo = { id: '/test/lib', name: 'lib' }
      vi.mocked(mockLibraryService.searchAndAddLibrary).mockResolvedValue(
        mockResult,
      )

      const promise = libraryPicker.pickLibraryFromList()
      const qp = currentQuickPick

      // 模拟输入
      await qp._changeValue('test-lib')

      const dynamicSearch = qp.items.find(
        (i: any) => i.libraryId === '__search_input__',
      )
      await qp._selectItem(dynamicSearch)
      const result = await promise

      expect(mockLibraryService.searchAndAddLibrary).toHaveBeenCalledWith(
        'test-lib',
        true,
        true, // skipConfirm - 直接搜索无需确认
      )
      expect(result).toEqual(mockResult)
    })

    it('ESC 时返回 undefined', async () => {
      const promise = libraryPicker.pickLibraryFromList()
      const qp = currentQuickPick

      await qp._hide()
      const result = await promise

      expect(result).toBeUndefined()
    })
  })
})
