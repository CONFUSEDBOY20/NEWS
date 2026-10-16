import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        timeout: 60_000,
        proxyTimeout: 60_000,
      },
    },
  },
  build: {
    // Warn when chunks exceed 600KB
    chunkSizeWarningLimit: 600,
    // rolldown (Vite 8) requires manualChunks as a function
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'lucide-vendor';
          }
        },
      },
    },
    sourcemap: false,
  },
})
