import * as vscode from 'vscode'
import type {
  HistoryService,
  SearchHistoryItem,
} from '../../services/HistoryService'
import type {
  BookmarkService,
  BookmarkItem,
} from '../../services/BookmarkService'

/**
 * 历史/书签选择器
 * 负责显示搜索历史和收藏夹
 */
export class HistoryPicker {
  constructor(
    private readonly _historyService: HistoryService,
    private readonly _bookmarkService: BookmarkService,
  ) {}

  /**
   * 显示搜索历史
   * @param onSearch 选择后执行搜索的回调
   */
  async showHistory(
    onSearch: (libraryId: string, query: string) => Promise<void>,
  ): Promise<void> {
    const history = this._historyService.getHistory()

    if (history.length === 0) {
      vscode.window.showInformationMessage('No search history yet')
      return
    }

    const items = history.map((item) => ({
      label: item.query,
      description: `${item.libraryName} - ${this._formatTime(item.timestamp)}`,
      detail: item.libraryId,
    }))

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Search history (click to search again)',
    })

    if (selected) {
      await onSearch(selected.detail!, selected.label)
    }
  }

  /**
   * 显示收藏夹
   * @param onSearch 选择后执行搜索的回调
   */
  async showBookmarks(
    onSearch: (libraryId: string, query: string) => Promise<void>,
  ): Promise<void> {
    const bookmarks = this._bookmarkService.getBookmarks()

    if (bookmarks.length === 0) {
      vscode.window.showInformationMessage('No bookmarks yet')
      return
    }

    const items = bookmarks.map((item) => ({
      label: item.title,
      description: `${item.libraryName} - ${this._formatTime(item.timestamp)}`,
      detail: item.id,
      buttons: [
        {
          iconPath: new vscode.ThemeIcon('trash'),
          tooltip: 'Remove',
        },
      ],
    }))

    const quickPick = vscode.window.createQuickPick()
    quickPick.items = items
    quickPick.placeholder = 'Bookmarks (click to view)'

    quickPick.onDidTriggerItemButton(async (event) => {
      const item = event.item as (typeof items)[0]
      if (event.button.tooltip === 'Remove') {
        await this._bookmarkService.removeBookmark(item.detail!)
        vscode.window.showInformationMessage('Bookmark removed')
        quickPick.items = quickPick.items.filter(
          (i) => (i as { detail: string }).detail !== item.detail,
        )
      }
    })

    quickPick.onDidAccept(async () => {
      const selected = quickPick.selectedItems[0] as
        | (typeof items)[0]
        | undefined
      quickPick.hide()

      if (selected) {
        const bookmark = this._bookmarkService.getBookmarkById(selected.detail!)
        if (bookmark) {
          await this._showBookmarkDetail(bookmark, onSearch)
        }
      }
    })

    quickPick.show()
  }

  /**
   * 显示收藏详情
   * @param bookmark 收藏项
   * @param onSearch 执行搜索的回调
   */
  private async _showBookmarkDetail(
    bookmark: BookmarkItem,
    onSearch: (libraryId: string, query: string) => Promise<void>,
  ): Promise<void> {
    const actions = ['View Code', 'Search Again', 'Cancel']

    if (bookmark.code) {
      const choice = await vscode.window.showQuickPick(actions, {
        placeHolder: bookmark.title,
      })

      if (choice === 'View Code') {
        const doc = await vscode.workspace.openTextDocument({
          content: bookmark.code,
          language: bookmark.language || 'plaintext',
        })
        await vscode.window.showTextDocument(doc)
      } else if (choice === 'Search Again') {
        await onSearch(bookmark.libraryId, bookmark.query)
      }
    } else {
      const choice = await vscode.window.showQuickPick(
        ['Search Again', 'Cancel'],
        {
          placeHolder: bookmark.title,
        },
      )

      if (choice === 'Search Again') {
        await onSearch(bookmark.libraryId, bookmark.query)
      }
    }
  }

  /**
   * 格式化时间
   */
  private _formatTime(timestamp: number): string {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return new Date(timestamp).toLocaleDateString()
  }
}
