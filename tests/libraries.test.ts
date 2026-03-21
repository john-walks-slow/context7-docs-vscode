import { describe, it, expect } from 'vitest'
import {
  PRESET_LIBRARIES,
  STANDARD_LIBRARIES,
  type LibraryItem,
} from '../src/constants/libraries'

/**
 * 库 ID 验证测试
 *
 * 这些测试验证 libraries.ts 中定义的库 ID 是否正确。
 *
 * 验证方式：
 * 1. 格式验证：确保 ID 符合 Context7 的格式要求
 * 2. 名称验证：确保名称不为空且有意义
 * 3. 可选的 API 验证：设置环境变量 RUN_API_VALIDATION=1 时会实际调用 Context7 API
 */

describe('PRESET_LIBRARIES', () => {
  it('should have valid ID format for all libraries', () => {
    const invalidIds: string[] = []

    for (const lib of PRESET_LIBRARIES) {
      // Context7 ID 格式: /org/repo 或 /websites/xxx
      const isValid = /^\/[\w-]+\/[\w.-]+$/.test(lib.id)
      if (!isValid) {
        invalidIds.push(`${lib.name}: ${lib.id}`)
      }
    }

    expect(invalidIds).toEqual([])
  })

  it('should have non-empty names and descriptions', () => {
    for (const lib of PRESET_LIBRARIES) {
      expect(lib.name).toBeTruthy()
      expect(lib.name.length).toBeGreaterThan(0)
      expect(lib.description).toBeTruthy()
      expect(lib.description.length).toBeGreaterThan(0)
    }
  })

  it('should have keywords for auto-resolution', () => {
    const librariesWithoutKeywords = PRESET_LIBRARIES.filter(
      (lib) => !lib.keywords || lib.keywords.length === 0,
    )

    // 关键词用于自动检测，应该至少有一个
    expect(librariesWithoutKeywords).toEqual([])
  })

  it('should have unique IDs', () => {
    const ids = PRESET_LIBRARIES.map((lib) => lib.id)
    const uniqueIds = new Set(ids)
    expect(ids.length).toBe(uniqueIds.size)
  })
})

describe('STANDARD_LIBRARIES', () => {
  it('should have valid ID format for all standard libraries', () => {
    const invalidIds: string[] = []

    for (const lib of STANDARD_LIBRARIES) {
      const isValid = /^\/[\w-]+\/[\w.-]+$/.test(lib.id)
      if (!isValid) {
        invalidIds.push(`${lib.name}: ${lib.id}`)
      }
    }

    expect(invalidIds).toEqual([])
  })

  it('should have non-empty names and descriptions', () => {
    for (const lib of STANDARD_LIBRARIES) {
      expect(lib.name).toBeTruthy()
      expect(lib.description).toBeTruthy()
    }
  })

  it('should have unique IDs', () => {
    const ids = STANDARD_LIBRARIES.map((lib) => lib.id)
    const uniqueIds = new Set(ids)
    expect(ids.length).toBe(uniqueIds.size)
  })
})

/**
 * 已验证的库 ID 映射
 * 这个映射记录了已经通过 Context7 API 验证的库 ID
 *
 * 如果库 ID 发生变化，需要更新此映射
 */
const VERIFIED_LIBRARY_IDS: Record<string, { id: string; title: string }> = {
  // === JavaScript/TypeScript Core ===
  '/websites/react_dev': { id: '/websites/react_dev', title: 'React' },
  '/vuejs/docs': { id: '/vuejs/docs', title: 'Vue 3' },
  '/websites/svelte_dev': { id: '/websites/svelte_dev', title: 'Svelte' },
  '/websites/angular_dev': { id: '/websites/angular_dev', title: 'Angular' },
  '/microsoft/typescript': {
    id: '/microsoft/typescript',
    title: 'TypeScript',
  },

  // === Meta Frameworks ===
  '/vercel/next.js': { id: '/vercel/next.js', title: 'Next.js' },
  '/websites/nuxt_4_x': { id: '/websites/nuxt_4_x', title: 'Nuxt' },
  '/websites/astro_build': { id: '/websites/astro_build', title: 'Astro' },

  // === Build Tools ===
  '/vitejs/vite': { id: '/vitejs/vite', title: 'Vite' },

  // === Styling ===
  '/websites/tailwindcss': {
    id: '/websites/tailwindcss',
    title: 'Tailwind CSS',
  },
  '/websites/ui_shadcn': { id: '/websites/ui_shadcn', title: 'shadcn/ui' },

  // === State Management ===
  '/pmndrs/zustand': { id: '/pmndrs/zustand', title: 'Zustand' },
  '/tanstack/query': { id: '/tanstack/query', title: 'TanStack Query' },

  // === Backend ===
  '/websites/expressjs_en': { id: '/websites/expressjs_en', title: 'Express' },
  '/websites/nestjs': { id: '/websites/nestjs', title: 'NestJS' },
  '/prisma/docs': { id: '/prisma/docs', title: 'Prisma' },

  // === Testing ===
  '/microsoft/playwright': {
    id: '/microsoft/playwright',
    title: 'Playwright',
  },

  // === Utilities ===
  '/colinhacks/zod': { id: '/colinhacks/zod', title: 'Zod' },

  // === Python ===
  '/django/django': { id: '/django/django', title: 'Django' },
  '/websites/fastapi_tiangolo': {
    id: '/websites/fastapi_tiangolo',
    title: 'FastAPI',
  },
  '/pallets/flask': { id: '/pallets/flask', title: 'Flask' },
  '/pydantic/pydantic': { id: '/pydantic/pydantic', title: 'Pydantic' },
  '/websites/sqlalchemy_en_21': {
    id: '/websites/sqlalchemy_en_21',
    title: 'SQLAlchemy',
  },
}

