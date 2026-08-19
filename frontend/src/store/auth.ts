// =============================================================================
// src/store/auth.ts — 前台登录态状态管理（Zustand）
// -----------------------------------------------------------------------------
// 功能：管理前台用户登录态（userToken/昵称/头像），localStorage 持久化，
//       提供登录/登出动作。对应 PRD F-6 登录态保持与权限分水岭的前端基础。
// 说明：M3 后端就绪后接入真实登录接口；未登录拦截逻辑在路由守卫实现。
// =============================================================================

import { create } from 'zustand' // 轻量状态库（选型已确认）
import { persist } from 'zustand/middleware' // 持久化中间件（写 localStorage）

interface AuthState {
  /** 用户 JWT（登录后写入） */
  userToken: string | null
  /** 昵称（顶部导航展示） */
  nickname: string
  /** 头像 URL 或默认头像 key */
  avatar: string
  /** 是否已登录（派生状态便捷判断） */
  isLogin: boolean
  /** 登录成功回调：写入令牌与用户信息 */
  setLogin: (token: string, nickname: string, avatar?: string) => void
  /** 退出登录：清空全部登录态 */
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  // persist：自动将 state 同步到 localStorage，刷新后保持登录态
  persist(
    (set) => ({
      userToken: null,
      nickname: '',
      avatar: '',
      isLogin: false,

      // 登录：写入令牌与资料（M3 接入登录接口后调用）
      setLogin: (token, nickname, avatar = '') =>
        set({ userToken: token, nickname, avatar, isLogin: true }),

      // 登出：恢复初始态（受限 CTA 自动回退为「登录后可…」双态）
      logout: () =>
        set({ userToken: null, nickname: '', avatar: '', isLogin: false }),
    }),
    { name: 'tsgq-user-auth' }, // localStorage 键名
  ),
)
