import * as vscode from 'vscode'
import { COMMON_LIBRARIES, type LibraryItem } from '../constants/libraries'

/**
 * 智能推荐服务
 * 基于当前文件语言推荐相关库
 */
export class RecommendService {
  // 语言到库的映射关系
  private readonly _languageLibraryMap: Map<string, string[]> = new Map([
    // JavaScript/TypeScript
    ['javascript', ['react', 'vue', 'svelte', 'next.js', 'node', 'express', 'lodash', 'axios']],
    ['typescript', ['react', 'vue', 'svelte', 'next.js', 'node', 'express', 'lodash', 'axios', 'zod']],
    ['javascriptreact', ['react', 'react-dom', 'react-router', 'redux', 'zustand']],
    ['typescriptreact', ['react', 'react-dom', 'react-router', 'redux', 'zustand']],

    // 前端框架
    ['vue', ['vue', 'vue-router', 'pinia', 'vuex', 'vite']],
    ['svelte', ['svelte', 'svelte-kit']],

    // CSS
    ['css', ['tailwindcss', 'styled-components', 'emotion']],
    ['scss', ['tailwindcss', 'styled-components', 'emotion']],

    // Python
    ['python', ['python', 'django', 'flask', 'fastapi', 'numpy', 'pandas', 'tensorflow', 'pytorch']],

    // Go
    ['go', ['go', 'gin', 'echo', 'gorm', 'fiber']],

    // Rust
    ['rust', ['rust', 'tokio', 'actix', 'serde', 'axum']],

    // Java
    ['java', ['java', 'spring', 'spring-boot', 'hibernate', 'guava']],

    // C/C++
    ['c', ['c', 'glib', 'openssl']],
    ['cpp', ['cpp', 'stl', 'boost', 'opencv']],

    // Ruby
    ['ruby', ['ruby', 'rails', 'sinatra', 'active-record']],

    // PHP
    ['php', ['php', 'laravel', 'symfony', 'doctrine']],

    // Swift
    ['swift', ['swift', 'swiftui', 'uikit', 'alamofire']],

    // Kotlin
    ['kotlin', ['kotlin', 'ktor', 'android']],

    // Dart/Flutter
    ['dart', ['dart', 'flutter', 'riverpod']],

    // Database
    ['sql', ['postgresql', 'mysql', 'mongodb', 'redis']],

    // Markup
    ['html', ['html', 'dom', 'tailwindcss']],
    ['markdown', ['markdown', 'mdx']],

    // Config
    ['json', ['json', 'ajv']],
    ['yaml', ['yaml', 'yml']],
  ])

  /**
   * 根据当前文件语言获取推荐的库
   */
  public getRecommendedLibraries(): string[] {
    const editor = vscode.window.activeTextEditor
    if (!editor) return []

    const languageId = editor.document.languageId
    return this._languageLibraryMap.get(languageId) || []
  }

  /**
   * 获取推荐的库详情（从 COMMON_LIBRARIES 匹配）
   */
  public getRecommendedLibraryItems(): LibraryItem[] {
    const recommended = this.getRecommendedLibraries()
    const result: LibraryItem[] = []

    for (const libName of recommended) {
      const found = COMMON_LIBRARIES.find(
        (lib) =>
          lib.name.toLowerCase() === libName.toLowerCase() ||
          lib.id.toLowerCase().includes(libName.toLowerCase()),
      )
      if (found) {
        result.push(found)
      }
    }

    return result
  }

  /**
   * 检测当前语言是否在支持列表中
   */
  public isLanguageSupported(languageId?: string): boolean {
    const lang = languageId || vscode.window.activeTextEditor?.document.languageId
    return lang ? this._languageLibraryMap.has(lang) : false
  }

  /**
   * 获取所有支持的语言列表
   */
  public getSupportedLanguages(): string[] {
    return Array.from(this._languageLibraryMap.keys())
  }

  /**
   * 获取当前文件的库名称（用于搜索提示）
   */
  public getCurrentLanguageDisplayName(): string | undefined {
    const editor = vscode.window.activeTextEditor
    if (!editor) return undefined

    const languageId = editor.document.languageId
    const displayNames: Record<string, string> = {
      javascript: 'JavaScript',
      typescript: 'TypeScript',
      javascriptreact: 'JSX',
      typescriptreact: 'TSX',
      python: 'Python',
      go: 'Go',
      rust: 'Rust',
      java: 'Java',
      cpp: 'C++',
      c: 'C',
      ruby: 'Ruby',
      php: 'PHP',
      swift: 'Swift',
      kotlin: 'Kotlin',
      dart: 'Dart',
      vue: 'Vue',
      svelte: 'Svelte',
    }

    return displayNames[languageId] || languageId.toUpperCase()
  }
}