const VERIFIED_STANDARD_LIBRARY_IDS: Record<
  string,
  { id: string; title: string }
> = {
  '/python/cpython': { id: '/python/cpython', title: 'Python' },
  '/rust-lang/rust': { id: '/rust-lang/rust', title: 'Rust' },
  '/golang/go': { id: '/golang/go', title: 'Go' },
  '/microsoft/typescript': {
    id: '/microsoft/typescript',
    title: 'TypeScript',
  },
  '/nodejs/node': { id: '/nodejs/node', title: 'Node.js' },
}

describe('Library ID Verification', () => {
  it('PRESET_LIBRARIES IDs should match verified IDs', () => {
    const mismatches: string[] = []

    for (const lib of PRESET_LIBRARIES) {
      const verified = VERIFIED_LIBRARY_IDS[lib.id]
      if (!verified) {
        mismatches.push(`${lib.name}: ${lib.id} - NOT VERIFIED`)
      } else if (verified.id !== lib.id) {
        mismatches.push(`${lib.name}: expected ${verified.id}, got ${lib.id}`)
      }
    }

    expect(mismatches).toEqual([])
  })

  it('STANDARD_LIBRARIES IDs should match verified IDs', () => {
    const mismatches: string[] = []

    for (const lib of STANDARD_LIBRARIES) {
      const verified = VERIFIED_STANDARD_LIBRARY_IDS[lib.id]
      if (!verified) {
        mismatches.push(`${lib.name}: ${lib.id} - NOT VERIFIED`)
      } else if (verified.id !== lib.id) {
        mismatches.push(`${lib.name}: expected ${verified.id}, got ${lib.id}`)
      }
    }

    expect(mismatches).toEqual([])
  })
})

/**
 * API 验证测试（可选）
 *
 * 设置环境变量 RUN_API_VALIDATION=1 来运行这些测试
 * 这些测试会实际调用 Context7 API 来验证库 ID 是否存在
 */
describe.runIf(process.env.RUN_API_VALIDATION === '1')('API Validation', () => {
  const mcpUrl = 'https://mcp.context7.com/mcp'

  async function resolveLibraryId(
    libraryName: string,
    query: string,
  ): Promise<string[]> {
    const response = await fetch(mcpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'resolve-library-id',
          arguments: { libraryName, query },
        },
        id: 1,
      }),
    })

    const data = await response.json()
    const text = data.result?.content?.[0]?.text || ''

    // 解析返回的库 ID
    const ids: string[] = []
    const regex = /Context7-compatible library ID: (\/[\w-]+\/[\w.-]+)/g
    let match
    while ((match = regex.exec(text)) !== null) {
      ids.push(match[1])
    }
    return ids
  }

  it.each(PRESET_LIBRARIES)(
    'should verify $name ID exists in Context7',
    { timeout: 30000, concurrent: true },
    async (lib: LibraryItem) => {
      const ids = await resolveLibraryId(
        lib.name.toLowerCase(),
        lib.description,
      )
      expect(ids).toContain(lib.id)
    },
  )

  it.each(STANDARD_LIBRARIES)(
    'should verify $name ID exists in Context7',
    { timeout: 30000, concurrent: true },
    async (lib: LibraryItem) => {
      const ids = await resolveLibraryId(
        lib.name.toLowerCase(),
        lib.description,
      )
      expect(ids).toContain(lib.id)
    },
  )
})
