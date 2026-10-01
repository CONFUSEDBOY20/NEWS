import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function vercelNewsDevPlugin() {
  return {
    name: 'vercel-news-dev',
    configureServer(server) {
      server.middlewares.use('/api/news', async (req, res, next) => {
        try {
          const newsModule = await import(path.resolve(__dirname, '../api/news.js'))
          const handler = newsModule.default
          const fullUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
          req.query = Object.fromEntries(fullUrl.searchParams.entries())
          res.status = (code) => {
            res.statusCode = code
            return res
          }
          res.json = (data) => {
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(data))
          }
          await handler(req, res)
        } catch (err) {
          next(err)
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), vercelNewsDevPlugin()],
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
