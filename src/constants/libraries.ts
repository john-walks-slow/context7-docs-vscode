/**
 * Recommended library list with keywords for auto-resolution
 */
export interface LibraryItem {
  id: string
  name: string
  description: string
  keywords?: string[]
}

export const COMMON_LIBRARIES: LibraryItem[] = [
  // === JavaScript/TypeScript ===
  {
    id: '/websites/react_dev',
    name: 'React',
    description: 'A JavaScript library for building UIs',
    keywords: ['react', 'React', 'react-dom'],
  },
  {
    id: '/vuejs/vue',
    name: 'Vue',
    description: 'The Progressive JavaScript Framework',
    keywords: ['vue', 'Vue', 'vuejs'],
  },
  {
    id: '/microsoft/TypeScript',
    name: 'TypeScript',
    description: 'JavaScript with syntax for types',
    keywords: ['typescript', 'TypeScript', 'ts'],
  },
  {
    id: '/vercel/next.js',
    name: 'Next.js',
    description: 'The React Framework for Production',
    keywords: ['next', 'next.js', 'Next.js'],
  },
  {
    id: '/tailwindlabs/tailwindcss',
    name: 'Tailwind CSS',
    description: 'A utility-first CSS framework',
    keywords: ['tailwindcss', 'tailwind', 'Tailwind'],
  },
  {
    id: '/vitejs/vite',
    name: 'Vite',
    description: 'Next generation frontend tooling',
    keywords: ['vite', 'Vite'],
  },
  {
    id: '/prisma/prisma',
    name: 'Prisma',
    description: 'Next-generation ORM',
    keywords: ['prisma', 'Prisma', '@prisma/client'],
  },
  {
    id: '/colinhacks/zod',
    name: 'Zod',
    description: 'TypeScript-first schema validation',
    keywords: ['zod', 'Zod'],
  },
  {
    id: '/pmndrs/zustand',
    name: 'Zustand',
    description: 'Bear necessities for state management',
    keywords: ['zustand', 'Zustand'],
  },
  {
    id: '/microsoft/playwright',
    name: 'Playwright',
    description: 'End-to-end testing',
    keywords: ['playwright', 'Playwright', '@playwright/test'],
  },

  // === Python ===
  {
    id: '/pallets/flask',
    name: 'Flask',
    description: 'Python micro web framework',
    keywords: ['flask', 'Flask'],
  },
  {
    id: '/fastapi/fastapi',
    name: 'FastAPI',
    description: 'Modern, fast web framework for Python',
    keywords: ['fastapi', 'FastAPI'],
  },
  {
    id: '/encode/httpx',
    name: 'HTTPX',
    description: 'Next generation HTTP client for Python',
    keywords: ['httpx', 'HTTPX'],
  },
  {
    id: '/pydantic/pydantic',
    name: 'Pydantic',
    description: 'Data validation using Python type hints',
    keywords: ['pydantic', 'Pydantic'],
  },
  {
    id: '/sqlalchemy/sqlalchemy',
    name: 'SQLAlchemy',
    description: 'Python SQL toolkit and ORM',
    keywords: ['sqlalchemy', 'SQLAlchemy'],
  },

  // === CSS ===
  {
    id: '/twbs/bootstrap',
    name: 'Bootstrap',
    description: 'Popular CSS framework',
    keywords: ['bootstrap', 'Bootstrap'],
  },
  {
    id: '/animate-css/animate.css',
    name: 'Animate.css',
    description: 'Cross-browser CSS animations',
    keywords: ['animate.css', 'animate-css'],
  },
]

/**
 * 语言标准库映射
 * 用于检测语言内置库并映射到 Context7 ID
 *
 * 当 LSP 追踪到标准库路径时，使用此映射获取正确的 Context7 ID
 */
export const STANDARD_LIBRARIES: LibraryItem[] = [
  {
    id: '/python/cpython',
    name: 'python',
    description: 'Python standard library (stdlib)',
  },
  {
    id: '/rust-lang/rust',
    name: 'rust',
    description: 'Rust standard library (std)',
  },
  {
    id: '/golang/go',
    name: 'go',
    description: 'Go standard library',
  },
  {
    id: '/microsoft/typescript',
    name: 'typescript',
    description: 'TypeScript standard library',
  },
  {
    id: '/nodejs/node',
    name: 'node',
    description: 'Node.js standard library',
  },
]
