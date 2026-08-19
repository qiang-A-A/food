// =============================================================================
// src/store/ui.ts — 全局 UI 状态（登录弹窗 / Toast / 回跳动作）
// -----------------------------------------------------------------------------
// 功能：管理权限分水岭所需的前端全局状态（UI/UX §6.5）：
//       ① 登录弹窗开关（任意受限操作点击受限 CTA 时打开）
//       ② loginReturnAction：登录成功后的回跳动作（自动展开预约/咨询表单）
//       ③ Toast 轻提示（成功/失败）
// =============================================================================

import { create } from 'zustand'

/** 登录成功后的回跳动作类型：由触发源设置，登录后执行 */
export type ReturnAction = (() => void) | null

interface UiState {
  // ---- 登录弹窗 ----
  loginModalOpen: boolean
  openLogin: (returnAction?: ReturnAction) => void  // 打开弹窗，可携带回跳动作
  closeLogin: () => void

  // ---- 回跳动作（登录成功后执行并清空）----
  returnAction: ReturnAction
  runReturnAction: () => void
  clearReturnAction: () => void  // 审计修复：去注册等场景需主动清空，防残留误执行

  // ---- Toast ----
  toast: { type: 'ok' | 'err'; text: string } | null
  showToast: (type: 'ok' | 'err', text: string) => void
  hideToast: () => void
}

export const useUiStore = create<UiState>((set, get) => ({
  loginModalOpen: false,
  returnAction: null,

  // 打开登录弹窗（携带回跳动作：登录成功后自动继续原操作）
  openLogin: (returnAction = null) =>
    set({ loginModalOpen: true, returnAction }),

  // 关闭登录弹窗（不执行回跳，如用户主动关闭）
  closeLogin: () => set({ loginModalOpen: false }),

  // 登录成功：执行回跳动作并清空（权限分水岭核心交互）
  runReturnAction: () => {
    const action = get().returnAction
    set({ returnAction: null })
    action?.()
  },

  // 清空回跳动作（审计修复：从登录弹窗跳转注册页时必须清空，
  // 否则旧动作残留，用户之后再次通过弹窗登录会误执行上一次的回跳）
  clearReturnAction: () => set({ returnAction: null }),

  toast: null,

  // 显示 Toast（2.6s 自动消失，UI/UX §6.3 反馈机制）
  showToast: (type, text) => {
    set({ toast: { type, text } })
    setTimeout(() => get().hideToast(), 2600)
  },
  hideToast: () => set({ toast: null }),
}))
