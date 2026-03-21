import * as vscode from 'vscode'
import { Context7Client } from '../api/context7'
import { PRESET_LIBRARIES } from '../constants/libraries'
import { I18nService } from './I18nService'
import type { Library, LibraryInfo } from '../types'

/**
 * Library management service
 * Handles library CRUD operations and keyword resolution
 *
 * Data sources:
 * - PRESET_LIBRARIES: Preset libraries with keywords
 * - User libraries: Stored in VS Code settings (context7.libraries)
 * - Recent libraries: Stored in globalState (context7.recentLibraries)
 */
export class LibraryService {
  private readonly _context: vscode.ExtensionContext
  private readonly _client: Context7Client
  private _keywordIndex: Map<string, string> | null = null

  /** Maximum number of recent libraries to keep */
  private static readonly MAX_RECENT_LIBRARIES = 5

  constructor(context: vscode.ExtensionContext, client: Context7Client) {
    this._context = context
    this._client = client
  }

  /**
   * Resolve library ID by keyword
   * Searches preset libraries first, then user libraries
   */
  public resolveByKeyword(keyword: string): LibraryInfo | undefined {
    const normalizedKeyword = keyword.toLowerCase().trim()
    const index = this._getKeywordIndex()
    const libraryId = index.get(normalizedKeyword)

    if (libraryId) {
      const library = this.findLibraryById(libraryId)
      return library
    }

    return undefined
  }

  /**
   * Build keyword → library ID index
   * Combines PRESET_LIBRARIES and user libraries
   */
  private _getKeywordIndex(): Map<string, string> {
    if (this._keywordIndex) {
      return this._keywordIndex
    }

    const index = new Map<string, string>()

    // Index from PRESET_LIBRARIES (they have their own keywords)
    for (const lib of PRESET_LIBRARIES) {
      if (lib.keywords) {
        for (const kw of lib.keywords) {
          index.set(kw.toLowerCase(), lib.id)
        }
      }
    }

    // Index from user libraries
    const userLibraries = this.getLibraries()
    for (const lib of userLibraries) {
      if (lib.keywords && lib.keywords.length > 0) {
        // Has keywords - use them
        for (const kw of lib.keywords) {
          index.set(kw.toLowerCase(), lib.id)
        }
      } else {
        // No keywords (legacy data) - use name as keyword
        index.set(lib.name.toLowerCase(), lib.id)
      }
    }

    this._keywordIndex = index
    return index
  }

  /**
   * Invalidate keyword index (call after modifying libraries)
   */
  private _invalidateKeywordIndex(): void {
    this._keywordIndex = null
  }

  /**
   * Get user libraries from settings
   */
  public getLibraries(): Library[] {
    const config = vscode.workspace.getConfiguration('context7')
    return config.get<Library[]>('libraries', [])
  }

  /**
   * Add library with keywords
   */
  public async addLibrary(
    id: string,
    name: string,
    keywords?: string[],
  ): Promise<void> {
    const libraries = this.getLibraries()
    const existing = libraries.find((lib) => lib.id === id)

    if (existing) {
      // Merge keywords if library already exists
      if (keywords) {
        const existingKeywords = existing.keywords || []
        const mergedKeywords = [...new Set([...existingKeywords, ...keywords])]
        existing.keywords = mergedKeywords
      }
    } else {
      libraries.push({ id, name, keywords })
    }

    await this._saveLibraries(libraries)
    this._invalidateKeywordIndex()
  }

  /**
   * Add keyword to existing library
   */
  public async addKeyword(libraryId: string, keyword: string): Promise<void> {
    const libraries = this.getLibraries()
    const lib = libraries.find((l) => l.id === libraryId)

    if (lib) {
      const keywords = lib.keywords || []
      if (!keywords.includes(keyword)) {
        keywords.push(keyword)
        lib.keywords = keywords
        await this._saveLibraries(libraries)
        this._invalidateKeywordIndex()
      }
    }
  }

  /**
   * Remove library
   */
  public async removeLibrary(id: string): Promise<void> {
    const libraries = this.getLibraries().filter((lib) => lib.id !== id)
    await this._saveLibraries(libraries)
    this._invalidateKeywordIndex()
  }

  /**
   * Edit library ID
   */
  public async editLibrary(name: string, newId: string): Promise<void> {
    const libraries = this.getLibraries()
    const lib = libraries.find((l) => l.name === name)
    if (lib) {
      lib.id = newId
      await this._saveLibraries(libraries)
      this._invalidateKeywordIndex()
    }
  }

  /**
   * Find library by ID (searches presets + user libraries)
   */
  public findLibraryById(id: string): LibraryInfo | undefined {
    // Check user libraries first
    const userLibraries = this.getLibraries()
    const userMatch = userLibraries.find((lib) => lib.id === id)
    if (userMatch) {
      return { id: userMatch.id, name: userMatch.name }
    }

    // Check preset libraries
    const presetMatch = PRESET_LIBRARIES.find((lib) => lib.id === id)
    if (presetMatch) {
      return { id: presetMatch.id, name: presetMatch.name }
    }

    return undefined
  }

