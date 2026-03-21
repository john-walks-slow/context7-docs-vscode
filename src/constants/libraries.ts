/**
 * Context7 库，通过关键词将库的路径映射到 id
 */
export interface LibraryItem {
  id: string
  name: string
  description: string
  keywords?: string[]
}

/**
 * 标准库
 */
export interface StandardLibraryItem extends LibraryItem {
  /** VS Code 语言 ID 列表（用于 LSP 失败时的语言回退） */
  languages: string[]
}

export const PRESET_LIBRARIES: LibraryItem[] = [
  // === JavaScript/TypeScript Core ===
  {
    id: '/websites/react_dev',
    name: 'React',
    description: 'A JavaScript library for building UIs',
    keywords: ['react', 'React', 'react-dom'],
  },
  {
    id: '/vuejs/docs',
    name: 'Vue',
    description: 'The Progressive JavaScript Framework',
    keywords: ['vue', 'Vue', 'vuejs'],
  },
  {
    id: '/websites/svelte_dev',
    name: 'Svelte',
    description: 'Compiler for building reactive UIs',
    keywords: ['svelte', 'Svelte', 'sveltekit'],
  },
  {
    id: '/websites/angular_dev',
    name: 'Angular',
    description: 'Platform for building web applications',
    keywords: ['angular', 'Angular', 'ng'],
  },
  {
    id: '/microsoft/typescript',
    name: 'TypeScript',
    description: 'JavaScript with syntax for types',
    keywords: ['typescript', 'TypeScript', 'ts'],
  },

  // === Meta Frameworks ===
  {
    id: '/vercel/next.js',
    name: 'Next.js',
    description: 'The React Framework for Production',
    keywords: ['next', 'next.js', 'Next.js'],
  },
  {
    id: '/websites/nuxt_4_x',
    name: 'Nuxt',
    description: 'The Vue Framework',
    keywords: ['nuxt', 'nuxt.js', 'Nuxt'],
  },
  {
    id: '/websites/astro_build',
    name: 'Astro',
    description: 'Web framework for content-driven sites',
    keywords: ['astro', 'Astro'],
  },

  // === Build Tools ===
  {
    id: '/vitejs/vite',
    name: 'Vite',
    description: 'Next generation frontend tooling',
    keywords: ['vite', 'Vite'],
  },

  // === Styling ===
  {
    id: '/websites/tailwindcss',
    name: 'Tailwind CSS',
    description: 'A utility-first CSS framework',
    keywords: ['tailwindcss', 'tailwind', 'Tailwind'],
  },
  {
    id: '/websites/ui_shadcn',
    name: 'shadcn/ui',
    description: 'Beautifully designed UI components',
    keywords: ['shadcn', 'shadcn/ui', 'shadcn-ui'],
  },

  // === State Management ===
  {
    id: '/pmndrs/zustand',
    name: 'Zustand',
    description: 'Bear necessities for state management',
    keywords: ['zustand', 'Zustand'],
  },
  {
    id: '/tanstack/query',
    name: 'TanStack Query',
    description: 'Powerful data synchronization library',
    keywords: ['tanstack-query', 'react-query', '@tanstack/query'],
  },

  // === Backend/Full-stack ===
  {
    id: '/websites/expressjs_en',
    name: 'Express',
    description: 'Fast, unopinionated Node.js web framework',
    keywords: ['express', 'Express', 'expressjs'],
  },
  {
    id: '/websites/nestjs',
    name: 'NestJS',
    description: 'Progressive Node.js framework',
    keywords: ['nestjs', 'NestJS', '@nestjs/core'],
  },
  {
    id: '/prisma/docs',
    name: 'Prisma',
    description: 'Next-generation ORM',
    keywords: ['prisma', 'Prisma', '@prisma/client'],
  },

  // === Testing ===
  {
    id: '/microsoft/playwright',
    name: 'Playwright',
    description: 'End-to-end testing',
    keywords: ['playwright', 'Playwright', '@playwright/test'],
  },

  // === Utilities ===
  {
    id: '/colinhacks/zod',
    name: 'Zod',
    description: 'TypeScript-first schema validation',
    keywords: ['zod', 'Zod'],
  },

  // === Python ===
  {
    id: '/django/django',
    name: 'Django',
    description: 'The web framework for perfectionists',
    keywords: ['django', 'Django'],
  },
  {
    id: '/websites/fastapi_tiangolo',
    name: 'FastAPI',
    description: 'Modern, fast web framework for Python',
    keywords: ['fastapi', 'FastAPI'],
  },
  {
    id: '/pallets/flask',
    name: 'Flask',
    description: 'Python micro web framework',
    keywords: ['flask', 'Flask'],
  },
  {
    id: '/pydantic/pydantic',
    name: 'Pydantic',
    description: 'Data validation using Python type hints',
    keywords: ['pydantic', 'Pydantic'],
  },
  {
    id: '/websites/sqlalchemy_en_21',
    name: 'SQLAlchemy',
    description: 'Python SQL toolkit and ORM',
    keywords: ['sqlalchemy', 'SQLAlchemy'],
  },
]

/**
 * 语言标准库映射
 * 当 LSP 追踪到标准库路径时，使用此映射获取正确的 Context7 ID
 */
export const STANDARD_LIBRARIES: StandardLibraryItem[] = [
  {
    id: '/python/cpython',
    name: 'python',
    description: 'Python standard library (stdlib)',
    languages: ['python'],
  },
  {
    id: '/rust-lang/rust',
    name: 'rust',
    description: 'Rust standard library (std)',
    languages: ['rust'],
  },
  {
    id: '/golang/go',
    name: 'go',
    description: 'Go standard library',
    languages: ['go', 'golang'],
  },
  {
    id: '/microsoft/typescript',
    name: 'typescript',
    description: 'TypeScript standard library',
    languages: ['typescript', 'typescriptreact'],
  },
  {
    id: '/nodejs/node',
    name: 'node',
    description: 'Node.js standard library',
    languages: ['node', 'javascript', 'javascriptreact'],
  },
]
