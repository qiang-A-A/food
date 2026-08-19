// =============================================================================
// vite.config.ts — 前台构建与开发服务器配置
// -----------------------------------------------------------------------------
// 功能：配置 Vite 开发端口（5173）与 API 代理（/api、/uploads → FastAPI 8000），
//       使前端开发时无需处理 CORS（对应方案 §3.1 架构）。
// 说明：后台管理应用（admin）使用独立端口 5174，见 admin/vite.config.ts。
// =============================================================================

import { fileURLToPath, URL } from 'node:url' // Node 标准库：路径解析
import react from '@vitejs/plugin-react'      // React 官方插件：JSX 转换 + 热更新
import { defineConfig } from 'vite'           // Vite 配置函数（类型安全）

export default defineConfig({
  // React 插件启用
  plugins: [react()],

  // 开发服务器：固定端口 5173，启动失败自动尝试下一端口
  server: {
    port: 5173,
    proxy: {
      // API 代理：前端 /api/xxx 请求转发到 FastAPI 后端 8000
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true, // 修改请求 Host 头为后端地址
      },
      // 静态资源代理：上传的图片/视频通过 /uploads 访问
      '/uploads': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },

  // 路径别名：@ 指向 src 目录（与 tsconfig paths 保持一致）
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
