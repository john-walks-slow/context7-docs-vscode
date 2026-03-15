import * as vscode from 'vscode'
import { createHighlighter, type Highlighter, type BundledTheme } from 'shiki'
import { type Context7Response, type Context7Client } from '../api/context7'
import { SearchCache } from './SearchCache'

/**
 * 搜索结果项
 */
export interface SearchResult {
  type: 'code' | 'info'
  title: string
  content: string // 统一使用 content 存储描述/说明文本（Markdown 格式）
  code?: string
  language?: string
  highlightedCode?: string
}

/**
 * 搜索服务
 * 负责搜索、结果转换和代码高亮
 */
export class SearchService {
  private _highlighter: Highlighter | null = null
  private _currentTheme: string = 'dark'
  private _cache = new SearchCache()

  constructor() {
    // 监听主题变化
    vscode.window.onDidChangeActiveColorTheme((theme) => {
      this._currentTheme =
        theme.kind === vscode.ColorThemeKind.Light ? 'light' : 'dark'
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
    // 检查缓存
    const cached = this._cache.get(libraryId, query)
    if (cached) return cached

    // 执行搜索
    const response = await client.searchWithLibraryId(libraryId, query)
    const results = await this.transformResults(response)

    // 存入缓存
    this._cache.set(libraryId, query, results)
    return results
  }

  /**
   * 清除搜索缓存
   */
  public clearCache(): void {
    this._cache.clear()
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
    if (this._highlighter) return

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
   * 检测代码语言
   */
  public detectLanguage(code: string): string {
    if (code.includes('import React') || code.includes('useState')) return 'tsx'
    if (code.includes('interface ') || code.includes(': string'))
      return 'typescript'
    if (code.includes('def ') || code.includes('import ')) return 'python'
    if (code.includes('func ') || code.includes('package ')) return 'go'
    if (code.includes('fn ') || code.includes('let mut')) return 'rust'
    if (code.includes('class ') && code.includes('{')) return 'javascript'
    return 'text'
  }

  /**
   * 转换搜索结果（info 在前，code 在后）
   */
  public async transformResults(
    response: Context7Response,
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = []

    // 处理信息片段（放在前面）
    if (response.infoSnippets) {
      for (const info of response.infoSnippets) {
        results.push({
          type: 'info',
          title: info.breadcrumb || 'Documentation',
          content: info.content || '',
        })
      }
    }

    // 处理代码片段（放在后面）
    if (response.codeSnippets) {
      for (const snippet of response.codeSnippets) {
        if (snippet.codeList?.length > 0) {
          const code = snippet.codeList[0].code
          const language =
            snippet.codeList[0].language || this.detectLanguage(code)

          const highlightedCode = await this.highlightCode(code, language)

          results.push({
            type: 'code',
            title: snippet.codeTitle,
            content: snippet.codeDescription || '',
            code,
            language,
            highlightedCode,
          })
        }
      }
    }

    return results
  }

  /**
   * 插入代码到当前编辑器
   */
  public async insertCode(code: string): Promise<void> {
    const editor = vscode.window.activeTextEditor
    if (!editor) {
      vscode.window.showWarningMessage('No active editor')
      return
    }
    await editor.edit((editBuilder) => {
      editBuilder.insert(editor.selection.active, code)
    })
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
