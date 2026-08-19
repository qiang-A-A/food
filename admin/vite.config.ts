// =============================================================================
// vite.config.ts — 后台构建与开发服务器配置
// -----------------------------------------------------------------------------
// 功能：后台独立应用，开发端口 5174（避免与前台 5173 冲突），
//       同样代理 /api 与 /uploads 到 FastAPI 8000。
// =============================================================================

import { fileURLToPath, URL } from 'node:url' // Node 标准库：路径解析
import react from '@vitejs/plugin-react'      // React 插件
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174, // 后台开发端口
    proxy: {
      // API 代理到后端（与前台一致）
      '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/uploads': { target: 'http://127.0.0.1:8000', changeOrigin: true },
    },
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
})
