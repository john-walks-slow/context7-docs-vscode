import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BookmarkService, type BookmarkItem } from '../src/services/BookmarkService'

// Mock VS Code extension context
const mockContext = {
  globalState: {
    get: vi.fn(),
    update: vi.fn(),
  },
}

describe('BookmarkService', () => {
  let bookmarkService: BookmarkService

  beforeEach(() => {
    vi.clearAllMocks()
    bookmarkService = new BookmarkService(mockContext as any)
  })

  describe('getBookmarks', () => {
    it('should return empty array when no bookmarks exist', () => {
      mockContext.globalState.get.mockReturnValue([])
      expect(bookmarkService.getBookmarks()).toEqual([])
    })

    it('should return stored bookmarks', () => {
      const mockBookmarks: BookmarkItem[] = [
        {
          id: 'bookmark_1',
          libraryId: '/facebook/react',
          libraryName: 'React',
          query: 'useState',
          title: 'useState hook',
          content: 'Hook for state management',
          tags: ['hooks', 'state'],
          note: 'Important hook',
          timestamp: Date.now(),
        },
      ]
      mockContext.globalState.get.mockReturnValue(mockBookmarks)
      expect(bookmarkService.getBookmarks()).toEqual(mockBookmarks)
    })
  })

  describe('addBookmark', () => {
    it('should add new bookmark with generated ID', async () => {
      mockContext.globalState.get.mockReturnValue([])

      const id = await bookmarkService.addBookmark({
        libraryId: '/facebook/react',
        libraryName: 'React',
        query: 'useState',
        title: 'useState hook',
        content: 'Hook for state management',
        tags: ['hooks'],
        note: '',
      })

      expect(id).toMatch(/^bookmark_/)
      expect(mockContext.globalState.update).toHaveBeenCalled()
    })

    it('should add bookmark to the beginning of list', async () => {
      const existingBookmark: BookmarkItem = {
        id: 'bookmark_old',
        libraryId: '/vuejs/vue',
        libraryName: 'Vue',
        query: 'ref',
        title: 'ref function',
        content: 'Reactive reference',
        tags: [],
        note: '',
        timestamp: Date.now() - 1000,
      }
      mockContext.globalState.get.mockReturnValue([existingBookmark])

      await bookmarkService.addBookmark({
        libraryId: '/facebook/react',
        libraryName: 'React',
        query: 'useState',
        title: 'useState',
        content: '',
        tags: [],
        note: '',
      })

      const updateCall = mockContext.globalState.update.mock.calls[0]
      expect(updateCall[1][0].libraryId).toBe('/facebook/react')
    })
  })

  describe('updateBookmark', () => {
    it('should update bookmark fields', async () => {
      const bookmark: BookmarkItem = {
        id: 'bookmark_1',
        libraryId: '/facebook/react',
        libraryName: 'React',
        query: 'useState',
        title: 'Old title',
        content: 'Old content',
        tags: [],
        note: '',
        timestamp: Date.now(),
      }
      mockContext.globalState.get.mockReturnValue([bookmark])

      await bookmarkService.updateBookmark('bookmark_1', {
        title: 'New title',
        note: 'Updated note',
      })

      const updateCall = mockContext.globalState.update.mock.calls[0]
      expect(updateCall[1][0].title).toBe('New title')
      expect(updateCall[1][0].note).toBe('Updated note')
    })
  })

  describe('removeBookmark', () => {
    it('should remove bookmark by ID', async () => {
      const bookmarks: BookmarkItem[] = [
        {
          id: 'bookmark_1',
          libraryId: '/facebook/react',
          libraryName: 'React',
          query: 'useState',
          title: 'useState',
          content: '',
          tags: [],
          note: '',
          timestamp: Date.now(),
        },
        {
          id: 'bookmark_2',
          libraryId: '/vuejs/vue',
          libraryName: 'Vue',
          query: 'ref',
          title: 'ref',
          content: '',
          tags: [],
          note: '',
          timestamp: Date.now(),
        },
      ]
      mockContext.globalState.get.mockReturnValue(bookmarks)

      await bookmarkService.removeBookmark('bookmark_1')

      const updateCall = mockContext.globalState.update.mock.calls[0]
      expect(updateCall[1]).toHaveLength(1)
      expect(updateCall[1][0].id).toBe('bookmark_2')
    })
  })

  describe('getBookmarksByTag', () => {
    it('should filter bookmarks by tag', () => {
      const bookmarks: BookmarkItem[] = [
        {
          id: 'bookmark_1',
          libraryId: '/facebook/react',
          libraryName: 'React',
          query: 'useState',
          title: 'useState',
          content: '',
          tags: ['hooks', 'state'],
          note: '',
          timestamp: Date.now(),
        },
        {
          id: 'bookmark_2',
          libraryId: '/vuejs/vue',
          libraryName: 'Vue',
          query: 'ref',
          title: 'ref',
          content: '',
          tags: ['reactivity'],
          note: '',
          timestamp: Date.now(),
        },
      ]
      mockContext.globalState.get.mockReturnValue(bookmarks)

      const result = bookmarkService.getBookmarksByTag('hooks')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('bookmark_1')
    })
  })

  describe('getAllTags', () => {
    it('should return unique sorted tags', () => {
      const bookmarks: BookmarkItem[] = [
        {
          id: 'bookmark_1',
          libraryId: '/react',
          libraryName: 'React',
          query: 'q1',
          title: 't1',
          content: '',
          tags: ['hooks', 'state'],
          note: '',
          timestamp: Date.now(),
        },
        {
          id: 'bookmark_2',
          libraryId: '/vue',
          libraryName: 'Vue',
          query: 'q2',
          title: 't2',
          content: '',
          tags: ['reactivity', 'hooks'],
          note: '',
          timestamp: Date.now(),
        },
      ]
      mockContext.globalState.get.mockReturnValue(bookmarks)

      const tags = bookmarkService.getAllTags()
      expect(tags).toEqual(['hooks', 'reactivity', 'state'])
    })
  })

  describe('searchBookmarks', () => {
    it('should search bookmarks by keyword', () => {
      const bookmarks: BookmarkItem[] = [
        {
          id: 'bookmark_1',
          libraryId: '/react',
          libraryName: 'React',
          query: 'useState',
          title: 'useState hook',
          content: 'State management hook',
          tags: ['hooks'],
          note: '',
          timestamp: Date.now(),
        },
        {
          id: 'bookmark_2',
          libraryId: '/vue',
          libraryName: 'Vue',
          query: 'ref',
          title: 'ref function',
          content: 'Reactive reference',
          tags: [],
          note: '',
          timestamp: Date.now(),
        },
      ]
      mockContext.globalState.get.mockReturnValue(bookmarks)

      const result = bookmarkService.searchBookmarks('state')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('bookmark_1')
    })

    it('should search in tags and notes', () => {
      const bookmarks: BookmarkItem[] = [
        {
          id: 'bookmark_1',
          libraryId: '/react',
          libraryName: 'React',
          query: 'q',
          title: 'Title',
          content: '',
          tags: ['important'],
          note: 'Remember this',
          timestamp: Date.now(),
        },
      ]
      mockContext.globalState.get.mockReturnValue(bookmarks)

      const result = bookmarkService.searchBookmarks('important')
      expect(result).toHaveLength(1)

      const result2 = bookmarkService.searchBookmarks('remember')
      expect(result2).toHaveLength(1)
    })
  })
})