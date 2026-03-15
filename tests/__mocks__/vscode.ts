import { vi } from 'vitest'

// Mock vscode module
vi.mock('vscode', () => ({
  window: {
    activeTextEditor: undefined,
    showInputBox: vi.fn(),
    showQuickPick: vi.fn(),
    showWarningMessage: vi.fn(),
    showInformationMessage: vi.fn(),
    showErrorMessage: vi.fn(),
    createQuickPick: vi.fn(),
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
  },
  Uri: {
    parse: vi.fn((s: string) => ({ toString: () => s })),
    joinPath: vi.fn(),
  },
  QuickPickItemKind: {
    Separator: 2,
  },
  ThemeIcon: vi.fn(),
  ColorThemeKind: {
    Light: 1,
    Dark: 2,
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