  /**
   * Get all libraries (presets + user libraries, sorted)
   */
  public getSortedLibraries(): Library[] {
    const userLibraries = this.getLibraries()
    const userIds = new Set(userLibraries.map((l) => l.id))

    // Combine: user libraries + preset libraries (not in user list)
    const allLibraries = [
      ...userLibraries,
      ...PRESET_LIBRARIES.filter((l) => !userIds.has(l.id)).map((l) => ({
        id: l.id,
        name: l.name,
        keywords: l.keywords,
        isPreset: true,
      })),
    ]

    return allLibraries.sort((a, b) => a.name.localeCompare(b.name))
  }

  /**
   * Get recent libraries from globalState
   * @returns Array of recent libraries (most recent first)
   */
  public getRecentLibraries(): Library[] {
    return this._context.globalState.get<Library[]>('recentLibraries', [])
  }

  /**
   * Add library to recent list
   * Moves existing entry to front if already exists
   */
  public async addRecentLibrary(id: string, name: string): Promise<void> {
    const recent = this.getRecentLibraries()

    // Remove existing entry if present
    const filtered = recent.filter((lib) => lib.id !== id)

    // Add to front
    filtered.unshift({ id, name })

    // Limit to MAX_RECENT_LIBRARIES
    const trimmed = filtered.slice(0, LibraryService.MAX_RECENT_LIBRARIES)

    await this._context.globalState.update('recentLibraries', trimmed)
  }

  /**
   * Clear recent libraries list
   */
  public async clearRecentLibraries(): Promise<void> {
    await this._context.globalState.update('recentLibraries', [])
  }

  /**
   * Search for library and return selection
   * @param searchKeyword Keyword to search in Context7
   * @param keywordToBind Keyword to bind with library (for association)
   * @param skipConfirm Skip input confirmation
   * @returns Selected library info or undefined
   */
  public async searchAndSelectLibrary(
    searchKeyword?: string,
    keywordToBind?: string,
    skipConfirm: boolean = false,
  ): Promise<{ library: LibraryInfo; keyword: string } | undefined> {
    let currentKeyword = searchKeyword ?? ''

    while (true) {
      const keyword = skipConfirm
        ? currentKeyword
        : currentKeyword ||
          (await vscode.window.showInputBox({
            prompt: I18nService.instance.t('prompt.enterLibraryKeyword'),
            placeHolder: I18nService.instance.t('placeholder.libraryKeyword'),
            value: currentKeyword,
          }))

      skipConfirm = false // Only skip first time

      if (!keyword) {
        return undefined
      }

      currentKeyword = keyword

      try {
        const results = await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: I18nService.instance.t('label.searching', { name: keyword }),
            cancellable: false,
          },
          async () => {
            return await this._client.searchLibraries(keyword)
          },
        )

        if (!results || results.length === 0) {
          // Show QuickPick instead of error popup
          const notFoundItem = await vscode.window.showQuickPick(
            [
              {
                label: `$(arrow-left) ${I18nService.instance.t('label.searchDifferentKeyword')}`,
                description: I18nService.instance.t(
                  'description.tryAnotherSearch',
                ),
                id: '__retry__',
              },
              {
                label: `$(close) ${I18nService.instance.t('label.cancelSearch')}`,
                description: I18nService.instance.t('description.exitSearch'),
                id: '__cancel__',
              },
            ],
            {
              placeHolder: I18nService.instance.t('label.noLibraryFound', {
                query: keyword,
              }),
            },
          )

          if (!notFoundItem || notFoundItem.id === '__cancel__') {
            return undefined
          }
          // Retry with different keyword
          currentKeyword = ''
          continue
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
            label: `$(arrow-left) ${I18nService.instance.t('label.searchDifferentKeyword')}`,
            libraryId: '__back__',
            libraryTitle: '',
            isBack: true,
          },
        ]

        const selected = await vscode.window.showQuickPick(items, {
          placeHolder: I18nService.instance.t('label.selectLibrary', {
            query: keyword,
          }),
        })

        // ESC pressed - exit and return undefined
        if (!selected) {
          return undefined
        }

        if (selected.isBack) {
          currentKeyword = ''
          continue
        }

        // 只在明确指定 keywordToBind 时才绑定关键词
        // 用户自由搜索时不自动绑定
        if (keywordToBind) {
          await this.addLibrary(selected.libraryId, selected.libraryTitle, [
            keywordToBind.toLowerCase(),
          ])
        } else {
          await this.addLibrary(selected.libraryId, selected.libraryTitle)
        }

        return {
          library: {
            id: selected.libraryId,
            name: selected.libraryTitle,
          },
          keyword: keywordToBind || keyword,
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        const retry = await vscode.window.showErrorMessage(
          I18nService.instance.t('error.searchFailed', { error: message }),
          I18nService.instance.t('label.tryAgain'),
          I18nService.instance.t('label.cancelSearch'),
        )
        if (retry === I18nService.instance.t('label.tryAgain')) {
          continue
        }
        return undefined
      }
    }
  }

  /**
   * Add library by ID directly
   */
  public async addLibraryById(): Promise<LibraryInfo | undefined> {
    const id = await vscode.window.showInputBox({
      prompt: I18nService.instance.t('prompt.enterLibraryId'),
      placeHolder: I18nService.instance.t('placeholder.enterLibraryId'),
      value: '/',
    })

    if (!id || !id.startsWith('/')) {
      return undefined
    }

    const name = id.split('/').pop() || id
    await this.addLibrary(id, name)
    vscode.window.showInformationMessage(
      I18nService.instance.t('message.libraryAddedById', { name }),
    )

    return { id, name }
  }

  /**
   * Save libraries to settings
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
