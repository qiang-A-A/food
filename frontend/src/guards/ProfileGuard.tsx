// =============================================================================
// src/guards/ProfileGuard.tsx — 个人中心登录守卫
// -----------------------------------------------------------------------------
// 功能：未登录访问个人中心时重定向到登录页（PRD F-6 登录态拦截）。
//       登录后通过 /login 跳转回 /profile。
// =============================================================================

import { Navigate } from 'react-router-dom'

import { useAuthStore } from '@/store/auth'

export function ProfileGuard({ children }: { children: React.ReactNode }) {
  const isLogin = useAuthStore((s) => s.isLogin)

  // 未登录：跳转登录页（登录成功后会导航回个人中心）
  if (!isLogin) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}
