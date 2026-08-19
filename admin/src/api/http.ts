// =============================================================================
// src/api/http.ts — 后台 HTTP 客户端实例
// -----------------------------------------------------------------------------
// 功能：基于共享包 createApiClient 创建后台专用 Axios 实例，
//       自动注入 adminToken，未登录时清理并跳转超管登录页。
// =============================================================================

import { createApiClient } from '@tsgq/api-client'

/** 后台管理员令牌读写：localStorage 持久化（与前台 userToken 隔离存储） */
const ADMIN_TOKEN_KEY = 'tsgq-admin-token'

export function getAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY)
}

export function setAdminToken(token: string): void {
  localStorage.setItem(ADMIN_TOKEN_KEY, token)
}

export function clearAdminToken(): void {
  localStorage.removeItem(ADMIN_TOKEN_KEY)
}

/** 后台 API 客户端：baseURL 留空走 Vite 代理（/api → 8000） */
export const http = createApiClient({
  getToken: getAdminToken,
  // 未登录/令牌失效：清令牌并跳转超管登录页
  onUnauthorized: () => {
    clearAdminToken()
    window.location.href = '/admin/login'
  },
})
