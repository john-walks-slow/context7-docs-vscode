import * as vscode from 'vscode'

/**
 * 语言路径配置
 * 用于从定义文件路径提取库名
 */

// ============ 语言生态常量 ============
/** JavaScript/TypeScript 生态（共享 node_modules 包管理） */
const JS_TS_ECOSYSTEM = [
  'javascript',
  'typescript',
  'javascriptreact',
  'typescriptreact',
  'vue',
] as const

// ============ 类型定义 ============

/** 原始路径模式配置（用于 settings.json 序列化） */
interface RawPathPattern {
  languages: string[]
  pattern: string
}

export interface PathPattern {
  /** 语言 ID 列表 */
  languages: string[]
  /** 路径匹配模式 */
  pattern: RegExp
}

/** 标准库路径检测模式 */
interface StdlibPattern {
  /** 语言 ID（单个或多个） */
  languageId: string | readonly string[]
  /** 路径匹配模式 */
  pattern: RegExp
  /** 匹配后返回的标准库标识（用于查找 STANDARD_LIBRARIES） */
  stdlibName: string
}

// ============ 默认路径模式 ============
/**
 * 默认路径模式（与 package.json 中的默认值同步）
 *
 * 每个模式包含：
 * - languages: 适用的语言 ID 列表
 * - pattern: 正则表达式，第一个捕获组提取库名
 */
const DEFAULT_PATH_PATTERNS: RawPathPattern[] = [
  // JavaScript/TypeScript 生态
  {
    languages: [...JS_TS_ECOSYSTEM],
    // 匹配: node_modules/@types/lodash -> lodash
    pattern: '.*node_modules/@types/([^/]+)',
  },
  {
    languages: [...JS_TS_ECOSYSTEM],
    // 匹配: node_modules/@babel/core -> @babel/core, node_modules/lodash -> lodash
    pattern: '.*node_modules/(@[^/]+/[^/]+|[^/]+)',
  },
  // Python
  {
    languages: ['python'],
    // 匹配: site-packages/requests -> requests
    pattern: '.*site-packages/([^/]+)',
  },
  // Go
  {
    languages: ['go'],
    // 匹配: pkg/mod/github.com/gin-gonic/gin@v1.9.0 -> github.com/gin-gonic/gin
    pattern: '.*pkg/mod/(.+)@',
  },
  // Rust
  {
    languages: ['rust'],
    // 匹配: registry/src/index.crates.io-6f17d22bba15001f/serde-1.0.188 -> serde
    pattern: '.*registry/src/[^/]+/(.+)-\\d+\\.\\d+',
  },
  // Java - Maven
  {
    languages: ['java'],
    // 匹配: .m2/repository/org/springframework/spring-core/5.3.0 -> org/springframework/spring-core
    pattern: '.*\\.m2/repository/(.+/[^/]+)/\\d',
  },
  // Java - Gradle
  {
    languages: ['java'],
    // 匹配: .gradle/caches/modules-2/files-2.1/org.springframework/spring-core -> org/springframework/spring-core
    pattern: '.*\\.gradle/caches/modules-\\d+/files-\\d+\\.\\d+/([^/]+/[^/]+)',
  },
  // C#/.NET
  {
    languages: ['csharp'],
    // 匹配: .nuget/packages/newtonsoft.json/13.0.3 -> newtonsoft.json
    pattern: '.*[/\\\\](?:\\.nuget/packages|packages)[/\\\\]([^/\\\\]+)',
  },
  // Ruby
  {
    languages: ['ruby'],
    // 匹配: gems/rails-7.0.6 -> rails
    pattern: '.*gems/(.+)-\\d+\\.\\d+',
  },
  // PHP
  {
    languages: ['php'],
    // 匹配: vendor/laravel/framework -> laravel/framework
    pattern: '.*vendor/([^/]+/[^/]+)',
  },
  // Dart
  {
    languages: ['dart'],
    // 匹配: .pub-cache/hosted/pub.dev/http-1.1.0 -> http
    pattern: '.*(?:\\.pub-cache|Pub/Cache)/hosted/[^/]+/(.+)-\\d+\\.\\d+',
  },
]

