import * as vscode from 'vscode'
import type { LibraryService } from '../../services/LibraryService'
import type { LibraryInfo } from '../../types'
import { I18nService } from '../../services/I18nService'
import {
  createLibrarySeparatorItem,
  type UserLibraryQuickPickItem,
} from '../../types'

/** Dynamic search item ID */
const SEARCH_INPUT_ITEM_ID = '__search_input__'

/**
 * Library picker
 * Handles library selection, search, and management
 */
export class LibraryPicker {
  private readonly _i18n: I18nService

  constructor(private readonly _libraryService: LibraryService) {
    this._i18n = I18nService.instance
  }

  /**
   * Select library (full featured)
   * @param action 'search' - select then search; 'manage' - select then open link
   * @param onSearch Search callback
   */
  async selectLibrary(
    action: 'search' | 'manage',
    onSearch?: (libraryId: string, libraryName: string) => Promise<void>,
  ): Promise<void> {
    const allLibraries = this._libraryService.getSortedLibraries()
    // manage 模式只显示用户库（非预设库）
    const libraries =
      action === 'manage' ? allLibraries.filter((lib) => !lib.isPreset) : allLibraries
    const libraryItems: UserLibraryQuickPickItem[] = libraries.map((lib) => {
      const isUser = !lib.isPreset
      return {
        label: lib.name,
        description: lib.id,
        libraryId: lib.id,
        libraryName: lib.name,
        isUser,
        buttons: isUser
          ? [
              {
                iconPath: new vscode.ThemeIcon('globe'),
                tooltip: this._i18n.t('command.openInBrowser'),
              },
              {
                iconPath: new vscode.ThemeIcon('edit'),
                tooltip: this._i18n.t('command.editBookmark'),
              },
              {
                iconPath: new vscode.ThemeIcon('trash'),
                tooltip: this._i18n.t('command.removeBookmark'),
              },
            ]
          : [
              {
                iconPath: new vscode.ThemeIcon('globe'),
                tooltip: this._i18n.t('command.openInBrowser'),
              },
            ],
      }
    })

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

      // 无搜索输入时，显示最近使用的库
      if (!filter) {
        const recentLibraries = this._libraryService.getRecentLibraries()
        if (recentLibraries.length > 0) {
          // 最近使用的分隔线
          items.push({
            label: this._i18n.t('label.recentLibraries'),
            kind: vscode.QuickPickItemKind.Separator,
            libraryId: '',
            libraryName: '',
            isUser: false,
          })

          // 最近使用的库（带 clock 图标）
          for (const lib of recentLibraries) {
            items.push({
              label: `$(clock) ${lib.name}`,
              description: lib.id,
              libraryId: lib.id,
              libraryName: lib.name,
              isUser: false,
              buttons: [
                {
                  iconPath: new vscode.ThemeIcon('globe'),
                  tooltip: this._i18n.t('command.openInBrowser'),
                },
              ],
            })
          }
        }
      }

      items.push(...filtered)

      // 分隔线和操作
      items.push(createLibrarySeparatorItem())

      if (filter) {
        // 有输入时，提供"搜索 [输入]"选项
        items.push({
          label: `$(search) ${this._i18n.t('label.searching', { name: filter })}`,
          description: this._i18n.t('description.resolveLibrary'),
          libraryId: SEARCH_INPUT_ITEM_ID,
          libraryName: filter,
          isUser: false,
        })
      }

      items.push({
        label: `$(search) ${this._i18n.t('label.searchLibrary')}`,
        description: this._i18n.t('description.searchAddLibrary'),
        libraryId: '__search__',
        libraryName: '',
        isUser: false,
      })

      items.push({
        label: `$(add) ${this._i18n.t('label.addLibraryById')}`,
        description: this._i18n.t('description.enterIdDirectly'),
        libraryId: '__addById__',
        libraryName: '',
        isUser: false,
      })

      return items
    }

    quickPick.items = buildItems('')
    quickPick.placeholder =
      action === 'search'
        ? this._i18n.t('placeholder.searchLibrary')
        : this._i18n.t('placeholder.manageLibrary')

    // 动态更新项列表
    quickPick.onDidChangeValue((value) => {
      quickPick.items = buildItems(value)
    })

    // 处理按钮点击
    quickPick.onDidTriggerItemButton(async (event) => {
      const item = event.item

      if (event.button.tooltip === this._i18n.t('command.openInBrowser')) {
        const url = `https://context7.com${item.libraryId}`
        await vscode.env.openExternal(vscode.Uri.parse(url))
        return
      }

      if (!item.isUser) {
        return
      }

      if (event.button.tooltip === this._i18n.t('command.removeBookmark')) {
        await this._libraryService.removeLibrary(item.libraryId)
        // 刷新列表
        const idx = quickPick.items.findIndex(
          (i) => i.libraryId === item.libraryId,
        )
        if (idx !== -1) {
          quickPick.items = quickPick.items.filter((_, i) => i !== idx)
        }
      } else if (
        event.button.tooltip === this._i18n.t('command.editBookmark')
      ) {
        const newId = await vscode.window.showInputBox({
          prompt: this._i18n.t('message.editIdFor', { name: item.libraryName }),
          value: item.libraryId,
          placeHolder: this._i18n.t('placeholder.enterLibraryId'),
        })
        if (newId && newId !== item.libraryId) {
          await this._libraryService.editLibrary(item.libraryName, newId)
        }
      }
    })

    quickPick.onDidAccept(async () => {
      const selected = quickPick.activeItems[0]
      const inputValue = quickPick.value?.trim() || ''
      quickPick.hide()

      // 判断是否有匹配的库（非分隔线、非搜索项）
      const hasMatchedLibrary =
        selected &&
        selected.libraryId &&
        selected.libraryId !== SEARCH_INPUT_ITEM_ID &&
        selected.libraryId !== '__search__' &&
        selected.libraryId !== '__addById__' &&
        selected.kind !== vscode.QuickPickItemKind.Separator

      if (hasMatchedLibrary) {
        // 记录最近使用
        await this._libraryService.addRecentLibrary(
          selected.libraryId,
          selected.libraryName,
        )
        // 选择了已有的库
        if (action === 'search' && onSearch) {
          await onSearch(selected.libraryId, selected.libraryName)
        } else {
          // manage 模式：打开链接
          const url = `https://context7.com${selected.libraryId}`
          await vscode.env.openExternal(vscode.Uri.parse(url))
        }
        return
      }

      // Input new library name → search directly
      if (inputValue) {
        const result =
          await this._libraryService.searchAndSelectLibrary(inputValue)
        if (result && action === 'search' && onSearch) {
          await this._libraryService.addRecentLibrary(
            result.library.id,
            result.library.name,
          )
          await onSearch(result.library.id, result.library.name)
        }
        return
      }

      // Selected "Search library..." option → show input box
      if (selected?.libraryId === '__search__') {
        const result = await this._libraryService.searchAndSelectLibrary()
        if (result && action === 'search' && onSearch) {
          await this._libraryService.addRecentLibrary(
            result.library.id,
            result.library.name,
          )
          await onSearch(result.library.id, result.library.name)
        }
        return
      }

      // Add by ID
      if (selected?.libraryId === '__addById__') {
        const result = await this._libraryService.addLibraryById()
        if (result && action === 'search' && onSearch) {
          await this._libraryService.addRecentLibrary(result.id, result.name)
          await onSearch(result.id, result.name)
        }
        return
      }
    })

    quickPick.show()
  }
}
