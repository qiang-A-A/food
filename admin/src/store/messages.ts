// =============================================================================
// src/store/messages.ts — 后台消息未读数（角标状态）
// -----------------------------------------------------------------------------
// 功能：全局共享「消息管理」菜单未读角标数量。AdminLayout 挂载时 10 秒轮询
//       refresh()；Messages 页打开会话（标记已读）后也调用 refresh() 即时
//       更新——保证「点开对应聊天窗口后角标减小，为 0 消失」。
// =============================================================================

import { create } from 'zustand'

import { http } from '@/api/http'
import { adminApi } from '@tsgq/api-client'

interface MessagesState {
  unread: number                 // 管理员侧未读总数（角标）
  setUnread: (n: number) => void
  refresh: () => void            // 拉取最新未读数（失败静默，保持现值）
}

export const useMessagesStore = create<MessagesState>((set) => ({
  unread: 0,
  setUnread: (n) => set({ unread: n }),
  refresh: () => {
    http.get(adminApi.messagesUnread)
      .then((res: any) => set({ unread: res.data?.count ?? 0 }))
      .catch(() => { /* 静默：轮询场景失败保持现值，避免抖动 */ })
  },
}))
