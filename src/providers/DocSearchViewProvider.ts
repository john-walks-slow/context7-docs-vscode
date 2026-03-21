import * as vscode from 'vscode'
import { Context7Client } from '../api/context7'
import { LibraryService, type LibraryInfo } from '../services/LibraryService'
import { SearchService } from '../services/SearchService'
import { HistoryService } from '../services/HistoryService'
import { BookmarkService } from '../services/BookmarkService'
import { LibraryDetector } from '../utils/libraryDetector'
import { buildHtml, type HtmlOptions } from './webview/HtmlBuilder'
import { MessageHandler, type MessageContext } from './webview/MessageHandler'
import { LibraryPicker } from './pickers/LibraryPicker'
import { HistoryPicker } from './pickers/HistoryPicker'

/**
 * 文档搜索 Sidebar View Provider
 * 负责管理 Webview 视图、组合各模块
 */
export class DocSearchViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'context7.search'

  private _view?: vscode.WebviewView
  private readonly _client: Context7Client
  private readonly _context: vscode.ExtensionContext
  private readonly _libraryService: LibraryService
  private readonly _searchService: SearchService
  private readonly _historyService: HistoryService
  private readonly _bookmarkService: BookmarkService
  private readonly _messageHandler: MessageHandler
  private readonly _libraryPicker: LibraryPicker
  private readonly _historyPicker: HistoryPicker

  private _currentTheme: string = 'dark'
  private _currentLibraryId?: string
  private _currentLibraryName?: string
  private _currentQuery?: string

  constructor(
    context: vscode.ExtensionContext,
    client: Context7Client,
    libraryService: LibraryService,
  ) {
    this._context = context
    this._client = client
    this._libraryService = libraryService
    this._searchService = new SearchService()
    this._historyService = new HistoryService(context)
    this._bookmarkService = new BookmarkService(context)
    this._messageHandler = new MessageHandler()
    this._libraryPicker = new LibraryPicker(this._libraryService)
    this._historyPicker = new HistoryPicker(
      this._historyService,
      this._bookmarkService,
    )

    // 监听主题变化
    vscode.window.onDidChangeActiveColorTheme((theme) => {
      this._currentTheme =
        theme.kind === vscode.ColorThemeKind.Light ? 'light' : 'dark'
      if (this._view) {
        this._view.webview.postMessage({
          command: 'themeChanged',
          theme: this._currentTheme,
        })
      }
    })
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView
    this._currentTheme =
      vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Light
        ? 'light'
        : 'dark'

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this._context.extensionUri, 'resources'),
      ],
    }

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview)

    webviewView.webview.onDidReceiveMessage(async (message) => {
      await this._handleWebviewMessage(message)
    })
  }

  /**
   * 处理 Webview 消息
   */
  private async _handleWebviewMessage(message: {
    command: string
    [key: string]: unknown
  }): Promise<void> {
    // 特殊消息由 Provider 直接处理
    if (message.command === 'selectLibrary') {
      await this.showLibraryPicker()
      return
    }

    if (message.command === 'refresh') {
      await this._handleRefresh()
      return
    }

    // 其他消息委托给 MessageHandler
    const context: MessageContext = {
      currentLibraryId: this._currentLibraryId,
      currentLibraryName: this._currentLibraryName,
      currentQuery: this._currentQuery,
      searchService: this._searchService,
      historyService: this._historyService,
      bookmarkService: this._bookmarkService,
      postMessage: (msg) => this._view?.webview.postMessage(msg),
      handleSearch: this._handleSearch.bind(this),
      handleAddBookmark: this._handleAddBookmark.bind(this),
      sendHistoryUpdate: this._sendHistoryUpdate.bind(this),
      sendBookmarksUpdate: this._sendBookmarksUpdate.bind(this),
      showHistory: this.showHistory.bind(this),
      showBookmarks: this.showBookmarks.bind(this),
    }

    await this._messageHandler.handleMessage(message, context)
  }

  /**
   * 搜索模式：选择库后继续搜索
   */
  public async showLibraryPicker(): Promise<void> {
    await this._libraryPicker.selectLibrary('search', async (libraryId) => {
      const library = this._libraryService.findLibraryById(libraryId)
      const query = await vscode.window.showInputBox({
        prompt: `Search ${library?.name || libraryId} documentation`,
        placeHolder: 'e.g., useState hook usage',
      })
      if (query) {
        await this._handleSearch(libraryId, query)
      }
    })
  }

  /**
   * 管理模式：选择库后打开链接
   */
  public async manageLibraries(): Promise<void> {
    await this._libraryPicker.selectLibrary('manage')
  }

  /**
   * 从选中内容搜索文档
   */
  public async searchSelection(): Promise<void> {
    const editor = vscode.window.activeTextEditor
    if (!editor) {
      vscode.window.showWarningMessage('No active editor')
      return
    }

    const selection = editor.selection
    const selectedText = editor.document.getText(selection).trim()

    if (!selectedText) {
      vscode.window.showWarningMessage('No text selected')
      return
    }

    // 检测库
    const detector = new LibraryDetector()
    const libraryInfo = await detector.detectLibraryFromSelection()

    // 情况1：标准库检测
    if (libraryInfo && libraryInfo.details.isStdlib) {
      const { getStdlibContext7Id } = await import('../utils/libraryDetector')
      const stdlibId = getStdlibContext7Id(libraryInfo.name)
      if (stdlibId) {
        // 确保标准库在用户库列表中
        await this._libraryService.addLibrary(stdlibId, libraryInfo.name)
        await this._handleSearch(stdlibId, selectedText)
        return
      }
    }

    // 情况2：LSP 高置信度检测成功
    if (libraryInfo && libraryInfo.confidence === 'high') {
      // 先在已知库中查找
      const library = this._libraryService.findLibraryByName(libraryInfo.name)
      if (library) {
        await this._handleSearch(library.id, selectedText)
        return
      }

      // 未知库，自动解析 libraryId 并搜索（无需用户确认）
      try {
        const results = await this._client.searchLibraries(libraryInfo.name)
        if (results && results.length > 0) {
          const resolved = results[0]
          // 添加到用户库
          await this._libraryService.addLibrary(resolved.id, resolved.title)
          await this._handleSearch(resolved.id, selectedText)
          return
        }
      } catch (error) {
        console.error('[Context7] Auto-resolve failed:', error)
      }
    }

    // 情况3：低置信度或检测失败 → 弹出选择器
    const searchName = libraryInfo?.name || ''
    const result = await this._libraryPicker.selectLibraryForSearch(searchName)

    if (result) {
      await this._handleSearch(result.id, selectedText)
    }
  }

  /**
   * 处理搜索
   */
  private async _handleSearch(libraryId: string, query: string): Promise<void> {
    console.log('[Context7] _handleSearch called:', { libraryId, query })

    // 如果视图未打开，先打开侧边栏
    if (!this._view) {
      console.log('[Context7] View not initialized, opening sidebar...')
      await vscode.commands.executeCommand('context7.search.focus')
      // 等待视图初始化
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    if (!this._view) {
      console.error('[Context7] View still not available after focus')
      vscode.window.showWarningMessage('Please open Context7 sidebar first')
      return
    }

    console.log('[Context7] Sending loading message to webview')
    this._currentLibraryId = libraryId
    this._currentQuery = query
    this._view.webview.postMessage({ command: 'loading' })

    try {
      console.log('[Context7] Calling SearchService.search...')
      // 使用 SearchService 的缓存搜索方法
      const results = await this._searchService.search(
        this._client,
        libraryId,
        query,
      )
      console.log('[Context7] Search completed, results:', results.length)

      // 获取库名称
      const library = this._libraryService.findLibraryById(libraryId)
      this._currentLibraryName = library?.name || libraryId

      // 记录搜索历史
      await this._historyService.addHistory(
        libraryId,
        this._currentLibraryName,
        query,
      )

      console.log('[Context7] Sending results to webview')
      this._view.webview.postMessage({ command: 'results', results })
      this._sendHistoryUpdate()
    } catch (error) {
      console.error('[Context7] Search error:', error)
      this._view.webview.postMessage({
        command: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * 处理刷新搜索（强制重新搜索，忽略缓存）
   */
  private async _handleRefresh(): Promise<void> {
    if (!this._currentLibraryId || !this._currentQuery) {
      vscode.window.showWarningMessage('No search to refresh')
      return
    }

    if (!this._view) {
      return
    }

    console.log('[Context7] Refreshing search...')
    this._view.webview.postMessage({ command: 'loading' })

    try {
      // 使用 forceSearch 强制重新搜索
      const results = await this._searchService.forceSearch(
        this._client,
        this._currentLibraryId,
        this._currentQuery,
      )

      console.log('[Context7] Refresh completed, results:', results.length)
      this._view.webview.postMessage({ command: 'results', results })
    } catch (error) {
      console.error('[Context7] Refresh error:', error)
      this._view.webview.postMessage({
        command: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * 添加收藏
   */
  private async _handleAddBookmark(resultIndex: number): Promise<void> {
    if (
      !this._currentLibraryId ||
      !this._currentLibraryName ||
      !this._currentQuery
    ) {
      vscode.window.showWarningMessage('No search context')
      return
    }

    const results = this._searchService.getLastResults()
    const result = results[resultIndex]
    if (!result) {
      vscode.window.showWarningMessage('Result not found')
      return
    }

    // 获取标签和备注
    const tagsInput = await vscode.window.showInputBox({
      prompt: 'Add tags (comma-separated)',
      placeHolder: 'e.g., hooks, state, tutorial',
    })

    const note = await vscode.window.showInputBox({
      prompt: 'Add a note (optional)',
      placeHolder: 'Description for this bookmark',
    })

    const tags = tagsInput
      ? tagsInput
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : []

    await this._bookmarkService.addBookmark({
      libraryId: this._currentLibraryId,
      libraryName: this._currentLibraryName,
      query: this._currentQuery,
      title: result.title,
      content: result.content,
      code: result.code,
      language: result.language,
      tags,
      note: note || '',
    })

    vscode.window.showInformationMessage('Added to bookmarks')
    this._sendBookmarksUpdate()
  }

  /**
   * 显示搜索历史
   */
  public async showHistory(): Promise<void> {
    await this._historyPicker.showHistory(this._handleSearch.bind(this))
  }

  /**
   * 显示收藏夹
   */
  public async showBookmarks(): Promise<void> {
    await this._historyPicker.showBookmarks(this._handleSearch.bind(this))
  }

  /**
   * 发送历史更新
   */
  private _sendHistoryUpdate(): void {
    if (this._view) {
      this._view.webview.postMessage({
        command: 'historyUpdate',
        history: this._historyService.getHistory().slice(0, 10),
      })
    }
  }

  /**
   * 发送收藏更新
   */
  private _sendBookmarksUpdate(): void {
    if (this._view) {
      this._view.webview.postMessage({
        command: 'bookmarksUpdate',
        bookmarks: this._bookmarkService.getBookmarks().slice(0, 10),
      })
    }
  }

  /**
   * 生成 Webview HTML
   */
  private _getHtmlForWebview(webview: vscode.Webview): string {
    const markedUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._context.extensionUri,
        'resources',
        'marked.min.js',
      ),
    )
    const cssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._context.extensionUri,
        'resources',
        'webview.css',
      ),
    )
    const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline';">`

    const options: HtmlOptions = {
      theme: this._currentTheme,
      markedUri,
      cssUri,
      csp,
    }

    return buildHtml(options)
  }
}
