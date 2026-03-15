import * as vscode from 'vscode'
import { Context7Client } from './api/context7'
import { DocSearchViewProvider } from './providers/DocSearchViewProvider'

export function activate(context: vscode.ExtensionContext) {
  const client = new Context7Client(context.secrets)
  const viewProvider = new DocSearchViewProvider(context, client)

  // 注册 Sidebar Webview View
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      DocSearchViewProvider.viewType,
      viewProvider,
    ),
  )

  // 注册搜索命令
  context.subscriptions.push(
    vscode.commands.registerCommand('context7.search', () => {
      viewProvider.showLibraryPicker()
    }),
  )

  // 注册库管理命令
  context.subscriptions.push(
    vscode.commands.registerCommand('context7.manageLibraries', () => {
      viewProvider.manageLibraries()
    }),
  )

  // 注册选中搜索命令
  context.subscriptions.push(
    vscode.commands.registerCommand('context7.searchSelection', () => {
      viewProvider.searchSelection()
    }),
  )

  // 注册配置 API Key 命令
  context.subscriptions.push(
    vscode.commands.registerCommand('context7.configureApiKey', async () => {
      const apiKey = await vscode.window.showInputBox({
        prompt: 'Enter Context7 API Key',
        password: true,
      })

      if (apiKey) {
        await client.setApiKey(apiKey)
        vscode.window.showInformationMessage('Context7 API Key saved securely')
      }
    }),
  )
}

export function deactivate() {}
