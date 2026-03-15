import { describe, it, expect, beforeEach, vi } from 'vitest'
import { HistoryService, type SearchHistoryItem } from '../src/services/HistoryService'

// Mock VS Code extension context
const mockContext = {
  globalState: {
    get: vi.fn(),
    update: vi.fn(),
  },
}

describe('HistoryService', () => {
  let historyService: HistoryService

  beforeEach(() => {
    vi.clearAllMocks()
    historyService = new HistoryService(mockContext as any)
  })

  describe('getHistory', () => {
    it('should return empty array when no history exists', () => {
      mockContext.globalState.get.mockReturnValue([])
      expect(historyService.getHistory()).toEqual([])
    })

    it('should return stored history items', () => {
      const mockHistory: SearchHistoryItem[] = [
        {
          libraryId: '/facebook/react',
          libraryName: 'React',
          query: 'useState',
          timestamp: Date.now(),
        },
      ]
      mockContext.globalState.get.mockReturnValue(mockHistory)
      expect(historyService.getHistory()).toEqual(mockHistory)
    })
  })

  describe('addHistory', () => {
    it('should add new history item', async () => {
      mockContext.globalState.get.mockReturnValue([])
      await historyService.addHistory('/facebook/react', 'React', 'useState')

      expect(mockContext.globalState.update).toHaveBeenCalledWith(
        'searchHistory',
        expect.arrayContaining([
          expect.objectContaining({
            libraryId: '/facebook/react',
            libraryName: 'React',
            query: 'useState',
          }),
        ]),
      )
    })

    it('should move duplicate item to the beginning', async () => {
      const existingItem: SearchHistoryItem = {
        libraryId: '/facebook/react',
        libraryName: 'React',
        query: 'useState',
        timestamp: Date.now() - 1000,
      }
      mockContext.globalState.get.mockReturnValue([existingItem])

      await historyService.addHistory('/facebook/react', 'React', 'useState')

      expect(mockContext.globalState.update).toHaveBeenCalledWith(
        'searchHistory',
        expect.arrayContaining([
          expect.objectContaining({
            libraryId: '/facebook/react',
            query: 'useState',
          }),
        ]),
      )
    })

    it('should limit history to 50 items', async () => {
      const largeHistory: SearchHistoryItem[] = Array.from({ length: 60 }, (_, i) => ({
        libraryId: `/lib${i}`,
        libraryName: `Lib${i}`,
        query: `query${i}`,
        timestamp: Date.now() - i,
      }))
      mockContext.globalState.get.mockReturnValue(largeHistory)

      await historyService.addHistory('/new/lib', 'NewLib', 'newQuery')

      const updateCall = mockContext.globalState.update.mock.calls[0]
      expect(updateCall[1].length).toBeLessThanOrEqual(50)
    })
  })

  describe('clearHistory', () => {
    it('should clear all history', async () => {
      await historyService.clearHistory()
      expect(mockContext.globalState.update).toHaveBeenCalledWith(
        'searchHistory',
        [],
      )
    })
  })

  describe('removeHistoryItem', () => {
    it('should remove specific history item', async () => {
      const history: SearchHistoryItem[] = [
        {
          libraryId: '/facebook/react',
          libraryName: 'React',
          query: 'useState',
          timestamp: Date.now(),
        },
        {
          libraryId: '/vuejs/vue',
          libraryName: 'Vue',
          query: 'ref',
          timestamp: Date.now(),
        },
      ]
      mockContext.globalState.get.mockReturnValue(history)

      await historyService.removeHistoryItem('/facebook/react', 'useState')

      expect(mockContext.globalState.update).toHaveBeenCalledWith(
        'searchHistory',
        expect.arrayContaining([
          expect.objectContaining({ libraryId: '/vuejs/vue' }),
        ]),
      )
    })
  })

  describe('getRecentLibraries', () => {
    it('should return unique recent libraries', () => {
      const history: SearchHistoryItem[] = [
        {
          libraryId: '/facebook/react',
          libraryName: 'React',
          query: 'useState',
          timestamp: Date.now(),
        },
        {
          libraryId: '/facebook/react',
          libraryName: 'React',
          query: 'useEffect',
          timestamp: Date.now(),
        },
        {
          libraryId: '/vuejs/vue',
          libraryName: 'Vue',
          query: 'ref',
          timestamp: Date.now(),
        },
      ]
      mockContext.globalState.get.mockReturnValue(history)

      const recent = historyService.getRecentLibraries()
      expect(recent).toHaveLength(2)
      expect(recent[0].libraryId).toBe('/facebook/react')
    })
  })
})