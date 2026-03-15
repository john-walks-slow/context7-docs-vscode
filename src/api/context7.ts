import * as vscode from 'vscode'
import { config } from 'dotenv'
import { existsSync } from 'fs'
import { join } from 'path'

interface CodeSnippet {
  codeTitle: string
  codeDescription: string
  codeLanguage: string
  codeTokens?: number
  codeId?: string // 源代码 URL
  pageTitle?: string
  codeList: Array<{
    language: string
    code: string
  }>
}

interface InfoSnippet {
  pageId: string // 源文档 URL
  breadcrumb: string
  content: string
  contentTokens?: number
}

export interface Context7Response {
  codeSnippets: CodeSnippet[]
  infoSnippets: InfoSnippet[]
  rules?: Record<string, unknown> // 库特定的规则和指南
}

export interface LibrarySearchResult {
  id: string
  title: string
  description: string
  totalSnippets: number
  trustScore: number
  benchmarkScore: number
  versions: string[]
}

interface LibrarySearchResponse {
  results: LibrarySearchResult[]
}

// MCP JSON-RPC 响应类型
interface McpResponse {
  jsonrpc: '2.0'
  id: number
  result?: {
    content: Array<{
      type: 'text'
      text: string
    }>
  }
  error?: {
    code: number
    message: string
  }
}

// ==================== 类型守卫 ====================

/**
 * 判断是否为有效的 MCP 响应
 */
export function isMcpResponse(value: unknown): value is McpResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'jsonrpc' in value &&
    (value as McpResponse<unknown>).jsonrpc === '2.0' &&
    'id' in value &&
    typeof (value as McpResponse<unknown>).id === 'number'
  )
}

/**
 * 判断是否为有效的库搜索结果
 */
export function isLibraryResult(value: unknown): value is LibrarySearchResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'title' in value &&
    typeof (value as LibrarySearchResult).id === 'string' &&
    typeof (value as LibrarySearchResult).title === 'string'
  )
}

/**
 * 判断是否为有效的 Context7 响应
 */
export function isContext7Response(value: unknown): value is Context7Response {
  return (
    typeof value === 'object' &&
    value !== null &&
    'codeSnippets' in value &&
    'infoSnippets' in value &&
    Array.isArray((value as Context7Response).codeSnippets) &&
    Array.isArray((value as Context7Response).infoSnippets)
  )
}

let requestId = 0

export class Context7Client {
  private readonly apiUrl = 'https://context7.com/api/v2'
  private readonly mcpUrl = 'https://mcp.context7.com/mcp'
  private readonly secrets: vscode.SecretStorage
  private envApiKey: string | undefined
  private cachedApiKey: string | undefined

  constructor(secrets: vscode.SecretStorage) {
    this.secrets = secrets

    // 从 .env 加载 API Key（用于调试）
    const envPath = join(__dirname, '..', '..', '.env')
    if (existsSync(envPath)) {
      const result = config({ path: envPath })
      if (!result.error && result.parsed?.CONTEXT7_API_KEY) {
        this.envApiKey = result.parsed.CONTEXT7_API_KEY
      }
    }
  }

  /**
   * 获取 API Key
   * 优先级: secrets > config (迁移) > .env
   */
  async getApiKey(): Promise<string | undefined> {
    // 返回缓存的 API Key（如果已验证过）
    if (this.cachedApiKey) {
      return this.cachedApiKey
    }

    // 优先从 secrets 获取
    const secretKey = await this.secrets.get('context7.apiKey')
    if (secretKey) {
      this.cachedApiKey = secretKey
      return secretKey
    }

    // 兼容旧配置（自动迁移）
    const config = vscode.workspace.getConfiguration('context7')
    const configKey = config.get<string>('apiKey')
    if (configKey) {
      // 迁移到 secrets
      await this.secrets.store('context7.apiKey', configKey)
      await config.update(
        'apiKey',
        undefined,
        vscode.ConfigurationTarget.Global,
      )
      this.cachedApiKey = configKey
      return configKey
    }

    // 最后检查 .env
    if (this.envApiKey) {
      return this.envApiKey
    }

    return undefined
  }

  /**
   * 设置 API Key（安全存储）
   */
  async setApiKey(key: string): Promise<void> {
    await this.secrets.store('context7.apiKey', key)
    this.cachedApiKey = key
  }

  /**
   * 检查是否配置了 API Key
   */
  async hasApiKey(): Promise<boolean> {
    const key = await this.getApiKey()
    return !!key
  }

  // ==================== MCP 匿名访问方法 ====================

