import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // `@/…` imports from src/ (shadcn/ui components use this alias).
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    // print.html draws one Studio page for the export renderer (server/utils/pageRenderer.js).
    rollupOptions: { input: { main: fileURLToPath(new URL('./index.html', import.meta.url)), print: fileURLToPath(new URL('./print.html', import.meta.url)) } },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
