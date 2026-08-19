// =============================================================================
// src/api/http.ts — 后台 HTTP 客户端实例
// -----------------------------------------------------------------------------
// 功能：基于共享包 createApiClient 创建后台专用 Axios 实例，
//       自动注入 adminToken（从登录态 store 读取，与持久化键保持一致），
//       未登录/令牌失效时清理登录态并跳转超管登录页。
// 修复记录：v1 曾用独立 localStorage 键 'tsgq-admin-token' 读取 token，与
//           store 持久化键 'tsgq-admin-auth' 不一致导致登录后请求全部 401，
//           现统一改为从 store 读取（M5 缺陷修复）。
// =============================================================================

import { createApiClient } from '@tsgq/api-client'

import { useAdminAuthStore } from '@/store/auth'

/** 后台 API 客户端：baseURL 留空走 Vite 代理（/api → 8000） */
export const http = createApiClient({
  // 从登录态 store 读取管理员令牌（登录/登出与页面状态完全同步）
  getToken: () => useAdminAuthStore.getState().adminToken,
  // 未登录/令牌失效：清理登录态并跳转超管登录页
  onUnauthorized: () => {
    useAdminAuthStore.getState().logout()
    // 避免重复跳转（已在 /admin/login 时不刷新）
    if (!window.location.pathname.startsWith('/admin/login')) {
      window.location.href = '/admin/login'
    }
  },
})
