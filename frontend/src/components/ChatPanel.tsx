// =============================================================================
// src/components/ChatPanel.tsx — 聊天核心面板（消息列表 + 输入区）
// -----------------------------------------------------------------------------
// 功能：聊天功能的可复用核心——数据加载（3 秒轮询）、消息气泡渲染、发送。
//       由两个外壳复用：
//        · ChatWidget：产品详情页右下角浮窗（携带来源产品）
//        · Profile 个人中心「消息记录」内嵌面板
// 数据：GET/POST /api/user/messages（调用方需保证登录态）。
// =============================================================================

import { useEffect, useRef, useState } from 'react'

import { http } from '@/api/http'
import { userApi } from '@tsgq/api-client'
import { useAuthStore } from '@/store/auth'

// 单条消息结构（与后端 MessageOut 对齐）
export interface ChatMsg {
  id: number
  sender: string          // user / admin
  admin_name?: string | null
  content: string
  created_at: string
}

interface ChatPanelProps {
  productId?: number | null  // 来源产品（产品详情页咨询时携带）
  height?: string | number   // 消息区高度（浮窗固定 520；个人中心自适应）
}

// 轮询间隔（毫秒）：3 秒，兼顾实时性与请求量
const POLL_MS = 3000

export function ChatPanel({ productId, height }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loadError, setLoadError] = useState('')
  // 消息区滚动容器（修复：自动滚动仅作用于本容器，不再 scrollIntoView 带动整个页面——
  // 个人中心「消息记录」点击后页面不再自动滚到底部，需求 #6）
  const scrollRef = useRef<HTMLDivElement>(null)
  const nickname = useAuthStore((s) => s.nickname) || '我'

  // 拉取聊天记录（首次打开即标记已读，后续轮询增量）
  const fetchMessages = () => {
    http.get(userApi.messages, { params: { page: 1, page_size: 100 } })
      .then((res: any) => {
        // 后端按时间倒序返回，反转成时间正序展示
        setMessages((res.data.items ?? []).reverse())
        setLoadError('')
      })
      .catch(() => setLoadError('消息加载失败，请稍后重试'))
  }

  // 打开即拉取 + 3 秒轮询（组件卸载时清理定时器）
  useEffect(() => {
    fetchMessages()
    const timer = setInterval(fetchMessages, POLL_MS)
    return () => clearInterval(timer)
  }, [])

  // 新消息到达时自动滚动到底部（仅滚动消息容器，不带动页面）
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  // 发送消息：清空输入 → 立即刷新（不等下一轮询）
  const handleSend = () => {
    const content = input.trim()
    if (!content || sending) return
    setSending(true)
    http.post(userApi.messages, { content, product_id: productId ?? null })
      .then(() => {
        setInput('')
        fetchMessages()  // 发送后立即拉取（含自己刚发的消息）
      })
      .catch(() => setLoadError('发送失败，请重试'))
      .finally(() => setSending(false))
  }

  // 输入框回车发送（Shift+Enter 换行）
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // 时间显示：HH:mm（当天）/ MM-DD HH:mm（跨天）
  const fmtTime = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    return d.toDateString() === now.toDateString() ? hm : `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${hm}`
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: height ?? 520 }}>
      {/* ===== 消息区（scrollRef：自动滚动只作用于本容器，不带动页面） ===== */}
      <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', padding: '14px 12px', background: '#F7F1E3' }}>
        {loadError && (
          <div style={{ textAlign: 'center', color: '#C0392B', fontSize: 12, margin: '8px 0' }}>{loadError}</div>
        )}
        {!loadError && messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-weak)', fontSize: 12, margin: '20px 0' }}>
            您好，欢迎咨询天上宫阙！请描述您的需求，顾问将尽快回复。
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              display: 'flex', flexDirection: 'column',
              alignItems: m.sender === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: 12,
            }}
          >
            {/* 发送人 + 时间 */}
            <div style={{ fontSize: 10, color: '#9A8F80', margin: '0 4px 3px' }}>
              {m.sender === 'user' ? nickname : (m.admin_name ? `${m.admin_name} · 顾问` : '顾问')} {fmtTime(m.created_at)}
            </div>
            {/* 气泡 */}
            <div
              style={{
                maxWidth: '78%', padding: '8px 12px', borderRadius: 8,
                fontSize: 13.5, lineHeight: 1.6, wordBreak: 'break-word',
                whiteSpace: 'pre-wrap',
                background: m.sender === 'user' ? 'linear-gradient(135deg,#8C1F28,#A8323B)' : '#FFFFFF',
                color: m.sender === 'user' ? '#F6ECD7' : '#2B1D16',
                border: m.sender === 'user' ? 'none' : '1px solid rgba(201,169,106,.4)',
                boxShadow: '0 1px 3px rgba(43,29,22,.08)',
              }}
            >
              {m.content}
            </div>
          </div>
        ))}
        <div style={{ height: 1 }} />
      </div>

      {/* ===== 输入区 ===== */}
      <div style={{ padding: '10px 12px', background: '#FFFDF7', borderTop: '1px solid rgba(201,169,106,.35)', display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          placeholder="输入消息，Enter 发送，Shift+Enter 换行"
          maxLength={1000}
          style={{
            flex: 1, resize: 'none', border: '1px solid var(--line)', borderRadius: 4,
            padding: '7px 10px', fontSize: 13.5, background: '#FFF', outline: 'none',
            fontFamily: 'inherit', lineHeight: 1.5,
          }}
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          style={{
            background: '#8C1F28', color: '#F6ECD7', border: 'none', borderRadius: 4,
            padding: '8px 16px', fontSize: 13, cursor: sending || !input.trim() ? 'not-allowed' : 'pointer',
            opacity: sending || !input.trim() ? .5 : 1, whiteSpace: 'nowrap',
          }}
        >
          发送
        </button>
      </div>
    </div>
  )
}
