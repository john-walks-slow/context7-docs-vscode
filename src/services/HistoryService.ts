import * as vscode from 'vscode'

/**
 * 搜索历史项
 */
export interface SearchHistoryItem {
  libraryId: string
  libraryName: string
  query: string
  timestamp: number
}

/**
 * 搜索历史服务
 * 负责搜索历史的存储、查询和管理
 */
export class HistoryService {
  private readonly _context: vscode.ExtensionContext
  private readonly _maxHistorySize: number = 50

  constructor(context: vscode.ExtensionContext) {
    this._context = context
  }

  /**
   * 获取搜索历史
   */
  public getHistory(): SearchHistoryItem[] {
    return this._context.globalState.get<SearchHistoryItem[]>(
      'searchHistory',
      [],
    )
  }

  /**
   * 添加搜索历史
   */
  public async addHistory(
    libraryId: string,
    libraryName: string,
    query: string,
  ): Promise<void> {
    const history = this.getHistory()

    // 移除相同查询的旧记录
    const filtered = history.filter(
      (item) => !(item.libraryId === libraryId && item.query === query),
    )

    // 添加新记录到开头
    filtered.unshift({
      libraryId,
      libraryName,
      query,
      timestamp: Date.now(),
    })

    // 限制历史记录数量
    if (filtered.length > this._maxHistorySize) {
      filtered.splice(this._maxHistorySize)
    }

    await this._saveHistory(filtered)
  }

  /**
   * 清除所有搜索历史
   */
  public async clearHistory(): Promise<void> {
    await this._saveHistory([])
  }

  /**
   * 删除单条历史记录
   */
  public async removeHistoryItem(
    libraryId: string,
    query: string,
  ): Promise<void> {
    const history = this.getHistory()
    const filtered = history.filter(
      (item) => !(item.libraryId === libraryId && item.query === query),
    )
    await this._saveHistory(filtered)
  }

  /**
   * 获取最近使用的库
   */
  public getRecentLibraries(): Array<{ libraryId: string; libraryName: string }> {
    const history = this.getHistory()
    const libraryMap = new Map<string, string>()

    history.forEach((item) => {
      if (!libraryMap.has(item.libraryId)) {
        libraryMap.set(item.libraryId, item.libraryName)
      }
    })

    return Array.from(libraryMap.entries()).map(([libraryId, libraryName]) => ({
      libraryId,
      libraryName,
    }))
  }

  /**
   * 保存历史记录
   */
  private async _saveHistory(history: SearchHistoryItem[]): Promise<void> {
    await this._context.globalState.update('searchHistory', history)
  }
}