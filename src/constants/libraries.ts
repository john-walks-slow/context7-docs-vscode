/**
 * 常用库列表，用于快速选择
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
  
  // === Rust ===
  {
    id: '/tokio-rs/tokio',
    name: 'tokio',
    description: 'Rust async runtime',
  },
  {
    id: '/serde-rs/serde',
    name: 'serde',
    description: 'Serialization framework for Rust',
  },
  {
    id: '/actix/actix-web',
    name: 'actix-web',
    description: 'Powerful, pragmatic web framework for Rust',
  },
  {
    id: '/diesel-rs/diesel',
    name: 'diesel',
    description: 'Safe, extensible ORM for Rust',
  },
  
  // === Go ===
  {
    id: '/gin-gonic/gin',
    name: 'gin',
    description: 'HTTP web framework for Go',
  },
  {
    id: '/go-gorm/gorm',
    name: 'gorm',
    description: 'ORM library for Go',
  },
  {
    id: '/go-chi/chi',
    name: 'chi',
    description: 'Lightweight, idiomatic router for Go',
  },
  
  // === Java/Kotlin ===
  {
    id: '/spring-projects/spring-framework',
    name: 'spring',
    description: 'Java application framework',
  },
  {
    id: '/JetBrains/kotlin',
    name: 'kotlin',
    description: 'Modern programming language',
  },
  {
    id: '/square/retrofit',
    name: 'retrofit',
    description: 'Type-safe HTTP client for Android and Java',
  },
  
  // === C# ===
  {
    id: '/dotnet/aspnetcore',
    name: 'aspnetcore',
    description: 'Cross-platform web framework for .NET',
  },
  {
    id: '/JamesNK/Newtonsoft.Json',
    name: 'newtonsoft',
    description: 'Json.NET for .NET',
  },
  {
    id: '/AutoMapper/AutoMapper',
    name: 'automapper',
    description: 'Object-object mapper for .NET',
  },
  
  // === Dart/Flutter ===
  {
    id: '/flutter/flutter',
    name: 'flutter',
    description: 'Build apps for any screen',
  },
  {
    id: '/rrousselGit/riverpod',
    name: 'riverpod',
    description: 'Reactive state management for Flutter',
  },
  {
    id: '/jonataslaw/getx',
    name: 'get',
    description: 'Flutter state management, navigation',
  },
  
  // === Ruby ===
  {
    id: '/rails/rails',
    name: 'rails',
    description: 'Ruby on Rails web framework',
  },
  {
    id: '/sinatra/sinatra',
    name: 'sinatra',
    description: 'Ruby micro web framework',
  },
  
  // === PHP ===
  {
    id: '/laravel/framework',
    name: 'laravel',
    description: 'PHP web framework',
  },
  {
    id: '/symfony/symfony',
    name: 'symfony',
    description: 'PHP framework',
  },
  
  // === Swift ===
  {
    id: '/Alamofire/Alamofire',
    name: 'alamofire',
    description: 'HTTP networking library for Swift',
  },
  {
    id: '/onevcat/Kingfisher',
    name: 'kingfisher',
    description: 'Image loading library for Swift',
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