import * as vscode from 'vscode'
import type { SearchService } from '../../services/SearchService'
import type { HistoryService } from '../../services/HistoryService'
import type { BookmarkService } from '../../services/BookmarkService'
import { I18nService } from '../../services/I18nService'

/**
 * 消息处理器上下文
 */
export interface MessageContext {
  /** 当前库 ID */
  currentLibraryId?: string
  /** 当前库名称 */
  currentLibraryName?: string
  /** 当前查询 */
  currentQuery?: string
  /** 搜索服务实例 */
  searchService: SearchService
  /** 历史服务实例 */
  historyService: HistoryService
  /** 收藏服务实例 */
  bookmarkService: BookmarkService
  /** 发送消息到 Webview */
  postMessage: (message: unknown) => void
  /** 处理搜索 */
  handleSearch: (libraryId: string, query: string) => Promise<void>
  /** 处理添加收藏 */
  handleAddBookmark: (resultIndex: number) => Promise<void>
  /** 发送历史更新 */
  sendHistoryUpdate: () => void
  /** 发送收藏更新 */
  sendBookmarksUpdate: () => void
  /** 显示历史 */
  showHistory: () => Promise<void>
  /** 显示收藏 */
  showBookmarks: () => Promise<void>
}

/**
 * Webview 消息处理器
 * 负责处理从 Webview 发来的消息
 */
export class MessageHandler {
  private readonly _i18n: I18nService

  constructor() {
    this._i18n = I18nService.instance
  }

  /**
   * 处理 Webview 消息
   * @param message 消息对象
   * @param context 消息处理上下文
   */
  async handleMessage(
    message: { command: string; [key: string]: unknown },
    context: MessageContext,
  ): Promise<void> {
    switch (message.command) {
      case 'search':
        await context.handleSearch(
          message.libraryId as string,
          message.query as string,
        )
        break

      case 'selectLibrary':
        // 由 Provider 处理显示库选择器
        break

      case 'copyCode':
        await vscode.env.clipboard.writeText(message.code as string)
        vscode.window.showInformationMessage(this._i18n.t('message.codeCopied'))
        break

      case 'insertCode':
        await context.searchService.insertCode(message.code as string)
        break

      case 'addToBookmark':
        await context.handleAddBookmark(message.resultIndex as number)
        break

      case 'viewHistory':
        await context.showHistory()
        break

      case 'viewBookmarks':
        await context.showBookmarks()
        break

      case 'removeHistoryItem':
        await context.historyService.removeHistoryItem(
          message.libraryId as string,
          message.query as string,
        )
        context.sendHistoryUpdate()
        break

      case 'removeBookmark':
        await context.bookmarkService.removeBookmark(message.id as string)
        context.sendBookmarksUpdate()
        break

      case 'searchFromHistory':
        await context.handleSearch(
          message.libraryId as string,
          message.query as string,
        )
        break

      case 'getHistory':
        context.sendHistoryUpdate()
        break

      case 'getBookmarks':
        context.sendBookmarksUpdate()
        break

      case 'refresh':
        // 由 Provider 处理刷新
        break
    }
  }
}
