import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// React/Vite client for Chapo'sHub. Dev server proxies /api/* to the
// Express backend (server/) so the client can call relative /api paths
// exactly like the original Hono/Cloudflare app did.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:8787',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist'
  }
})
