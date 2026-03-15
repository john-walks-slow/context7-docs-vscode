import * as vscode from 'vscode'
import { Context7Client } from '../api/context7'
import { COMMON_LIBRARIES } from '../constants/libraries'

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
 *
 * 设计原则：预设库仅在初始化时合并到用户库，之后所有操作都基于用户库
 */
export class LibraryService {
  private readonly _context: vscode.ExtensionContext
  private readonly _client: Context7Client
  private readonly INIT_KEY = 'userLibrariesInitialized'

  constructor(context: vscode.ExtensionContext, client: Context7Client) {
    this._context = context
    this._client = client
  }

  /**
   * 初始化：首次运行时将预设库合并到用户库
   * 只执行一次，之后用户可以自由管理
   */
  public async initialize(): Promise<void> {
    const initialized = this._context.globalState.get<boolean>(
      this.INIT_KEY,
      false,
    )
    if (initialized) {
      return
    }

    const libraries = this.getUserLibraries()
    if (libraries.length === 0) {
      // 首次运行，将预设库作为默认值
      const defaultLibraries: UserLibrary[] = COMMON_LIBRARIES.map((lib) => ({
        id: lib.id,
        name: lib.name,
        addedAt: Date.now(),
      }))
      await this._saveUserLibraries(defaultLibraries)
      console.log(
        '[Context7] Initialized with',
        defaultLibraries.length,
        'preset libraries',
      )
    }

    await this._context.globalState.update(this.INIT_KEY, true)
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
   * 根据库名查找库（仅查用户库）
   */
  public findLibraryByName(name: string): LibraryInfo | undefined {
    const normalizedName = name.toLowerCase().replace(/^@/, '')
    const libraries = this.getUserLibraries()
    const match = libraries.find(
      (lib) =>
        lib.name.toLowerCase() === normalizedName ||
        lib.name.toLowerCase().replace(/^@/, '') === normalizedName,
    )
    return match ? { id: match.id, name: match.name } : undefined
  }

  /**
   * 根据 ID 查找库（仅查用户库）
   */
  public findLibraryById(id: string): LibraryInfo | undefined {
    const libraries = this.getUserLibraries()
    const match = libraries.find((lib) => lib.id === id)
    return match ? { id: match.id, name: match.name } : undefined
  }

  /**
   * 获取所有库（按字母排序）
   */
  public getSortedLibraries(): UserLibrary[] {
    return [...this.getUserLibraries()].sort((a, b) =>
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
    // 如果跳过确认且有预填名称，直接搜索
    let currentName = presetName ?? ''

    // 循环支持 ESC 返回上一级
    while (true) {
      // 跳过确认时直接用 presetName，否则弹出输入框
      const name =
        skipConfirm && currentName
          ? currentName
          : await vscode.window.showInputBox({
              prompt: 'Enter library name (ESC to go back)',
              placeHolder: 'e.g., axios, lodash',
              value: currentName,
            })

      // 重置 skipConfirm，后续循环需要用户输入
      skipConfirm = false

      if (!name) {
        // ESC 或空输入，退出循环
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
            continue // 返回输入框
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
          // ESC，返回上一级
          continue
        }

        if (selected.isBack) {
          // 选择"返回"，继续循环
          continue
        }

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
