import * as vscode from 'vscode'
import type { LibraryService, LibraryInfo } from '../../services/LibraryService'
import {
  createLibrarySeparatorItem,
  type UserLibraryQuickPickItem,
} from '../../types'

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
        return await this._libraryService.searchAndAddLibrary(searchName, true)
      }
      // 走列表选择
      return await this.pickLibraryFromList()
    }

    return await this.pickLibraryFromList()
  }

  /**
   * 从列表中选择库（返回库信息）
   */
  async pickLibraryFromList(): Promise<LibraryInfo | undefined> {
    const items: UserLibraryQuickPickItem[] = []

    // 所有库（统一展示）
    for (const lib of this._libraryService.getSortedLibraries()) {
      items.push({
        label: lib.name,
        description: lib.id,
        libraryId: lib.id,
        libraryName: lib.name,
        isUser: true,
      })
    }

    // 操作
    items.push(createLibrarySeparatorItem())

    items.push({
      label: 'Search library...',
      description: 'Search by name and add to list',
      libraryId: '__search__',
      libraryName: '',
      isUser: false,
    })

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a library',
    })

    if (!selected) {
      return undefined
    }

    if (selected.libraryId === '__search__') {
      return await this._libraryService.searchAndAddLibrary(undefined, true)
    }

    return { id: selected.libraryId, name: selected.libraryName }
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
    const items: UserLibraryQuickPickItem[] = []

    // 所有库（统一展示，都可以编辑和删除）
    for (const lib of this._libraryService.getSortedLibraries()) {
      items.push({
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
      })
    }

    // 分隔线和操作
    items.push(createLibrarySeparatorItem())

    items.push({
      label: 'Search library...',
      description: 'Search by name and add to list',
      libraryId: '__search__',
      libraryName: '',
      isUser: false,
    })

    items.push({
      label: 'Add library by ID...',
      description: 'Enter ID directly (e.g., /facebook/react)',
      libraryId: '__addById__',
      libraryName: '',
      isUser: false,
    })

    const quickPick = vscode.window.createQuickPick<UserLibraryQuickPickItem>()
    quickPick.items = items
    quickPick.placeholder =
      action === 'search'
        ? 'Choose a library to search its documentation'
        : 'Select a library to manage'

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
      quickPick.hide()
    })

    quickPick.onDidAccept(async () => {
      const selected = quickPick.selectedItems[0]
      quickPick.hide()

      if (!selected) {
        return
      }

      // 搜索新库（不在这里弹出输入框，由调用方处理）
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

      // 通过 ID 添加（不在这里弹出输入框，由调用方处理）
      if (selected.libraryId === '__addById__') {
        const result = await this._libraryService.addLibraryById(
          action === 'search',
        )
        if (result && action === 'search' && onSearch) {
          await onSearch(result.id, result.name)
        }
        return
      }

      // 选择了已有的库（不在这里弹出输入框，由调用方处理）
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
