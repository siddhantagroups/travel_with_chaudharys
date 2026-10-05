import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // Needed for Docker container mapping
    // Same-origin API in development, exactly like production (where Nginx
    // forwards /api): the admin session cookie and CSRF checks then behave
    // the same locally as on the live site, and no CORS is needed.
    // The page's Host is kept (changeOrigin: false), as Nginx keeps it on the
    // live site: the CSRF check compares it with the Origin. Rewriting it to
    // localhost:5000 (Vite's default for a plain target string) made every
    // admin save from the dev server fail with "Request blocked".
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:5000',
        changeOrigin: false,
      },
    },
    watch: {
      usePolling: true // Needed for Docker hot-reload on Windows
    }
  }
})
