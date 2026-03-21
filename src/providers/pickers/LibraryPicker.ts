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
        const confirm = await vscode.window.showWarningMessage(
          this._i18n.t('message.confirmRemove', { name: item.libraryName }),
          this._i18n.t('button.remove'),
          this._i18n.t('button.cancel'),
        )
        if (confirm === this._i18n.t('button.remove')) {
          await this._libraryService.removeLibrary(item.libraryId)
          // 刷新列表
          const idx = quickPick.items.findIndex(
            (i) => i.libraryId === item.libraryId,
          )
          if (idx !== -1) {
            quickPick.items = quickPick.items.filter((_, i) => i !== idx)
          }
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
          await onSearch(result.library.id, result.library.name)
        }
        return
      }

      // Selected "Search library..." option → show input box
      if (selected?.libraryId === '__search__') {
        const result = await this._libraryService.searchAndSelectLibrary()
        if (result && action === 'search' && onSearch) {
          await onSearch(result.library.id, result.library.name)
        }
        return
      }

      // Add by ID
      if (selected?.libraryId === '__addById__') {
        const result = await this._libraryService.addLibraryById()
        if (result && action === 'search' && onSearch) {
          await onSearch(result.id, result.name)
        }
        return
      }
    })

    quickPick.show()
  }
}
