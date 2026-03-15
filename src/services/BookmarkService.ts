import * as vscode from 'vscode'

/**
 * 收藏项
 */
export interface BookmarkItem {
  id: string
  libraryId: string
  libraryName: string
  query: string
  title: string
  content: string
  code?: string
  language?: string
  tags: string[]
  note: string
  timestamp: number
}

/**
 * 收藏夹服务
 * 负责文档收藏的管理
 */
export class BookmarkService {
  private readonly _context: vscode.ExtensionContext

  constructor(context: vscode.ExtensionContext) {
    this._context = context
  }

  /**
   * 获取所有收藏
   */
  public getBookmarks(): BookmarkItem[] {
    return this._context.globalState.get<BookmarkItem[]>('bookmarks', [])
  }

  /**
   * 添加收藏
   */
  public async addBookmark(item: Omit<BookmarkItem, 'id' | 'timestamp'>): Promise<string> {
    const bookmarks = this.getBookmarks()
    const id = this._generateId()
    
    bookmarks.unshift({
      ...item,
      id,
      timestamp: Date.now(),
    })

    await this._saveBookmarks(bookmarks)
    return id
  }

  /**
   * 更新收藏
   */
  public async updateBookmark(
    id: string,
    updates: Partial<Omit<BookmarkItem, 'id' | 'timestamp'>>,
  ): Promise<void> {
    const bookmarks = this.getBookmarks()
    const index = bookmarks.findIndex((b) => b.id === id)

    if (index !== -1) {
      bookmarks[index] = {
        ...bookmarks[index],
        ...updates,
      }
      await this._saveBookmarks(bookmarks)
    }
  }

  /**
   * 删除收藏
   */
  public async removeBookmark(id: string): Promise<void> {
    const bookmarks = this.getBookmarks().filter((b) => b.id !== id)
    await this._saveBookmarks(bookmarks)
  }

  /**
   * 根据 ID 获取收藏
   */
  public getBookmarkById(id: string): BookmarkItem | undefined {
    return this.getBookmarks().find((b) => b.id === id)
  }

  /**
   * 按标签筛选收藏
   */
  public getBookmarksByTag(tag: string): BookmarkItem[] {
    return this.getBookmarks().filter((b) => b.tags.includes(tag))
  }

  /**
   * 获取所有标签
   */
  public getAllTags(): string[] {
    const bookmarks = this.getBookmarks()
    const tagSet = new Set<string>()
    
    bookmarks.forEach((b) => {
      b.tags.forEach((tag) => tagSet.add(tag))
    })

    return Array.from(tagSet).sort()
  }

  /**
   * 搜索收藏
   */
  public searchBookmarks(keyword: string): BookmarkItem[] {
    const lower = keyword.toLowerCase()
    return this.getBookmarks().filter(
      (b) =>
        b.title.toLowerCase().includes(lower) ||
        b.content.toLowerCase().includes(lower) ||
        b.tags.some((tag) => tag.toLowerCase().includes(lower)) ||
        b.note.toLowerCase().includes(lower),
    )
  }

  /**
   * 清除所有收藏
   */
  public async clearBookmarks(): Promise<void> {
    await this._saveBookmarks([])
  }

  /**
   * 生成唯一 ID
   */
  private _generateId(): string {
    return `bookmark_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 保存收藏列表
   */
  private async _saveBookmarks(bookmarks: BookmarkItem[]): Promise<void> {
    await this._context.globalState.update('bookmarks', bookmarks)
  }
}