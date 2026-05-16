import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        // 排除 /api-keys 等不是 API 请求的前端路由
        bypass: (req) => (req.url?.startsWith('/api-keys') ? req.url : undefined),
      },
      '/actuator': 'http://localhost:8080',
    },
  },
  // SPA fallback —— 刷新 /admin/dashboard 等前端路由时返回 index.html
  appType: 'spa',
})
