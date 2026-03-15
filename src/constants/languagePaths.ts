/**
 * 语言路径配置
 * 用于从定义文件路径提取库名
 */

export interface PathPattern {
  /** 语言 ID 列表 */
  languages: string[]
  /** 路径匹配模式 */
  pattern: RegExp
}

/**
 * 各语言的依赖路径模式
 *
 * 设计原则：宽松优先，确保能匹配到内容用于搜索，而非精确剔除版本号。
 * 注意：模式按顺序匹配，越具体的模式应放在越前面。
 */
export const PATH_PATTERNS: PathPattern[] = [
  // Node.js/JavaScript/TypeScript/Vue
  // 注意：@types/ 模式必须放在前面，优先匹配
  {
    languages: [
      'javascript',
      'typescript',
      'javascriptreact',
      'typescriptreact',
      'vue',
    ],
    // @types/xxx → 捕获 xxx（去掉 @types/ 前缀）
    pattern: /.*node_modules\/@types\/([^/]+)/,
  },
  {
    languages: [
      'javascript',
      'typescript',
      'javascriptreact',
      'typescriptreact',
      'vue',
    ],
    // 其他情况：@scope/package 或 package
    pattern: /.*node_modules\/(@[^/]+\/[^/]+|[^/]+)/,
  },

  // Python (pip, poetry, conda, virtualenv)
  {
    languages: ['python'],
    pattern: /site-packages\/([^/]+)/,
  },

  // Go (modules cache: $GOPATH/pkg/mod/{module-path}@{version})
  {
    languages: ['go'],
    pattern: /pkg\/mod\/(.+)@/,
  },

  // Rust (Cargo registry: {crate-name}-{version})
  {
    languages: ['rust'],
    pattern: /registry\/src\/[^/]+\/(.+)-\d+\.\d+/,
  },

  // Java (Maven local repository)
  {
    languages: ['java'],
    pattern: /\.m2\/repository\/(.+\/[^/]+)\/\d/,
  },

  // Java (Gradle cache)
  {
    languages: ['java'],
    pattern: /\.gradle\/caches\/modules-\d+\/files-\d+\.\d+\/([^/]+\/[^/]+)/,
  },

  // C# (NuGet)
  {
    languages: ['csharp'],
    pattern: /[/\\](?:\.nuget\/packages|packages)[/\\]([^/\\]+)/,
  },

  // Ruby (rbenv, rvm, chruby, user gems)
  {
    languages: ['ruby'],
    pattern: /.*gems\/(.+)-\d+\.\d+/,
  },

  // PHP (Composer)
  {
    languages: ['php'],
    pattern: /vendor\/([^/]+\/[^/]+)/,
  },

  // Dart/Flutter (Unix & Windows)
  {
    languages: ['dart'],
    pattern: /(?:\.pub-cache|Pub\/Cache)\/hosted\/[^/]+\/(.+)-\d+\.\d+/,
  },
]

/**
 * 从文件路径提取库名
 * @param filePath 文件路径
 * @param languageId 可选的语言 ID，用于过滤匹配的模式
 */
export function extractLibraryFromPath(
  filePath: string,
  languageId?: string,
): string | null {
  const normalized = filePath.replace(/\\/g, '/')

  // 按语言过滤模式
  const patterns = languageId
    ? PATH_PATTERNS.filter((p) => p.languages.includes(languageId))
    : PATH_PATTERNS

  for (const { pattern } of patterns) {
    const match = normalized.match(pattern)
    if (match) {
      return match[1]
    }
  }

  return null
}
