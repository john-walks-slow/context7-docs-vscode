import * as vscode from 'vscode'
import { Context7Client } from '../api/context7'
import { LibraryService, type LibraryInfo } from '../services/LibraryService'
import { SearchService, type SearchResult } from '../services/SearchService'
import { LibraryDetector } from '../utils/libraryDetector'
import {
  createLibrarySeparatorItem,
  type UserLibraryQuickPickItem,
} from '../types'

/**
 * 文档搜索 Sidebar View Provider
 * 负责管理 Webview 视图、消息路由和 HTML 生成
 */
export class DocSearchViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'context7.search'

  private _view?: vscode.WebviewView
  private readonly _client: Context7Client
  private readonly _context: vscode.ExtensionContext
  private readonly _libraryService: LibraryService
  private readonly _searchService: SearchService
  private _currentTheme: string = 'dark'

  constructor(context: vscode.ExtensionContext, client: Context7Client) {
    this._context = context
    this._client = client
    this._libraryService = new LibraryService(context, this._client)
    this._searchService = new SearchService()

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
    context: vscode.WebviewViewResolveContext,
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
      switch (message.command) {
        case 'search':
          await this._handleSearch(message.libraryId, message.query)
          break
        case 'selectLibrary':
          await this.showLibraryPicker()
          break
        case 'copyCode':
          await vscode.env.clipboard.writeText(message.code)
          vscode.window.showInformationMessage('Code copied')
          break
        case 'insertCode':
          await this._searchService.insertCode(message.code)
          break
      }
    })
  }

  /**
   * 搜索模式：选择库后继续搜索
   */
  public async showLibraryPicker(): Promise<void> {
    await this._selectLibrary('search')
  }

  /**
   * 管理模式：选择库后打开链接
   */
  public async manageLibraries(): Promise<void> {
    await this._selectLibrary('manage')
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

    let library: LibraryInfo | undefined

    if (libraryInfo && libraryInfo.confidence !== 'low') {
      // 尝试在已知库中匹配
      library = this._libraryService.findLibraryByName(libraryInfo.name)
    }

    // 找到已知库，直接搜索
    if (library) {
      await this._handleSearch(library.id, selectedText)
      return
    }

    // 未找到匹配库，弹出选择器
    const searchName = libraryInfo?.name || ''
    const result = await this._selectLibraryForSearch(searchName)

    if (result) {
      await this._handleSearch(result.id, selectedText)
    }
  }

  /**
   * 为搜索选择库（返回库信息，不自动搜索）
   */
  private async _selectLibraryForSearch(
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

      if (!choice) return undefined

      if (choice.id === '__search__') {
        return await this._libraryService.searchAndAddLibrary(searchName, true)
      }
      // 走列表选择
      return await this._pickLibraryFromList()
    }

    return await this._pickLibraryFromList()
  }

  /**
   * 从列表中选择库（返回库信息）
   */
  private async _pickLibraryFromList(): Promise<LibraryInfo | undefined> {
    const userLibraries = this._libraryService.getUserLibraries()

    const items: UserLibraryQuickPickItem[] = []

    // 预设库
    for (const lib of this._libraryService.getSortedPresets()) {
      items.push({
        label: lib.name,
        description: lib.description,
        libraryId: lib.id,
        libraryName: lib.name,
        isUser: false,
      })
    }

    // 用户库
    if (userLibraries.length > 0) {
      items.push(createLibrarySeparatorItem())

      for (const lib of this._libraryService.getSortedUserLibraries()) {
        items.push({
          label: lib.name,
          description: lib.id,
          libraryId: lib.id,
          libraryName: lib.name,
          isUser: true,
        })
      }
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

    if (!selected) return undefined

    if (selected.libraryId === '__search__') {
      return await this._libraryService.searchAndAddLibrary(undefined, true)
    }

    return { id: selected.libraryId, name: selected.libraryName }
  }

  /**
   * 选择库
   * @param action 'search' - 选择后搜索; 'manage' - 选择后打开链接
   */
  private async _selectLibrary(action: 'search' | 'manage'): Promise<void> {
    const userLibraries = this._libraryService.getUserLibraries()

    const items: UserLibraryQuickPickItem[] = []

    // 预设库（按字母排序）
    for (const lib of this._libraryService.getSortedPresets()) {
      items.push({
        label: lib.name,
        description: lib.description,
        libraryId: lib.id,
        libraryName: lib.name,
        isUser: false,
        buttons: [
          {
            iconPath: new vscode.ThemeIcon('globe'),
            tooltip: 'Open in Context7',
          },
        ],
      })
    }

    // 用户库（分隔线后）
    if (userLibraries.length > 0) {
      items.push(createLibrarySeparatorItem())

      for (const lib of this._libraryService.getSortedUserLibraries()) {
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
        ? 'Select a library to search'
        : 'Select a library to manage'

    // 处理按钮点击
    quickPick.onDidTriggerItemButton(async (event) => {
      const item = event.item

      if (event.button.tooltip === 'Open in Context7') {
        const url = `https://context7.com${item.libraryId}`
        await vscode.env.openExternal(vscode.Uri.parse(url))
        return
      }

      if (!item.isUser) return

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

      if (!selected) return

      // 搜索新库
      if (selected.libraryId === '__search__') {
        const result = await this._libraryService.searchAndAddLibrary(
          undefined,
          action === 'search',
        )
        if (result && action === 'search') {
          const query = await vscode.window.showInputBox({
            prompt: `Search ${result.name} documentation`,
            placeHolder: 'e.g., useState hook usage',
          })
          if (query) {
            await this._handleSearch(result.id, query)
          }
        }
        return
      }

      // 通过 ID 添加
      if (selected.libraryId === '__addById__') {
        const result = await this._libraryService.addLibraryById(
          action === 'search',
        )
        if (result && action === 'search') {
          const query = await vscode.window.showInputBox({
            prompt: `Search ${result.name} documentation`,
            placeHolder: 'e.g., useState hook usage',
          })
          if (query) {
            await this._handleSearch(result.id, query)
          }
        }
        return
      }

      // 选择了已有的库
      if (action === 'search') {
        const query = await vscode.window.showInputBox({
          prompt: `Search ${selected.libraryName} documentation`,
          placeHolder: 'e.g., useState hook usage',
        })
        if (query) {
          await this._handleSearch(selected.libraryId, query)
        }
      } else {
        // manage 模式：打开链接
        const url = `https://context7.com${selected.libraryId}`
        await vscode.env.openExternal(vscode.Uri.parse(url))
      }
    })

    quickPick.show()
  }

  /**
   * 处理搜索
   */
  private async _handleSearch(libraryId: string, query: string): Promise<void> {
    if (!this._view) {
      vscode.window.showWarningMessage('Please open Context7 sidebar first')
      return
    }

    this._view.webview.postMessage({ command: 'loading' })

    try {
      // 使用 SearchService 的缓存搜索方法
      const results = await this._searchService.search(
        this._client,
        libraryId,
        query,
      )
      this._view.webview.postMessage({ command: 'results', results })
    } catch (error) {
      this._view.webview.postMessage({
        command: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * 生成 Webview HTML
   */
  private _getHtmlForWebview(webview: vscode.Webview): string {
    const isDark = this._currentTheme === 'dark'
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
    const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src ${webview.cspSource};">`

    return `<!DOCTYPE html>
<html lang="en" class="${isDark ? 'theme-dark' : 'theme-light'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${csp}
  <link rel="stylesheet" href="${cssUri}">
  <script src="${markedUri}"></script>
</head>
<body>
  <div class="tabs" id="tabs">
    <div class="tab active" data-filter="all">All <span class="badge" id="badge-all">0</span></div>
    <div class="tab" data-filter="info">Info <span class="badge" id="badge-info">0</span></div>
    <div class="tab" data-filter="code">Code <span class="badge" id="badge-code">0</span></div>
  </div>

  <div class="content" id="content">
    <div class="empty-state">
      <div class="icon">📚</div>
      <div>Search documentation</div>
      <div class="hint">Click the search icon above or run "Context7: Search Documentation"</div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    let state = {
      results: [],
      loading: false,
      filter: 'all'
    };

    // Tab 点击
    document.getElementById('tabs').addEventListener('click', (e) => {
      const tab = e.target.closest('.tab');
      if (!tab) return;

      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.filter = tab.dataset.filter;
      render();
    });

    function render() {
      const content = document.getElementById('content');

      if (state.loading) {
        content.innerHTML = '<div class="loading">Searching</div>';
        return;
      }

      const filtered = state.filter === 'all'
        ? state.results
        : state.results.filter(r => r.type === state.filter);

      // 更新徽章
      document.getElementById('badge-all').textContent = state.results.length;
      document.getElementById('badge-code').textContent = state.results.filter(r => r.type === 'code').length;
      document.getElementById('badge-info').textContent = state.results.filter(r => r.type === 'info').length;

      if (filtered.length === 0) {
        if (state.results.length === 0) {
          content.innerHTML = \`
            <div class="empty-state">
              <div class="icon">📚</div>
              <div>Search documentation</div>
              <div class="hint">Click the search icon above or run "Context7: Search Documentation"</div>
            </div>
          \`;
        } else {
          content.innerHTML = \`
            <div class="empty-state">
              <div class="icon">🔍</div>
              <div>No \${state.filter} results</div>
            </div>
          \`;
        }
        return;
      }

      content.innerHTML = filtered.map((r, i) => {
        const globalIndex = state.results.indexOf(r);

        // 统一渲染逻辑：content 都用 marked.parse 渲染 Markdown
        const contentHtml = r.content ? marked.parse(r.content) : '';

        if (r.type === 'code') {
          return \`
            <div class="result-item">
              <div class="header">
                <div class="title">\${escapeHtml(r.title)}</div>
                <span class="type-badge code">code</span>
              </div>
              \${contentHtml ? \`<div class="info-content">\${contentHtml}</div>\` : ''}
              <div class="code-block">\${r.highlightedCode || ''}</div>
              <div class="actions">
                <button onclick="copyCode(\${globalIndex})">Copy</button>
                <button onclick="insertCode(\${globalIndex})">Insert</button>
              </div>
            </div>
          \`;
        } else {
          return \`
            <div class="result-item">
              <div class="header">
                <div class="title">\${escapeHtml(r.title)}</div>
                <span class="type-badge info">info</span>
              </div>
              <div class="info-content">\${contentHtml}</div>
            </div>
          \`;
        }
      }).join('');
    }

    function copyCode(index) {
      const code = state.results[index]?.code;
      if (code) vscode.postMessage({ command: 'copyCode', code });
    }

    function insertCode(index) {
      const code = state.results[index]?.code;
      if (code) vscode.postMessage({ command: 'insertCode', code });
    }

    function escapeHtml(text) {
      if (!text) return '';
      return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    window.addEventListener('message', event => {
      const message = event.data;
      switch (message.command) {
        case 'loading':
          state.loading = true;
          render();
          break;
        case 'results':
          state.loading = false;
          state.results = message.results;
          render();
          break;
        case 'error':
          state.loading = false;
          document.getElementById('content').innerHTML = \`<div class="error">\${escapeHtml(message.message)}</div>\`;
          break;
      }
    });
  </script>
</body>
</html>`
  }
}
