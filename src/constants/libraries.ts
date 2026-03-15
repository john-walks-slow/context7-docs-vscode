/**
 * 推荐库列表
 * 用于智能推荐服务，基于当前文件语言推荐相关库
 *
 * 注意：这是推荐列表，不是默认库。
 * 默认库通过 VS Code 设置项 context7.defaultLibraries 配置
 */
export interface LibraryItem {
  id: string
  name: string
  description: string
}

export const COMMON_LIBRARIES: LibraryItem[] = [
  // === JavaScript/TypeScript ===
  {
    id: '/websites/react_dev',
    name: 'react',
    description: 'A JavaScript library for building UIs',
  },
  {
    id: '/vuejs/vue',
    name: 'vue',
    description: 'The Progressive JavaScript Framework',
  },
  {
    id: '/microsoft/TypeScript',
    name: 'typescript',
    description: 'JavaScript with syntax for types',
  },
  {
    id: '/vercel/next.js',
    name: 'next.js',
    description: 'The React Framework for Production',
  },
  {
    id: '/tailwindlabs/tailwindcss',
    name: 'tailwindcss',
    description: 'A utility-first CSS framework',
  },
  {
    id: '/vitejs/vite',
    name: 'vite',
    description: 'Next generation frontend tooling',
  },
  {
    id: '/prisma/prisma',
    name: 'prisma',
    description: 'Next-generation ORM',
  },
  {
    id: '/colinhacks/zod',
    name: 'zod',
    description: 'TypeScript-first schema validation',
  },
  {
    id: '/pmndrs/zustand',
    name: 'zustand',
    description: 'Bear necessities for state management',
  },
  {
    id: '/microsoft/playwright',
    name: 'playwright',
    description: 'End-to-end testing',
  },

  // === Python ===
  {
    id: '/pallets/flask',
    name: 'flask',
    description: 'Python micro web framework',
  },
  {
    id: '/fastapi/fastapi',
    name: 'fastapi',
    description: 'Modern, fast web framework for Python',
  },
  {
    id: '/encode/httpx',
    name: 'httpx',
    description: 'Next generation HTTP client for Python',
  },
  {
    id: '/pydantic/pydantic',
    name: 'pydantic',
    description: 'Data validation using Python type hints',
  },
  {
    id: '/sqlalchemy/sqlalchemy',
    name: 'sqlalchemy',
    description: 'Python SQL toolkit and ORM',
  },

  // === CSS ===
  {
    id: '/twbs/bootstrap',
    name: 'bootstrap',
    description: 'Popular CSS framework',
  },
  {
    id: '/animate-css/animate.css',
    name: 'animate.css',
    description: 'Cross-browser CSS animations',
  },
]