  /**
   * 通过 MCP 端点调用工具（匿名访问）
   * 注意：MCP 返回的是纯文本（Markdown 格式），不是 JSON
   */
  private async callMcpTool(
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<string> {
    const id = ++requestId

    const response = await fetch(this.mcpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args,
        },
        id,
      }),
    })

    if (!response.ok) {
      throw new Error(
        `MCP request failed: ${response.status} ${response.statusText}`,
      )
    }

    const data: McpResponse<unknown> = await response.json()

    if (data.error) {
      throw new Error(`MCP error: ${data.error.message}`)
    }

    // MCP 返回的是 text 格式，直接返回文本内容
    const textContent = data.result?.content?.[0]?.text
    if (typeof textContent === 'string') {
      return textContent
    }

    throw new Error('MCP response missing content')
  }

  /**
   * 通过 MCP 匿名搜索库
   */
  private async searchLibrariesViaMcp(
    libraryName: string,
    query: string,
  ): Promise<LibrarySearchResult[]> {
    const textResult = await this.callMcpTool('resolve-library-id', {
      libraryName,
      query: query || `documentation for ${libraryName}`,
    })

    console.log('[Context7] MCP resolve-library-id response:', textResult)

    // MCP 返回格式化文本，需要解析
    // 格式: "- Title: ...\n- Context7-compatible library ID: /xxx\n- Description: ..."
    return this.parseMcpLibraryResults(textResult)
  }

  /**
   * 解析 MCP 返回的库搜索结果文本（公开方法用于测试）
   * 格式：
   * - Title: React Documentation
   * - Context7-compatible library ID: /reactjs/react.dev
   * - Description: ...
   * - Code Snippets: 1250
   * - Trust Score: High
   * - Benchmark Score: 98
   * - Versions: 19.0.0, 18.3.1
   * ----------
   * - Title: React Native
   * ...
   */
  parseMcpLibraryResults(text: string): LibrarySearchResult[] {
    if (!text || typeof text !== 'string') {
      return []
    }

    // 检查错误情况
    if (text.includes('No libraries found')) {
      console.log('[Context7] No libraries found in MCP response')
      return []
    }

    // 按分隔符拆分每个库（10个或更多横线）
    const blocks = text.split(/\n-{10,}\n/)

    return blocks
      .map((block) => {
        const lines = block.split('\n').filter((l) => l.trim())

        const getValue = (prefix: string): string => {
          const line = lines.find((l) => l.startsWith(prefix))
          return line ? line.substring(prefix.length).trim() : ''
        }

        const id = getValue('- Context7-compatible library ID:')
        const title = getValue('- Title:')
        const description = getValue('- Description:')
        const snippetsStr = getValue('- Code Snippets:')
        // 兼容两种字段名（MCP SDK 使用 Trust Score，CLI 使用 Source Reputation）
        const trustStr =
          getValue('- Trust Score:') || getValue('- Source Reputation:')
        const benchmarkStr = getValue('- Benchmark Score:')
        const versionsStr = getValue('- Versions:')

        if (!id || !title) {
          return null
        }

        return {
          id,
          title,
          description,
          totalSnippets: parseInt(snippetsStr, 10) || 0,
          trustScore: this.parseTrustScore(trustStr),
          benchmarkScore: parseInt(benchmarkStr, 10) || 0,
          versions: versionsStr ? versionsStr.split(', ').filter(Boolean) : [],
        }
      })
      .filter((r): r is LibrarySearchResult => r !== null)
  }

  /**
   * 解析信任分数标签（公开方法用于测试）
   */
  parseTrustScore(label: string): number {
    const map: Record<string, number> = {
      High: 9,
      Medium: 5,
      Low: 2,
      Unknown: 0,
    }
    return map[label] ?? 0
  }

  /**
   * 通过 MCP 匿名获取文档
   */
  private async getDocsViaMcp(
    libraryId: string,
    query: string,
  ): Promise<Context7Response> {
    const textResult = await this.callMcpTool('query-docs', {
      libraryId,
      query,
    })

    console.log(
      '[Context7] MCP query-docs response length:',
      textResult?.length,
    )

    if (!textResult) {
      return { codeSnippets: [], infoSnippets: [] }
    }

    // query-docs 返回 Markdown 格式文本，需要解析
    // 格式用 "---" 分隔多个片段，每个片段可能有代码块
    return this.parseMcpDocsResult(textResult)
  }

  /**
   * 解析 MCP 返回的文档结果文本（公开方法用于测试）
   * 格式：
   * # Title
   * content...
   * ```language
   * code
   * ```
   * ---
   * # Another Title
   * ...
   */
  parseMcpDocsResult(text: string): Context7Response {
    const codeSnippets: CodeSnippet[] = []
    const infoSnippets: InfoSnippet[] = []

    // 检查错误情况
    if (text.includes('No documentation found')) {
      console.log('[Context7] No documentation found in MCP response')
      return { codeSnippets, infoSnippets }
    }

    // 按分隔符拆分（3个或更多横线）
    const sections = text.split(/\n---+\n/)

    for (const section of sections) {
      if (!section.trim()) {
        continue
      }

      // 提取所有代码块
      const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
      const codeBlocks: Array<{ language: string; code: string }> = []
      let match

      while ((match = codeBlockRegex.exec(section)) !== null) {
        codeBlocks.push({
          language: match[1] || 'text',
          code: match[2].trim(),
        })
      }

      // 提取标题（第一个 # 开头的行）
      const titleMatch = section.match(/^#\s+(.+)$/m)
      const title = titleMatch ? titleMatch[1].trim() : 'Documentation'

      // 移除代码块和标题后的内容作为描述
      const description = section
        .replace(codeBlockRegex, '')
        .replace(/^#\s+.+$/m, '')
        .trim()

      if (codeBlocks.length > 0) {
        // 有代码块，作为 codeSnippet
        codeSnippets.push({
          codeTitle: title,
          codeDescription: description,
          codeLanguage: codeBlocks[0].language,
          codeList: codeBlocks,
        })
      } else if (description) {
        // 纯文本，作为 infoSnippet
        infoSnippets.push({
          pageId: '',
          breadcrumb: '',
          content: section.trim(),
        })
      }
    }

    console.log(
      `[Context7] Parsed ${codeSnippets.length} code snippets, ${infoSnippets.length} info snippets`,
    )
    return { codeSnippets, infoSnippets }
  }

  // ==================== API Key 访问方法 ====================

  /**
   * 通过 API Key 搜索库
   */
  private async searchLibrariesViaApi(
    libraryName: string,
    query: string,
  ): Promise<LibrarySearchResult[]> {
    const apiKey = await this.getApiKey()
    if (!apiKey) {
      return []
    }

    const params = new URLSearchParams({
      libraryName,
      query: query || `documentation for ${libraryName}`,
    })

    const response = await fetch(`${this.apiUrl}/libs/search?${params}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Library search failed: ${response.status} ${errorText}`)
      return []
    }

    const data: LibrarySearchResponse = await response.json()
    return data.results || []
  }

  /**
   * 通过 API Key 获取文档
   */
  private async getDocsViaApi(
    libraryId: string,
    query: string,
  ): Promise<Context7Response> {
    const apiKey = await this.getApiKey()
    if (!apiKey) {
      throw new Error('API Key not configured')
    }

    const params = new URLSearchParams({
      query,
      libraryId,
      type: 'json',
    })

    const url = `${this.apiUrl}/context?${params}`
    console.log('[Context7] API request:', url)

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[Context7] API error:', response.status, error)
      throw new Error(`Context7 API error: ${error}`)
    }

    const data = await response.json()
    console.log('[Context7] API response type:', typeof data)
    console.log('[Context7] API response keys:', Object.keys(data || {}))
    console.log(
      '[Context7] API response sample:',
      JSON.stringify(data).substring(0, 500),
    )

    return data
  }

  // ==================== 公共方法（自动选择模式） ====================

  /**
   * 搜索库，返回多个结果
   * 有 API Key 时使用 API 端点，否则使用 MCP 匿名访问
   */
  async searchLibraries(
    libraryName: string,
    query: string = '',
  ): Promise<LibrarySearchResult[]> {
    const apiKey = await this.getApiKey()

    if (apiKey) {
      console.log('[Context7] Using API with key')
      return this.searchLibrariesViaApi(libraryName, query)
    }

    console.log('[Context7] Using MCP anonymous access')
    return this.searchLibrariesViaMcp(libraryName, query)
  }

  /**
   * 解析库名到 libraryId（返回最相关的第一个结果）
   */
  async resolveLibraryId(
    libraryName: string,
    query: string = '',
  ): Promise<string | undefined> {
    const results = await this.searchLibraries(libraryName, query)
    return results[0]?.id
  }

  /**
   * 使用 libraryId 直接搜索文档
   * 有 API Key 时使用 API 端点，否则使用 MCP 匿名访问
   */
  async searchWithLibraryId(
    libraryId: string,
    query: string,
  ): Promise<Context7Response> {
    const apiKey = await this.getApiKey()

    if (apiKey) {
      console.log('[Context7] Using API with key')
      return this.getDocsViaApi(libraryId, query)
    }

    console.log('[Context7] Using MCP anonymous access')
    return this.getDocsViaMcp(libraryId, query)
  }

  /**
   * 使用库名搜索文档（自动解析 libraryId）
   */
  async searchWithLibrary(
    libraryName: string,
    query: string,
  ): Promise<Context7Response> {
    const libraryId = await this.resolveLibraryId(libraryName, query)
    if (!libraryId) {
      throw new Error(
        `Could not find library "${libraryName}". Please check the library name.`,
      )
    }
    return this.searchWithLibraryId(libraryId, query)
  }
}
