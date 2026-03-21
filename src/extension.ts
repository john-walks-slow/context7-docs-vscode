import * as vscode from 'vscode'
import { Context7Client } from './api/context7'
import { LibraryService } from './services/LibraryService'
import { DocSearchViewProvider } from './providers/DocSearchViewProvider'
import { I18nService } from './services/I18nService'

export async function activate(context: vscode.ExtensionContext) {
  // 初始化国际化服务
  const i18n = new I18nService(context)

  const client = new Context7Client(context.secrets)
  const libraryService = new LibraryService(context, client)

  const viewProvider = new DocSearchViewProvider(
    context,
    client,
    libraryService,
  )

  // 注册 Sidebar Webview View
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      DocSearchViewProvider.viewType,
      viewProvider,
      { webviewOptions: { retainContextWhenHidden: true } },
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
        prompt: i18n.t('placeholder.enterApiKey'),
        password: true,
      })

      if (apiKey) {
        await client.setApiKey(apiKey)
        vscode.window.showInformationMessage(i18n.t('message.apiKeySaved'))
      }
    }),
  )

  // 注册查看历史命令
  context.subscriptions.push(
    vscode.commands.registerCommand('context7.viewHistory', () => {
      viewProvider.showHistory()
    }),
  )
}

export function deactivate() {}
