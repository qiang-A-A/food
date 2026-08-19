// =============================================================================
// src/api/http.ts — 前台 HTTP 客户端实例
// -----------------------------------------------------------------------------
// 功能：基于共享包 createApiClient 创建前台专用 Axios 实例，
//       自动注入 userToken 并在未登录时触发登出清理。
// 说明：token 读取与 401 处理对接 auth store；M3 后端就绪后即可直接调用。
// =============================================================================

import { createApiClient } from '@tsgq/api-client'
import { useAuthStore } from '@/store/auth'

/** 前台 API 客户端：baseURL 留空走 Vite 代理（/api → 8000） */
export const http = createApiClient({
  // 从登录态 store 读取当前用户令牌
  getToken: () => useAuthStore.getState().userToken,
  // 未登录（令牌失效）：清理本地登录态，交由页面引导登录弹窗
  onUnauthorized: () => {
    useAuthStore.getState().logout()
  },
})
