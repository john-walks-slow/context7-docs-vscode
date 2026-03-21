import * as vscode from 'vscode'

/**
 * Library data structure
 * - id: Context7 library ID (e.g., "/websites/react_dev")
 * - name: Display name (e.g., "React")
 * - keywords: Associated keywords for auto-resolution (e.g., ["react", "React", "react-dom"])
 */
export interface Library {
  id: string
  name: string
  keywords?: string[]
}

/**
 * Library info for query results
 */
export interface LibraryInfo {
  id: string
  name: string
}

/**
 * Base library quick pick item
 */
export interface BaseQuickPickItem extends vscode.QuickPickItem {
  libraryId: string
  libraryName: string
}

/**
 * 分隔线选择项
 */
export interface SeparatorQuickPickItem extends vscode.QuickPickItem {
  kind: vscode.QuickPickItemKind.Separator
  libraryId: ''
  libraryName: ''
}

/**
 * 库选择项（联合类型）
 */
export type LibraryQuickPickItem = BaseQuickPickItem | SeparatorQuickPickItem

/**
 * 带用户标记的库选择项
 */
export interface UserLibraryQuickPickItem extends BaseQuickPickItem {
  isUser: boolean
}

/**
 * 带用户标记的库选择项（包含分隔线）
 */
export type ExtendedLibraryQuickPickItem =
  | UserLibraryQuickPickItem
  | SeparatorQuickPickItem

/**
 * 类型守卫：判断是否为分隔线项
 */
export function isSeparatorItem(
  item: vscode.QuickPickItem,
): item is SeparatorQuickPickItem {
  return item.kind === vscode.QuickPickItemKind.Separator
}

/**
 * 创建库选择分隔线项
 * 用于带 isUser 标记的场景
 */
export function createLibrarySeparatorItem(): UserLibraryQuickPickItem {
  return {
    label: '',
    kind: vscode.QuickPickItemKind.Separator,
    libraryId: '',
    libraryName: '',
    isUser: false,
  }
}
