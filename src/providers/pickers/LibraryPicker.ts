import * as vscode from 'vscode'
import type { LibraryService, LibraryInfo } from '../../services/LibraryService'
import {
  createLibrarySeparatorItem,
  type UserLibraryQuickPickItem,
} from '../../types'

/** 动态搜索项的 ID */
const SEARCH_INPUT_ITEM_ID = '__search_input__'

/**
 * 库选择器
 * 负责处理库的选择、搜索和添加
 */
export class LibraryPicker {
  constructor(private readonly _libraryService: LibraryService) {}

  /**
   * 选择库（搜索模式）
   * 选择后返回库信息，由调用者决定后续操作
   */
  async selectLibraryForSearch(
    searchName?: string,
  ): Promise<LibraryInfo | undefined> {
    if (searchName) {
      const choice = await vscode.window.showQuickPick(
        [
          {
            label: `Search "${searchName}" in Context7`,
            description: 'Resolve library ID',
            id: '__search__',
          },
          {
            label: 'Choose from library list',
            description: 'Select from presets or your libraries',
            id: '__list__',
          },
        ],
        {
          placeHolder: `Detected library: "${searchName}" - not in your libraries`,
        },
      )

      if (!choice) {
        return undefined
      }

      if (choice.id === '__search__') {
        return await this._libraryService.searchAndAddLibrary(searchName, true, true)
      }
      // 走列表选择
      return await this.pickLibraryFromList()
    }

    return await this.pickLibraryFromList()
  }

  /**
   * 从列表中选择库（返回库信息）
   * 支持：输入非匹配文本时自动搜索、ESC 返回上一级
   */
  async pickLibraryFromList(): Promise<LibraryInfo | undefined> {
    const libraries = this._libraryService.getSortedLibraries()
    const libraryItems: UserLibraryQuickPickItem[] = libraries.map((lib) => ({
      label: lib.name,
      description: lib.id,
      libraryId: lib.id,
      libraryName: lib.name,
      isUser: true,
    }))

    const quickPick = vscode.window.createQuickPick<UserLibraryQuickPickItem>()

    // 初始项：库列表 + 分隔线 + 操作
    const buildItems = (filter: string): UserLibraryQuickPickItem[] => {
      const items: UserLibraryQuickPickItem[] = []

      // 过滤库
      const filtered = filter
        ? libraryItems.filter(
            (item) =>
              item.label.toLowerCase().includes(filter.toLowerCase()) ||
              item.description?.toLowerCase().includes(filter.toLowerCase()),
          )
        : libraryItems

      items.push(...filtered)

      // 分隔线和操作
      items.push(createLibrarySeparatorItem())

      if (filter) {
        // 有输入时，提供"搜索 [输入]"选项
        items.push({
          label: `$(search) Search "${filter}" in Context7...`,
          description: 'Resolve library ID and add',
          libraryId: SEARCH_INPUT_ITEM_ID,
          libraryName: filter,
          isUser: false,
        })
      }

      items.push({
        label: '$(search) Search library...',
        description: 'Search by name and add to list',
        libraryId: '__search__',
        libraryName: '',
        isUser: false,
      })

      return items
    }

    quickPick.items = buildItems('')
    quickPick.placeholder = 'Select a library or type to search'

    // 动态更新项列表
    quickPick.onDidChangeValue((value) => {
      quickPick.items = buildItems(value)
    })

    return new Promise((resolve) => {
      quickPick.onDidAccept(() => {
        const selected = quickPick.activeItems[0]
        const inputValue = quickPick.value.trim()
        quickPick.hide()

        if (!selected) {
          // 没有选中项但有输入 → 直接搜索输入内容（跳过确认）
          if (inputValue) {
            this._libraryService
              .searchAndAddLibrary(inputValue, true, true)
              .then(resolve)
            return
          }
          resolve(undefined)
          return
        }

        if (selected.libraryId === SEARCH_INPUT_ITEM_ID) {
          // 直接使用输入文本搜索（跳过确认）
          this._libraryService
            .searchAndAddLibrary(selected.libraryName, true, true)
            .then(resolve)
          return
        }

        if (selected.libraryId === '__search__') {
          this._libraryService
            .searchAndAddLibrary(inputValue || undefined, true)
            .then(resolve)
          return
        }

        resolve({ id: selected.libraryId, name: selected.libraryName })
      })

      quickPick.onDidHide(() => {
        resolve(undefined)
      })

      quickPick.show()
    })
  }

