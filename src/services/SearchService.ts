import * as vscode from 'vscode'
import { createHighlighter, type Highlighter, type BundledTheme } from 'shiki'
import { marked } from 'marked'
import { type Context7Response, type Context7Client } from '../api/context7'
import { SearchCache } from './SearchCache'

/**
 * 搜索结果项
 */
export interface SearchResult {
  type: 'code' | 'info'
  title: string
  content: string // 统一使用 content 存储描述/说明文本（Markdown 格式）
  renderedContent?: string // 渲染后的 HTML（info 片段使用，包含语法高亮的代码块）
  code?: string
  language?: string
  highlightedCode?: string
  sourceUrl?: string // 源文档/代码 URL
  pageTitle?: string // 页面标题（仅代码片段有）
  tokens?: number // token 数量
}

/**
 * 搜索服务
 * 负责搜索、结果转换和代码高亮
 */
export class SearchService {
  private _highlighter: Highlighter | null = null
  private _currentTheme: string
  private _cache = new SearchCache()
  private _lastResults: SearchResult[] = []

  constructor() {
    // 初始化时检查当前主题
    this._currentTheme =
      vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Light
        ? 'light'
        : 'dark'

    // 监听主题变化
    vscode.window.onDidChangeActiveColorTheme((theme) => {
      const newTheme =
        theme.kind === vscode.ColorThemeKind.Light ? 'light' : 'dark'

      // 主题变化时，需要清除缓存并重新高亮
      if (newTheme !== this._currentTheme) {
        this._currentTheme = newTheme
        this._cache.clear()
      }
    })
  }

  /**
   * 执行搜索（带缓存）
   */
  public async search(
    client: Context7Client,
    libraryId: string,
    query: string,
  ): Promise<SearchResult[]> {
    const normalizedQuery = query.toLowerCase().trim()
    const cacheKey = `${libraryId}:${normalizedQuery}`

    console.log('[SearchService] search called:', {
      libraryId,
      query,
      normalizedQuery,
      cacheKey,
      cacheSize: this._cache.size,
    })

    // 检查缓存
    const cached = this._cache.get(libraryId, query)
    if (cached) {
      console.log('[SearchService] ✓ Cache HIT for:', cacheKey)
      vscode.window.showInformationMessage(
        `✓ Loaded from cache (${cached.length} results)`,
      )
      this._lastResults = cached
      return cached
    }

    console.log('[SearchService] ✗ Cache MISS, calling API...')
    // 执行搜索
    const response = await client.searchWithLibraryId(libraryId, query)
    console.log('[SearchService] API response received, transforming...')
    const results = await this.transformResults(response)
    console.log('[SearchService] Transformed results:', results.length)

    // 存入缓存
    this._cache.set(libraryId, query, results)
    console.log(
      '[SearchService] ✓ Cached results for:',
      cacheKey,
      'Total cache size:',
      this._cache.size,
    )
    this._lastResults = results
    return results
  }

  /**
   * 获取最后一次搜索结果
   */
  public getLastResults(): SearchResult[] {
    return this._lastResults
  }

  /**
   * 清除搜索缓存
   */
  public clearCache(): void {
    this._cache.clear()
  }

  /**
   * 强制重新搜索（忽略缓存）
   * 先删除缓存，再执行搜索
   */
  public async forceSearch(
    client: Context7Client,
    libraryId: string,
    query: string,
  ): Promise<SearchResult[]> {
    console.log('[SearchService] forceSearch called, clearing cache:', {
      libraryId,
      query,
    })
    // 清除特定搜索的缓存
    this._cache.delete(libraryId, query)
    // 重新搜索
    return this.search(client, libraryId, query)
  }

  /**
   * 获取当前主题
   */
  public getCurrentTheme(): string {
    return this._currentTheme
  }

  /**
   * 初始化 Shiki 高亮器
   */
  public async initHighlighter(): Promise<void> {
    if (this._highlighter) {
      return
    }

    this._highlighter = await createHighlighter({
      themes: ['github-dark', 'github-light', 'vitesse-dark', 'vitesse-light'],
      langs: [
        'javascript',
        'typescript',
        'jsx',
        'tsx',
        'python',
        'go',
        'rust',
        'java',
        'c',
        'cpp',
        'css',
        'html',
        'json',
        'yaml',
        'markdown',
        'bash',
        'sql',
      ],
    })
  }

  /**
   * 高亮代码
   */
  public async highlightCode(code: string, language: string): Promise<string> {
    await this.initHighlighter()

    const theme: BundledTheme =
      this._currentTheme === 'light' ? 'github-light' : 'github-dark'

    try {
      return this._highlighter!.codeToHtml(code, {
        lang: language,
        theme,
      })
    } catch {
      // 回退到纯文本
      return `<pre style="margin:0;padding:12px;overflow-x:auto;"><code>${this.escapeHtml(code)}</code></pre>`
    }
  }