// ============ 标准库路径模式 ============
/**
 * 标准库路径检测模式
 * 用于识别语言标准库，返回对应的标准库标识
 *
 * 检测优先级：标准库模式 > 第三方库模式
 */
const STANDARD_LIB_PATTERNS: StdlibPattern[] = [
  // Python 标准库
  // - <frozen> 模块（如 importlib._bootstrap）
  // - lib/python3.x/ 路径（排除 site-packages）
  // - Python.framework/Versions/X.Y/lib/pythonX.Y/（macOS 框架安装）
  {
    languageId: 'python',
    pattern:
      /<frozen[^>]*>|\/lib\/python\d+\.\d+\/(?!.*site-packages)|\/Python\.framework\/Versions\/\d+\.\d+\/lib\/python\d+\.\d+\//i,
    stdlibName: 'python',
  },
  // Go 标准库
  // - GOROOT/src/ 路径
  // - go/src/ 路径（旧版布局）
  {
    languageId: 'go',
    pattern: /\/go\/src\/|\/GOROOT\/src\/|\/sdk\/golang\/go\/src\//i,
    stdlibName: 'go',
  },
  // Rust 标准库
  // - rustlib/src/rust/library/ 路径
  // - .rustup/toolchains/.../library/ 路径
  {
    languageId: 'rust',
    pattern:
      /rustlib\/src\/rust\/library\/|\.rustup\/toolchains\/[^/]+\/lib\/rustlib\/src\/rust\/library\//i,
    stdlibName: 'rust',
  },
  // Node.js 标准库
  // - node/lib/ 路径（源码安装）
  // - 内置模块通过 node: 前缀识别（在代码层面处理）
  {
    languageId: [
      'javascript',
      'typescript',
      'javascriptreact',
      'typescriptreact',
    ],
    pattern: /\/node\/lib\/|\/nodejs\/src\//i,
    stdlibName: 'node',
  },
]

// ============ 缓存机制 ============

/** 缓存已编译的路径模式 */
let cachedPatterns: PathPattern[] | null = null
/** 上次配置的 hash，用于检测变更 */
let lastConfigHash: string | null = null

/**
 * 计算配置的 hash 值（用于检测变更）
 */
function getConfigHash(): string {
  const config = vscode.workspace.getConfiguration('context7')
  const userPatterns = config.get<RawPathPattern[]>('pathPatterns', [])
  return JSON.stringify(userPatterns)
}

/**
 * 从设置获取路径模式（用户模式 + 默认模式）
 */
export function getPathPatterns(): PathPattern[] {
  const config = vscode.workspace.getConfiguration('context7')
  const userPatterns = config.get<
    Array<{ languages: string[]; pattern: string }>
  >('pathPatterns', [])

  // 用户模式在前，默认模式在后
  const allPatterns = [...userPatterns, ...DEFAULT_PATH_PATTERNS]

  return allPatterns.map((p) => ({
    languages: p.languages,
    pattern: new RegExp(p.pattern),
  }))
}

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
  const patterns = getPathPatterns()

  // 按语言过滤模式
  const filteredPatterns = languageId
    ? patterns.filter((p) => p.languages.includes(languageId))
    : patterns

  for (const { pattern } of filteredPatterns) {
    const match = normalized.match(pattern)
    if (match) {
      return match[1]
    }
  }

  return null
}

/**
 * 检测是否为标准库路径
 * @param filePath 文件路径
 * @param languageId 可选的语言 ID，用于过滤匹配的模式
 * @returns 标准库标识（如 'python', 'rust'）或 null
 */
export function detectStandardLibrary(
  filePath: string,
  languageId?: string,
): string | null {
  const normalized = filePath.replace(/\\/g, '/')

  // 按语言过滤模式
  const filteredPatterns = languageId
    ? STANDARD_LIB_PATTERNS.filter((p) => {
        const langs = Array.isArray(p.languageId)
          ? p.languageId
          : [p.languageId]
        return langs.includes(languageId)
      })
    : STANDARD_LIB_PATTERNS

  for (const { pattern, stdlibName } of filteredPatterns) {
    if (pattern.test(normalized)) {
      return stdlibName
    }
  }

  return null
}
