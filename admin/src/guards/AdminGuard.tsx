// =============================================================================
// src/guards/AdminGuard.tsx — 后台登录守卫
// -----------------------------------------------------------------------------
// 功能：未登录访问后台任意管理路由时重定向到超管登录页
//       （对应开发技术文档 §10.2 越权防护的前端侧）。
// =============================================================================

import { Navigate } from 'react-router-dom'

import { useAdminAuthStore } from '@/store/auth'

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const isLogin = useAdminAuthStore((s) => s.isLogin)

  // 未登录：跳转超管登录页（登录成功回 /admin）
  if (!isLogin) {
    return <Navigate to="/admin/login" replace />
  }
  return <>{children}</>
}
