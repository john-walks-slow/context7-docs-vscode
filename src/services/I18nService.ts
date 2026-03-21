import * as vscode from 'vscode'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * 国际化服务
 * 负责加载和管理多语言翻译
 */
export class I18nService {
  private _translations: Record<string, string> = {}
  private _locale: string
  private static _instance: I18nService | null = null

  constructor(context: vscode.ExtensionContext) {
    // 获取 VS Code 当前的语言设置
    this._locale = vscode.env.language || 'en'
    this._loadTranslations(context)
    I18nService._instance = this
  }

  /**
   * 获取全局实例
   */
  public static get instance(): I18nService {
    if (!I18nService._instance) {
      throw new Error('I18nService not initialized. Call constructor first.')
    }
    return I18nService._instance
  }

  /**
   * 加载翻译文件
   */
  private _loadTranslations(context: vscode.ExtensionContext): void {
    try {
      // 尝试加载对应语言的翻译文件
      let localeFile = join(
        context.extensionPath,
        'locales',
        `${this._locale}.json`,
      )

      // 如果对应语言的翻译文件不存在，尝试加载基础语言版本
      // 例如：zh-cn.json 不存在时尝试加载 zh.json
      try {
        require.resolve(localeFile)
      } catch {
        const baseLocale = this._locale.split('-')[0]
        localeFile = join(
          context.extensionPath,
          'locales',
          `${baseLocale}.json`,
        )
        try {
          require.resolve(localeFile)
          this._locale = baseLocale
        } catch {
          // 如果还是找不到，回退到英文
          localeFile = join(context.extensionPath, 'locales', 'en.json')
          this._locale = 'en'
        }
      }

      const content = readFileSync(localeFile, 'utf-8')
      this._translations = JSON.parse(content)
    } catch (error) {
      console.error('Failed to load translations:', error)
      this._translations = {}
    }
  }

  /**
   * 获取翻译文本
   * @param key 翻译键，例如 "message.apiKeySaved"
   * @param args 可选的插值参数，例如 { name: "axios" }
   * @returns 翻译后的文本
   */
  public t(key: string, args?: Record<string, string | number>): string {
    let text = this._translations[key] || key

    // 如果提供了插值参数，替换占位符
    if (args) {
      for (const [argKey, argValue] of Object.entries(args)) {
        text = text.replace(
          new RegExp(`\\{${argKey}\\}`, 'g'),
          String(argValue),
        )
      }
    }

    return text
  }

  /**
   * 获取当前语言
   */
  public get locale(): string {
    return this._locale
  }
}

/**
 * 全局翻译函数
 * @param key 翻译键
 * @param args 插值参数
 */
export function t(key: string, args?: Record<string, string | number>): string {
  return I18nService.instance.t(key, args)
}