  /**
   * 渲染 Markdown 内容（包含语法高亮的代码块）
   */
  public async renderMarkdownWithHighlight(markdown: string): Promise<string> {
    if (!markdown) return ''

    const self = this
    const theme: BundledTheme =
      this._currentTheme === 'light' ? 'github-light' : 'github-dark'

    // 自定义代码块渲染器，使用 Shiki 高亮
    const renderer = {
      code({ text, lang }: { text: string; lang?: string }): string {
        const language = lang || 'text'
        try {
          // 同步调用 Shiki（highlighter 已初始化）
          const highlighted = self._highlighter?.codeToHtml(text, {
            lang: language,
            theme,
          })
          return (
            highlighted || `<pre><code>${self.escapeHtml(text)}</code></pre>`
          )
        } catch {
          return `<pre><code>${self.escapeHtml(text)}</code></pre>`
        }
      },
    }

    marked.use({ renderer })
    return (await marked.parse(markdown)) as string
  }

  /**
   * 获取当前编辑器的语言
   */
  private getCurrentEditorLanguage(): string {
    const editor = vscode.window.activeTextEditor
    if (!editor) {
      return 'markdown'
    }

    const languageId = editor.document.languageId
    // 映射 VS Code 语言 ID 到 shiki 支持的语言
    const languageMap: Record<string, string> = {
      javascript: 'javascript',
      typescript: 'typescript',
      javascriptreact: 'jsx',
      typescriptreact: 'tsx',
      python: 'python',
      go: 'go',
      rust: 'rust',
      java: 'java',
      c: 'c',
      cpp: 'cpp',
      css: 'css',
      html: 'html',
      json: 'json',
      yaml: 'yaml',
      markdown: 'markdown',
      bash: 'bash',
      sql: 'sql',
    }

    return languageMap[languageId] || 'markdown'
  }

  /**
   * 转换搜索结果
   */
  public async transformResults(
    response: Context7Response,
  ): Promise<SearchResult[]> {
    console.log('[SearchService] transformResults called, response:', {
      hasCodeSnippets: !!response?.codeSnippets,
      hasInfoSnippets: !!response?.infoSnippets,
      codeCount: response?.codeSnippets?.length || 0,
      infoCount: response?.infoSnippets?.length || 0,
    })

    const results: SearchResult[] = []

    // 处理代码片段
    if (response.codeSnippets) {
      for (const snippet of response.codeSnippets) {
        if (snippet.codeList?.length > 0) {
          const code = snippet.codeList[0].code
          // 优先使用 API 提供的语言，否则使用当前编辑器的语言
          const language =
            snippet.codeList[0].language || this.getCurrentEditorLanguage()

          const highlightedCode = await this.highlightCode(code, language)

          results.push({
            type: 'code',
            title: snippet.codeTitle,
            content: snippet.codeDescription || '',
            code,
            language,
            highlightedCode,
            sourceUrl: snippet.codeId, // 源代码 URL
            pageTitle: snippet.pageTitle,
            tokens: snippet.codeTokens,
          })
        }
      }
    }

    // 处理信息片段
    if (response.infoSnippets) {
      for (const info of response.infoSnippets) {
        // 渲染 Markdown 并对代码块进行语法高亮
        const renderedContent = await this.renderMarkdownWithHighlight(
          info.content || '',
        )

        results.push({
          type: 'info',
          title: info.breadcrumb || 'Documentation',
          content: info.content || '',
          renderedContent,
          sourceUrl: info.pageId, // 源文档 URL
          tokens: info.contentTokens,
        })
      }
    }

    return results
  }

  /**
   * 插入代码到当前编辑器（智能缩进）
   */
  public async insertCode(code: string): Promise<void> {
    const editor = vscode.window.activeTextEditor
    if (!editor) {
      vscode.window.showWarningMessage('No active editor')
      return
    }

    const position = editor.selection.active
    const document = editor.document

    // 获取当前行的缩进
    const currentLine = document.lineAt(position.line)
    const currentIndent = currentLine.text.match(/^(\s*)/)?.[1] || ''

    // 智能调整代码缩进
    const adjustedCode = this._adjustCodeIndent(code, currentIndent)

    await editor.edit((editBuilder) => {
      editBuilder.insert(position, adjustedCode)
    })

    // 插入后自动格式化选中的代码
    const endPosition = document.positionAt(
      document.offsetAt(position) + adjustedCode.length,
    )
    editor.selection = new vscode.Selection(position, endPosition)
    await vscode.commands.executeCommand('editor.action.formatSelection')
    editor.selection = new vscode.Selection(endPosition, endPosition)
  }

  /**
   * 智能调整代码缩进
   */
  private _adjustCodeIndent(code: string, baseIndent: string): string {
    const lines = code.split('\n')
    if (lines.length === 0) return code

    // 单行代码：直接添加基础缩进
    if (lines.length === 1) {
      return baseIndent + lines[0]
    }

    // 多行代码：检测最小公共缩进
    let minIndent = Infinity
    for (let i = 0; i < lines.length; i++) {
      // 跳过空行
      if (lines[i].trim().length === 0) continue
      const indent = lines[i].match(/^(\s*)/)?.[1]?.length ?? 0
      minIndent = Math.min(minIndent, indent)
    }

    // 移除原有缩进，添加新缩进
    const indentToRemove = minIndent === Infinity ? 0 : minIndent
    return lines
      .map((line, index) => {
        if (line.trim().length === 0) return line
        // 第一行不加额外缩进
        if (index === 0) return line.slice(indentToRemove)
        return baseIndent + line.slice(indentToRemove)
      })
      .join('\n')
  }

  /**
   * 转义 HTML 特殊字符
   */
  public escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }
}
