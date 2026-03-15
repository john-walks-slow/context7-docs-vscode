import * as vscode from 'vscode'
import { Context7Client } from '../api/context7'
import { COMMON_LIBRARIES, type LibraryItem } from '../constants/libraries'

/**
 * 用户库数据结构
 */
export interface UserLibrary {
  id: string
  name: string
  addedAt: number
}

/**
 * 库查询结果
 */
export interface LibraryInfo {
  id: string
  name: string
}

/**
 * 库管理服务
 * 负责库的增删改查和持久化
 */
export class LibraryService {
  private readonly _context: vscode.ExtensionContext
  private readonly _client: Context7Client

  constructor(context: vscode.ExtensionContext, client: Context7Client) {
    this._context = context
    this._client = client
  }

  /**
   * 获取用户库列表
   */
  public getUserLibraries(): UserLibrary[] {
    return this._context.globalState.get<UserLibrary[]>('userLibraries', [])
  }

  /**
   * 添加用户库
   */
  public async addUserLibrary(id: string, name: string): Promise<void> {
    const libraries = this.getUserLibraries()
    if (!libraries.some((lib) => lib.id === id)) {
      libraries.push({ id, name, addedAt: Date.now() })
      await this._saveUserLibraries(libraries)
    }
  }

  /**
   * 删除用户库
   */
  public async removeUserLibrary(id: string): Promise<void> {
    const libraries = this.getUserLibraries().filter((lib) => lib.id !== id)
    await this._saveUserLibraries(libraries)
  }

  /**
   * 编辑用户库 ID
   */
  public async editUserLibrary(name: string, newId: string): Promise<void> {
    const libraries = this.getUserLibraries()
    const lib = libraries.find((l) => l.name === name)
    if (lib) {
      lib.id = newId
      await this._saveUserLibraries(libraries)
    }
  }

  /**
   * 根据库名在 COMMON_LIBRARIES 和 UserLibraries 中查找
   */
  public findLibraryByName(name: string): LibraryInfo | undefined {
    const normalizedName = name.toLowerCase().replace(/^@/, '')

    // 先查用户库
    const userLibraries = this.getUserLibraries()
    const userMatch = userLibraries.find(
      (lib) =>
        lib.name.toLowerCase() === normalizedName ||
        lib.name.toLowerCase().replace(/^@/, '') === normalizedName,
    )
    if (userMatch) {
      return { id: userMatch.id, name: userMatch.name }
    }

    // 再查预设库
    const presetMatch = COMMON_LIBRARIES.find(
      (lib) => lib.name.toLowerCase() === normalizedName,
    )
    if (presetMatch) {
      return { id: presetMatch.id, name: presetMatch.name }
    }

    return undefined
  }

  /**
   * 根据 ID 查找库
   */
  public findLibraryById(id: string): LibraryInfo | undefined {
    // 查预设库
    const presetMatch = COMMON_LIBRARIES.find((lib) => lib.id === id)
    if (presetMatch) {
      return { id: presetMatch.id, name: presetMatch.name }
    }

    // 查用户库
    const userLibraries = this.getUserLibraries()
    const userMatch = userLibraries.find((lib) => lib.id === id)
    if (userMatch) {
      return { id: userMatch.id, name: userMatch.name }
    }

    return undefined
  }

  /**
   * 获取所有预设库（按字母排序）
   */
  public getSortedPresets(): LibraryItem[] {
    return [...COMMON_LIBRARIES].sort((a, b) => a.name.localeCompare(b.name))
  }

  /**
   * 获取所有用户库（按字母排序）
   */
  public getSortedUserLibraries(): UserLibrary[] {
    return [...this.getUserLibraries()].sort((a, b) =>
      a.name.localeCompare(b.name),
    )
  }

  /**
   * 搜索并添加库
   * @param presetName 预填的库名
   * @param continueSearch 是否返回库信息以继续搜索
   */
  public async searchAndAddLibrary(
    presetName?: string,
    continueSearch: boolean = false,
  ): Promise<LibraryInfo | undefined> {
    const name = await vscode.window.showInputBox({
      prompt: 'Enter library name',
      placeHolder: 'e.g., axios, lodash',
      value: presetName ?? '',
    })

    if (!name) {
      return undefined
    }

    try {
      const results = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Searching "${name}"...`,
          cancellable: false,
        },
        async () => {
          return await this._client.searchLibraries(name)
        },
      )

      if (!results || results.length === 0) {
        vscode.window.showErrorMessage(`Could not find library "${name}"`)
        return undefined
      }

      interface LibraryPickItem extends vscode.QuickPickItem {
        libraryId: string
        libraryTitle: string
      }

      const items: LibraryPickItem[] = results.map((r) => ({
        label: r.title,
        description: r.id,
        detail: `${r.totalSnippets} snippets · Score: ${r.benchmarkScore}`,
        libraryId: r.id,
        libraryTitle: r.title,
      }))

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: `Found ${results.length} result${results.length > 1 ? 's' : ''}. Select to add.`,
      })

      if (selected) {
        await this.addUserLibrary(
          selected.libraryId,
          selected.libraryTitle.toLowerCase(),
        )
        vscode.window.showInformationMessage(
          `Added "${selected.libraryTitle}" to your libraries`,
        )

        if (continueSearch) {
          return {
            id: selected.libraryId,
            name: selected.libraryTitle.toLowerCase(),
          }
        }
      }

      return undefined
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      vscode.window.showErrorMessage(`Search failed: ${message}`)
      return undefined
    }
  }

  /**
   * 直接通过 ID 添加库
   * @param continueSearch 是否返回库信息以继续搜索
   */
  public async addLibraryById(
    continueSearch: boolean = false,
  ): Promise<LibraryInfo | undefined> {
    const id = await vscode.window.showInputBox({
      prompt: 'Enter library ID',
      placeHolder: '/owner/repo',
      value: '/',
    })

    if (!id || !id.startsWith('/')) {
      return undefined
    }

    const name = id.split('/').pop() || id
    await this.addUserLibrary(id, name)
    vscode.window.showInformationMessage(`Added "${name}" to your libraries`)

    if (continueSearch) {
      return { id, name }
    }
    return undefined
  }

  /**
   * 保存用户库
   */
  private async _saveUserLibraries(libraries: UserLibrary[]): Promise<void> {
    await this._context.globalState.update('userLibraries', libraries)
  }
}
