import type { SearchResult } from './SearchService'

/**
 * 缓存条目
 */
interface CacheEntry {
  results: SearchResult[]
  timestamp: number
}

/**
 * 搜索结果缓存
 * 提供内存缓存，避免重复请求相同的搜索
 */
export class SearchCache {
  private cache = new Map<string, CacheEntry>()
  private readonly ttl: number

  /**
   * @param ttl 缓存过期时间（毫秒），默认 30 分钟
   */
  constructor(ttl: number = 30 * 60 * 1000) {
    this.ttl = ttl
  }

  /**
   * 生成缓存键
   */
  getKey(libraryId: string, query: string): string {
    return `${libraryId}:${query.toLowerCase().trim()}`
  }

  /**
   * 获取缓存的搜索结果
   * @returns 缓存结果，如果不存在或已过期则返回 null
   */
  get(libraryId: string, query: string): SearchResult[] | null {
    const key = this.getKey(libraryId, query)
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    // 检查是否过期
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.results
  }

  /**
   * 存储搜索结果到缓存
   */
  set(libraryId: string, query: string, results: SearchResult[]): void {
    const key = this.getKey(libraryId, query)
    this.cache.set(key, {
      results,
      timestamp: Date.now(),
    })
  }

  /**
   * 清除所有缓存
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * 删除特定搜索的缓存
   */
  delete(libraryId: string, query: string): boolean {
    const key = this.getKey(libraryId, query)
    return this.cache.delete(key)
  }

  /**
   * 获取缓存大小
   */
  get size(): number {
    return this.cache.size
  }
}
