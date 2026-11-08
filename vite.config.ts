import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages project site lives under /<repo>/, so the base path must match.
// Override with VITE_BASE when deploying to a domain root (Cloudflare Pages / Vercel).
export default defineConfig(() => {
  const base = process.env.VITE_BASE ?? '/digital-doppelganger/'
  return {
    base,
    plugins: [react()],
    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 900,
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/tests/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
    },
  }
})
