import * as vscode from 'vscode'

/**
 * 基础库选择项
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
