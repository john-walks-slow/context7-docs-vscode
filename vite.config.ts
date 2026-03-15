import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    lib: {
      entry: resolve(__dirname, 'src/extension.ts'),
      formats: ['cjs'],
      fileName: () => 'extension.js',
    },
    rollupOptions: {
      external: ['vscode', 'path', 'fs'],
      output: {
        entryFileNames: '[name].js',
      },
    },
    sourcemap: true,
    minify: false,
  },
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', '**/.worktrees/**'],
  },
})
