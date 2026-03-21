import { vi } from 'vitest'

// ==================== Mock QuickPick 工厂函数（必须在 vi.mock 之前定义）====================

/**
 * 创建 Mock QuickPick 实例
 * 用于模拟 vscode.window.createQuickPick() 返回的对象
 */
export function createMockQuickPick() {
  const eventHandlers: {
    onDidTriggerItemButton: Array<
      (e: { item: any; button: any }) => void | Promise<void>
    >
    onDidAccept: Array<() => void | Promise<void>>
    onDidHide: Array<() => void | Promise<void>>
  } = {
    onDidTriggerItemButton: [],
    onDidAccept: [],
    onDidHide: [],
  }

  const mockQuickPick = {
    items: [] as any[],
    selectedItems: [] as any[],
    placeholder: '',
    value: '',
    visible: false,

    // 事件注册方法
    onDidTriggerItemButton: vi.fn((handler) => {
      eventHandlers.onDidTriggerItemButton.push(handler)
      return { dispose: vi.fn() }
    }),
    onDidAccept: vi.fn((handler) => {
      eventHandlers.onDidAccept.push(handler)
      return { dispose: vi.fn() }
    }),
    onDidHide: vi.fn((handler) => {
      eventHandlers.onDidHide.push(handler)
      return { dispose: vi.fn() }
    }),

    // 控制方法
    show: vi.fn(() => {
      mockQuickPick.visible = true
    }),
    hide: vi.fn(() => {
      mockQuickPick.visible = false
      // 触发 hide 事件
      eventHandlers.onDidHide.forEach((h) => h())
    }),
    dispose: vi.fn(),

    // 测试辅助方法：触发事件
    _triggerItemButton: async (item: any, button: any) => {
      for (const handler of eventHandlers.onDidTriggerItemButton) {
        await handler({ item, button })
      }
    },
    _triggerAccept: async () => {
      for (const handler of eventHandlers.onDidAccept) {
        await handler()
      }
    },
    _triggerHide: async () => {
      for (const handler of eventHandlers.onDidHide) {
        await handler()
      }
    },
  }

  return mockQuickPick
}

// 用于存储当前 mock QuickPick 实例，方便测试中访问
let currentMockQuickPick: ReturnType<typeof createMockQuickPick> | null = null

export function getCurrentMockQuickPick() {
  return currentMockQuickPick
}

export function resetMockQuickPick() {
  currentMockQuickPick = null
}

export function setMockQuickPick(mock: ReturnType<typeof createMockQuickPick>) {
  currentMockQuickPick = mock
}

// Mock vscode module
vi.mock('vscode', () => ({
  window: {
    activeTextEditor: undefined,
    showInputBox: vi.fn(),
    showQuickPick: vi.fn(),
    showWarningMessage: vi.fn(),
    showInformationMessage: vi.fn(),
    showErrorMessage: vi.fn(),
    createQuickPick: vi.fn(() => {
      currentMockQuickPick = createMockQuickPick()
      return currentMockQuickPick
    }),
    onDidChangeActiveColorTheme: vi.fn(() => ({ dispose: vi.fn() })),
    activeColorTheme: { kind: 1 },
  },
  workspace: {
    getConfiguration: vi.fn(() => ({
      get: vi.fn(),
      update: vi.fn(),
    })),
    onDidChangeConfiguration: vi.fn(() => ({ dispose: vi.fn() })),
  },
  commands: {
    registerCommand: vi.fn(),
    executeCommand: vi.fn(),
  },
  env: {
    clipboard: {
      writeText: vi.fn(),
    },
    openExternal: vi.fn(),
    language: 'en',
  },
  Uri: {
    parse: vi.fn((s: string) => ({ toString: () => s, fsPath: s })),
    joinPath: vi.fn(),
  },
  QuickPickItemKind: {
    Separator: -1,
  },
  ThemeIcon: class ThemeIcon {
    constructor(public id: string) {}
  },
  ColorThemeKind: {
    Light: 1,
    Dark: 2,
  },
  ConfigurationTarget: {
    Global: 1,
    Workspace: 2,
    WorkspaceFolder: 3,
  },
  CancellationToken: {},
  SecretStorage: {},
}))

/**
 * 创建 Mock SecretStorage
 */
export function createMockSecretStorage() {
  const store: Map<string, string> = new Map()
  return {
    get: vi.fn((key: string) => Promise.resolve(store.get(key))),
    store: vi.fn((key: string, value: string) => {
      store.set(key, value)
      return Promise.resolve()
    }),
    delete: vi.fn((key: string) => {
      store.delete(key)
      return Promise.resolve()
    }),
    onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
    keys: vi.fn(() => Array.from(store.keys())),
  } as any
}

/**
 * 创建 Mock Memento (用于 globalState)
 */
export function createMockMemento() {
  const store = new Map<string, unknown>()
  return {
    get: vi.fn(<T>(key: string, defaultValue?: T): T => {
      return store.has(key) ? (store.get(key) as T) : (defaultValue as T)
    }),
    update: vi.fn((key: string, value: unknown) => {
      store.set(key, value)
      return Promise.resolve()
    }),
    keys: vi.fn(() => Array.from(store.keys())),
  } as const
}

/**
 * 创建 Mock MessageItem
 */
export function createMockMessageItem(title: string): { title: string } {
  return { title }
}
