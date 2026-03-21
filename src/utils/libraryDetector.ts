import * as vscode from 'vscode'
import {
  extractLibraryFromPath,
  detectStandardLibrary,
} from '../constants/languagePaths'
import { STANDARD_LIBRARIES } from '../constants/libraries'

/**
 * 检测详情
 */
interface DetectionDetails {
  /** 检测方法：'lsp' | 'fallback' | 'stdlib' | 'none' */
  method: 'lsp' | 'fallback' | 'stdlib' | 'none'
  /** 定义文件路径（如果是 LSP 检测） */
  definitionPath?: string
  /** 匹配到的模式（如果有） */
  matchedPattern?: string
  /** 错误信息（如果有） */
  error?: string
  /** 是否为标准库 */
  isStdlib?: boolean
}

/**
 * 库信息
 */
export interface LibraryInfo {
  name: string
  confidence: 'high' | 'low'
  /** 检测详情 */
  details: DetectionDetails
}

/**
 * 精简版库检测器 - 仅使用 LSP
 */
export class LibraryDetector {
  /**
   * 从选中文本检测库名
   */
  async detectLibraryFromSelection(): Promise<LibraryInfo | null> {
    const editor = vscode.window.activeTextEditor
    if (!editor) {
      return null
    }

    const selection = editor.selection
    const selectedText = editor.document.getText(selection).trim()
    if (!selectedText) {
      return null
    }

    // 尝试 LSP 追踪定义，传递当前文档的语言 ID
    const lspResult = await this.traceDefinition(
      editor.document.uri,
      selection.start,
      editor.document.languageId,
    )

    if (lspResult) {
      return {
        name: lspResult.libraryName,
        confidence: 'high',
        details: {
          method: lspResult.isStdlib ? 'stdlib' : 'lsp',
          definitionPath: lspResult.definitionPath,
          matchedPattern: lspResult.matchedPattern,
          isStdlib: lspResult.isStdlib,
        },
      }
    }

    // 回退1：使用当前文件的语言 ID 作为库名
    const languageId = editor.document.languageId
    const stdlibName = getStdlibNameByLanguage(languageId)
    if (stdlibName) {
      return {
        name: stdlibName,
        confidence: 'low',
        details: {
          method: 'fallback',
          isStdlib: true,
        },
      }
    }

    // 回退2：提取第一个标识符
    const identifier = this.extractFirstIdentifier(selectedText)
    if (identifier) {
      return {
        name: identifier,
        confidence: 'low',
        details: {
          method: 'fallback',
        },
      }
    }

    return {
      name: selectedText.slice(0, 50), // 限制长度
      confidence: 'low',
      details: {
        method: 'none',
        error: '无法解析选中的文本为有效标识符',
      },
    }
  }

  /**
   * 通过 LSP DefinitionProvider 追踪定义位置
   */
  private async traceDefinition(
    uri: vscode.Uri,
    position: vscode.Position,
    languageId: string,
  ): Promise<{
    libraryName: string
    definitionPath: string
    matchedPattern?: string
    isStdlib?: boolean
  } | null> {
    try {
      const definitions = await vscode.commands.executeCommand<
        vscode.Location[] | vscode.LocationLink[]
      >('vscode.executeDefinitionProvider', uri, position)

      if (!definitions || definitions.length === 0) {
        console.log('[Context7] LSP: 未找到定义')
        return null
      }

      const definition = definitions[0]
      const definitionUri =
        'uri' in definition ? definition.uri : definition.targetUri
      const definitionPath = definitionUri.fsPath

      console.log(`[Context7] LSP: 找到定义在 ${definitionPath}`)

      // 优先检测标准库
      const stdlibName = detectStandardLibrary(definitionPath, languageId)
      if (stdlibName) {
        console.log(`[Context7] LSP: 检测到标准库 "${stdlibName}"`)
        return {
          libraryName: stdlibName,
          definitionPath,
          isStdlib: true,
        }
      }

      // 传递源文件的语言 ID，用于过滤匹配模式
      const libraryName = extractLibraryFromPath(definitionPath, languageId)

      if (libraryName) {
        console.log(`[Context7] LSP: 从路径提取到库名 "${libraryName}"`)
        return { libraryName, definitionPath }
      }

      console.log(
        `[Context7] LSP: 无法从路径 "${definitionPath}" 提取库名（语言: ${languageId}）`,
      )
      return null
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error(`[Context7] LSP 错误: ${errorMsg}`)
      return null
    }
  }

  /**
   * 从选中文本提取第一个标识符
   */
  private extractFirstIdentifier(text: string): string | null {
    const match = text.match(/^[a-zA-Z_]\w*/)
    return match ? match[0] : null
  }
}

/**
 * 根据语言 ID 获取标准库名称
 * @param languageId VS Code 语言 ID
 * @returns 标准库名称，或 null（不支持的语言）
 */
export function getStdlibNameByLanguage(languageId: string): string | null {
  const stdlib = STANDARD_LIBRARIES.find(
    (lib) => lib.keywords?.includes(languageId) || lib.name === languageId,
  )
  return stdlib?.name ?? null
}

/**
 * 根据标准库名称查找 Context7 ID
 * @param stdlibName 标准库名称（如 'python', 'rust'）
 * @returns 标准库的 Context7 ID，或 null
 */
export function getStdlibContext7Id(stdlibName: string): string | null {
  const stdlib = STANDARD_LIBRARIES.find(
    (lib) => lib.name.toLowerCase() === stdlibName.toLowerCase(),
  )
  return stdlib?.id ?? null
}

// 单例
export const libraryDetector = new LibraryDetector()
