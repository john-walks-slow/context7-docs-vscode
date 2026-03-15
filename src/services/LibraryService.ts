import * as vscode from 'vscode'
import { Context7Client } from '../api/context7'

/**
 * 库数据结构
 */
export interface Library {
  id: string
  name: string
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
 * 负责库的增删改查
 *
 * 设计原则：
 * - 用户库直接存储在 VS Code 设置项 context7.libraries
 * - 预设库是设置项的默认值（在 package.json 中定义）
 * - 所有操作直接修改设置项
 */
export class LibraryService {
  private readonly _client: Context7Client

  constructor(_context: vscode.ExtensionContext, client: Context7Client) {
    this._client = client
  }

  /**
   * 获取用户库列表（从设置读取）
   */
  public getLibraries(): Library[] {
    const config = vscode.workspace.getConfiguration('context7')
    return config.get<Library[]>('libraries', [])
  }

  /**
   * 添加库
   */
  public async addLibrary(id: string, name: string): Promise<void> {
    const libraries = this.getLibraries()
    if (!libraries.some((lib) => lib.id === id)) {
      libraries.push({ id, name })
      await this._saveLibraries(libraries)
    }
  }

  /**
   * 删除库
   */
  public async removeLibrary(id: string): Promise<void> {
    const libraries = this.getLibraries().filter((lib) => lib.id !== id)
    await this._saveLibraries(libraries)
  }

  /**
   * 编辑库 ID
   */
  public async editLibrary(name: string, newId: string): Promise<void> {
    const libraries = this.getLibraries()
    const lib = libraries.find((l) => l.name === name)
    if (lib) {
      lib.id = newId
      await this._saveLibraries(libraries)
    }
  }

  /**
   * 根据库名查找库
   */
  public findLibraryByName(name: string): LibraryInfo | undefined {
    const normalizedName = name.toLowerCase().replace(/^@/, '')
    const libraries = this.getLibraries()
    const match = libraries.find(
      (lib) =>
        lib.name.toLowerCase() === normalizedName ||
        lib.name.toLowerCase().replace(/^@/, '') === normalizedName,
    )
    return match ? { id: match.id, name: match.name } : undefined
  }

  /**
   * 根据 ID 查找库
   */
  public findLibraryById(id: string): LibraryInfo | undefined {
    const libraries = this.getLibraries()
    const match = libraries.find((lib) => lib.id === id)
    return match ? { id: match.id, name: match.name } : undefined
  }

  /**
   * 获取所有库（按字母排序）
   */
  public getSortedLibraries(): Library[] {
    return [...this.getLibraries()].sort((a, b) =>
      a.name.localeCompare(b.name),
    )
  }

  /**
   * 搜索并添加库
   * @param presetName 预填的库名
   * @param continueSearch 是否返回库信息以继续搜索
   * @param skipConfirm 是否跳过输入确认（直接用 presetName 搜索）
   */
  public async searchAndAddLibrary(
    presetName?: string,
    continueSearch: boolean = false,
    skipConfirm: boolean = false,
  ): Promise<LibraryInfo | undefined> {
    let currentName = presetName ?? ''

    while (true) {
      const name =
        skipConfirm && currentName
          ? currentName
          : await vscode.window.showInputBox({
              prompt: 'Enter library name (ESC to go back)',
              placeHolder: 'e.g., axios, lodash',
              value: currentName,
            })

      skipConfirm = false

      if (!name) {
        return undefined
      }

      currentName = name

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
          const retry = await vscode.window.showErrorMessage(
            `Could not find library "${name}"`,
            'Try Again',
            'Cancel',
          )
          if (retry === 'Try Again') {
            continue
          }
          return undefined
        }

        interface LibraryPickItem extends vscode.QuickPickItem {
          libraryId: string
          libraryTitle: string
          isBack?: boolean
        }

        const items: LibraryPickItem[] = [
          ...results.map((r) => ({
            label: r.title,
            description: r.id,
            detail: `${r.totalSnippets} snippets · Score: ${r.benchmarkScore}`,
            libraryId: r.id,
            libraryTitle: r.title,
          })),
          {
            label: '$(arrow-left) Back to search',
            description: 'Search with a different name',
            libraryId: '__back__',
            libraryTitle: '',
            isBack: true,
          },
        ]

        const selected = await vscode.window.showQuickPick(items, {
          placeHolder: `Found ${results.length} result${results.length > 1 ? 's' : ''}. Select to add.`,
        })

        if (!selected) {
          continue
        }

        if (selected.isBack) {
          continue
        }

        await this.addLibrary(selected.libraryId, selected.libraryTitle.toLowerCase())
        vscode.window.showInformationMessage(
          `Added "${selected.libraryTitle}" to your libraries`,
        )

        if (continueSearch) {
          return {
            id: selected.libraryId,
            name: selected.libraryTitle.toLowerCase(),
          }
        }
        return undefined
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        const retry = await vscode.window.showErrorMessage(
          `Search failed: ${message}`,
          'Try Again',
          'Cancel',
        )
        if (retry === 'Try Again') {
          continue
        }
        return undefined
      }
    }
  }

  /**
   * 直接通过 ID 添加库
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
    await this.addLibrary(id, name)
    vscode.window.showInformationMessage(`Added "${name}" to your libraries`)

    if (continueSearch) {
      return { id, name }
    }
    return undefined
  }

  /**
   * 保存库列表到设置
   */
  private async _saveLibraries(libraries: Library[]): Promise<void> {
    const config = vscode.workspace.getConfiguration('context7')
    await config.update(
      'libraries',
      libraries,
      vscode.ConfigurationTarget.Global,
    )
  }
}
