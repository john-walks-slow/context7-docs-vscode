import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SearchCache } from '../src/services/SearchCache'
import type { SearchResult } from '../src/services/SearchService'

describe('SearchCache', () => {
  let cache: SearchCache

  const mockResults: SearchResult[] = [
    {
      type: 'code',
      title: 'Test Code',
      content: 'Test description',
      code: 'console.log("test")',
      language: 'javascript',
      highlightedCode: '<pre>console.log("test")</pre>',
    },
    {
      type: 'info',
      title: 'Test Info',
      content: 'This is a test info snippet',
    },
  ]

  beforeEach(() => {
    cache = new SearchCache()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getKey', () => {
    it('should generate consistent cache key', () => {
      const key1 = cache.getKey('/facebook/react', 'useState')
      const key2 = cache.getKey('/facebook/react', 'useState')
      expect(key1).toBe(key2)
    })

    it('should normalize query to lowercase', () => {
      const key1 = cache.getKey('/facebook/react', 'useState')
      const key2 = cache.getKey('/facebook/react', 'USESTATE')
      expect(key1).toBe(key2)
    })

    it('should trim whitespace from query', () => {
      const key1 = cache.getKey('/facebook/react', 'useState')
      const key2 = cache.getKey('/facebook/react', '  useState  ')
      expect(key1).toBe(key2)
    })
  })

  describe('set and get', () => {
    it('should store and retrieve results', () => {
      cache.set('/facebook/react', 'useState', mockResults)
      const results = cache.get('/facebook/react', 'useState')
      expect(results).toEqual(mockResults)
    })

    it('should return null for non-existent cache entry', () => {
      const results = cache.get('/facebook/react', 'nonexistent')
      expect(results).toBeNull()
    })

    it('should return null for expired cache entry', () => {
      const shortTtlCache = new SearchCache(1000) // 1 second TTL
      shortTtlCache.set('/facebook/react', 'useState', mockResults)

      // Advance time past TTL
      vi.advanceTimersByTime(1500)

      const results = shortTtlCache.get('/facebook/react', 'useState')
      expect(results).toBeNull()
    })

    it('should return results for non-expired cache entry', () => {
      const shortTtlCache = new SearchCache(5000) // 5 second TTL
      shortTtlCache.set('/facebook/react', 'useState', mockResults)

      // Advance time but not past TTL
      vi.advanceTimersByTime(3000)

      const results = shortTtlCache.get('/facebook/react', 'useState')
      expect(results).toEqual(mockResults)
    })

    it('should remove expired entry from cache', () => {
      const shortTtlCache = new SearchCache(1000)
      shortTtlCache.set('/facebook/react', 'useState', mockResults)

      expect(shortTtlCache.size).toBe(1)

      vi.advanceTimersByTime(1500)

      shortTtlCache.get('/facebook/react', 'useState')
      expect(shortTtlCache.size).toBe(0)
    })
  })

  describe('clear', () => {
    it('should clear all cache entries', () => {
      cache.set('/facebook/react', 'useState', mockResults)
      cache.set('/vercel/next.js', 'routing', mockResults)

      expect(cache.size).toBe(2)

      cache.clear()

      expect(cache.size).toBe(0)
      expect(cache.get('/facebook/react', 'useState')).toBeNull()
      expect(cache.get('/vercel/next.js', 'routing')).toBeNull()
    })
  })

  describe('size', () => {
    it('should return correct cache size', () => {
      expect(cache.size).toBe(0)

      cache.set('/facebook/react', 'useState', mockResults)
      expect(cache.size).toBe(1)

      cache.set('/vercel/next.js', 'routing', mockResults)
      expect(cache.size).toBe(2)
    })

    it('should not increase size when overwriting existing key', () => {
      cache.set('/facebook/react', 'useState', mockResults)
      cache.set('/facebook/react', 'useState', mockResults)
      expect(cache.size).toBe(1)
    })
  })
})