  /**
   * 选择库（完整功能版）
   * @param action 'search' - 选择后搜索; 'manage' - 选择后打开链接
   * @param onSearch 搜索回调
   */
  async selectLibrary(
    action: 'search' | 'manage',
    onSearch?: (libraryId: string, libraryName: string) => Promise<void>,
  ): Promise<void> {
    const libraries = this._libraryService.getSortedLibraries()
    const libraryItems: UserLibraryQuickPickItem[] = libraries.map((lib) => ({
      label: lib.name,
      description: lib.id,
      libraryId: lib.id,
      libraryName: lib.name,
      isUser: true,
      buttons: [
        {
          iconPath: new vscode.ThemeIcon('globe'),
          tooltip: 'Open in Context7',
        },
        { iconPath: new vscode.ThemeIcon('edit'), tooltip: 'Edit ID' },
        { iconPath: new vscode.ThemeIcon('trash'), tooltip: 'Remove' },
      ],
    }))

    const quickPick = vscode.window.createQuickPick<UserLibraryQuickPickItem>()

    // 构建项列表
    const buildItems = (filter: string): UserLibraryQuickPickItem[] => {
      const items: UserLibraryQuickPickItem[] = []

      // 过滤库
      const filtered = filter
        ? libraryItems.filter(
            (item) =>
              item.label.toLowerCase().includes(filter.toLowerCase()) ||
              item.description?.toLowerCase().includes(filter.toLowerCase()),
          )
        : libraryItems

      items.push(...filtered)

      // 分隔线和操作
      items.push(createLibrarySeparatorItem())

      if (filter) {
        // 有输入时，提供"搜索 [输入]"选项
        items.push({
          label: `$(search) Search "${filter}" in Context7...`,
          description: 'Resolve library ID and add',
          libraryId: SEARCH_INPUT_ITEM_ID,
          libraryName: filter,
          isUser: false,
        })
      }

      items.push({
        label: '$(search) Search library...',
        description: 'Search by name and add to list',
        libraryId: '__search__',
        libraryName: '',
        isUser: false,
      })

      items.push({
        label: '$(add) Add library by ID...',
        description: 'Enter ID directly (e.g., /reactjs/react.dev)',
        libraryId: '__addById__',
        libraryName: '',
        isUser: false,
      })

      return items
    }

    quickPick.items = buildItems('')
    quickPick.placeholder =
      action === 'search'
        ? 'Choose a library or type to search'
        : 'Select a library to manage or type to search'

    // 动态更新项列表
    quickPick.onDidChangeValue((value) => {
      quickPick.items = buildItems(value)
    })

    // 处理按钮点击
    quickPick.onDidTriggerItemButton(async (event) => {
      const item = event.item

      if (event.button.tooltip === 'Open in Context7') {
        const url = `https://context7.com${item.libraryId}`
        await vscode.env.openExternal(vscode.Uri.parse(url))
        return
      }

      if (!item.isUser) {
        return
      }

      if (event.button.tooltip === 'Remove') {
        const confirm = await vscode.window.showWarningMessage(
          `Remove "${item.libraryName}" from your libraries?`,
          'Remove',
          'Cancel',
        )
        if (confirm === 'Remove') {
          await this._libraryService.removeUserLibrary(item.libraryId)
          // 刷新列表
          const idx = quickPick.items.findIndex(
            (i) => i.libraryId === item.libraryId,
          )
          if (idx !== -1) {
            quickPick.items = quickPick.items.filter((_, i) => i !== idx)
          }
        }
      } else if (event.button.tooltip === 'Edit ID') {
        const newId = await vscode.window.showInputBox({
          prompt: `Edit ID for ${item.libraryName}`,
          value: item.libraryId,
          placeHolder: '/owner/repo',
        })
        if (newId && newId !== item.libraryId) {
          await this._libraryService.editUserLibrary(item.libraryName, newId)
        }
      }
    })

    quickPick.onDidAccept(async () => {
      const selected = quickPick.activeItems[0]
      quickPick.hide()

      if (!selected) {
        return
      }

      // 直接使用输入文本搜索
      if (selected.libraryId === SEARCH_INPUT_ITEM_ID) {
        const result = await this._libraryService.searchAndAddLibrary(
          selected.libraryName,
          action === 'search',
        )
        if (result && action === 'search' && onSearch) {
          await onSearch(result.id, result.name)
        }
        return
      }

      // 搜索新库
      if (selected.libraryId === '__search__') {
        const result = await this._libraryService.searchAndAddLibrary(
          undefined,
          action === 'search',
        )
        if (result && action === 'search' && onSearch) {
          await onSearch(result.id, result.name)
        }
        return
      }

      // 通过 ID 添加
      if (selected.libraryId === '__addById__') {
        const result = await this._libraryService.addLibraryById(
          action === 'search',
        )
        if (result && action === 'search' && onSearch) {
          await onSearch(result.id, result.name)
        }
        return
      }

      // 选择了已有的库
      if (action === 'search' && onSearch) {
        await onSearch(selected.libraryId, selected.libraryName)
      } else {
        // manage 模式：打开链接
        const url = `https://context7.com${selected.libraryId}`
        await vscode.env.openExternal(vscode.Uri.parse(url))
      }
    })

    quickPick.show()
  }
}
