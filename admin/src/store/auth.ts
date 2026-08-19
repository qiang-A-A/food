// =============================================================================
// src/store/auth.ts — 后台登录态管理
// -----------------------------------------------------------------------------
// 功能：管理后台管理员登录态（adminToken + 管理员信息），localStorage 持久化；
//       提供登录/登出动作（对应开发技术文档 §5.2 双角色认证 admin 侧）。
// =============================================================================

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** 后台管理员信息（来自 POST /api/auth/login 响应） */
export interface AdminInfo {
  id: number
  username: string
  name: string
  role_id: number
  dept_id: number | null
}

interface AdminAuthState {
  adminToken: string | null
  admin: AdminInfo | null
  isLogin: boolean
  setLogin: (token: string, admin: AdminInfo) => void
  logout: () => void
}

export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set) => ({
      adminToken: null,
      admin: null,
      isLogin: false,
      // 登录成功：写入令牌与管理员信息（持久化，刷新保持）
      setLogin: (token, admin) => set({ adminToken: token, admin, isLogin: true }),
      // 登出：清空全部登录态
      logout: () => set({ adminToken: null, admin: null, isLogin: false }),
    }),
    { name: 'tsgq-admin-auth' },  // localStorage 键名（与前台 userToken 隔离）
  ),
)
