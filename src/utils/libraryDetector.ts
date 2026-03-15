import * as vscode from 'vscode'
import { extractLibraryFromPath } from '../constants/languagePaths'

/**
 * 库信息
 */
interface LibraryInfo {
  name: string
  confidence: 'high' | 'low'
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
    if (!editor) {return null}

    const selection = editor.selection
    const selectedText = editor.document.getText(selection).trim()
    if (!selectedText) {return null}

    // 尝试 LSP 追踪定义，传递当前文档的语言 ID
    const library = await this.traceDefinition(
      editor.document.uri,
      selection.start,
      editor.document.languageId,
    )
    if (library) {
      return { name: library, confidence: 'high' }
    }

    // 回退：提取第一个标识符
    const identifier = this.extractFirstIdentifier(selectedText)
    return identifier ? { name: identifier, confidence: 'low' } : null
  }

  /**
   * 通过 LSP DefinitionProvider 追踪定义位置
   */
  private async traceDefinition(
    uri: vscode.Uri,
    position: vscode.Position,
    languageId: string,
  ): Promise<string | null> {
    try {
      const definitions = await vscode.commands.executeCommand<
        vscode.Location[] | vscode.LocationLink[]
      >('vscode.executeDefinitionProvider', uri, position)

      if (!definitions || definitions.length === 0) {return null}

      const definition = definitions[0]
      const definitionUri = 'uri' in definition ? definition.uri : definition.targetUri
      // 传递源文件的语言 ID，用于过滤匹配模式
      return extractLibraryFromPath(definitionUri.fsPath, languageId)
    } catch {
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

// 单例
export const libraryDetector = new LibraryDetector()