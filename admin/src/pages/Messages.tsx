// =============================================================================
// src/pages/Messages.tsx — 消息管理（B-12，咨询聊天）
// -----------------------------------------------------------------------------
// 功能：左侧会话列表（会员昵称/手机号、来源产品名、最近消息预览、未读 Badge、
//       时间）+ 右侧聊天窗口（消息气泡 + 回复输入）。
//       · 打开会话即标记已读（后端处理）→ 刷新全局未读角标（store.refresh）
//       · 会话列表 5 秒轮询（新会员消息实时出现）；打开会话后 3 秒轮询消息
//       · 会话项展示「来源产品」：满足需求——显示用户从哪款产品页面发起
// 数据：GET /conversations、GET /{user_id}、POST /{user_id}（adminApi.messages）。
// =============================================================================

import { useCallback, useEffect, useRef, useState } from 'react'
import { Avatar, Empty, Input, Spin } from 'antd'
import { MessageOutlined, UserOutlined } from '@ant-design/icons'

import { http } from '@/api/http'
import { adminApi } from '@tsgq/api-client'
import { useMessagesStore } from '@/store/messages'

// 会话列表项（与后端 ConversationOut 对齐）
interface Conversation {
  user_id: number
  user_nickname: string | null
  user_phone: string | null
  user_avatar: string | null
  last_message: string | null
  last_sender: string | null
  last_time: string | null
  unread: number
  product_id: number | null
  product_name: string | null
}

// 消息（与后端 MessageOut 对齐）
interface ChatMsg {
  id: number
  sender: string
  admin_name?: string | null
  content: string
  created_at: string
}

// 轮询间隔
const LIST_POLL_MS = 5000   // 会话列表
const CHAT_POLL_MS = 3000   // 打开会话后的消息

export default function Messages() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeUserId, setActiveUserId] = useState<number | null>(null)
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [activeUser, setActiveUser] = useState<{ nickname: string | null; phone: string | null; avatar: string | null } | null>(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingList, setLoadingList] = useState(true)
  const refreshUnread = useMessagesStore((s) => s.refresh)
  const bottomRef = useRef<HTMLDivElement>(null)

  // ---- 会话列表：5 秒轮询 ----
  const fetchConversations = useCallback(() => {
    http.get(adminApi.messagesConversations)
      .then((res: any) => { setConversations(res.data.items ?? []); setLoadingList(false) })
      .catch(() => setLoadingList(false))
  }, [])
  useEffect(() => {
    fetchConversations()
    const timer = setInterval(fetchConversations, LIST_POLL_MS)
    return () => clearInterval(timer)
  }, [fetchConversations])

  // ---- 打开会话：拉取记录（后端标记已读）+ 刷新角标 + 3 秒轮询消息 ----
  const openConversation = useCallback((userId: number) => {
    setActiveUserId(userId)
    http.get(adminApi.messages.replace(/\/*$/, '') + `/${userId}`)
      .then((res: any) => {
        setActiveUser(res.data.user)
        setMessages(res.data.items ?? [])
        refreshUnread()  // 已读 → 全局角标即时减小（需求：点开后角标相应减小）
      })
      .catch(() => setActiveUser(null))
  }, [refreshUnread])

  // 打开会话后 3 秒轮询消息（管理员回复后前台会员可见；新消息实时到达）
  useEffect(() => {
    if (!activeUserId) return
    const fetchChat = () => {
      http.get(adminApi.messages.replace(/\/*$/, '') + `/${activeUserId}`)
        .then((res: any) => {
          setMessages(res.data.items ?? [])
          setActiveUser(res.data.user)
          // 轮询拉取会顺带标记已读，同步刷新角标
          refreshUnread()
        })
        .catch(() => { /* 静默 */ })
    }
    const timer = setInterval(fetchChat, CHAT_POLL_MS)
    return () => clearInterval(timer)
  }, [activeUserId, refreshUnread])

  // 新消息自动滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ---- 管理员回复 ----
  const handleReply = () => {
    const content = input.trim()
    if (!content || sending || !activeUserId) return
    setSending(true)
    http.post(adminApi.messages.replace(/\/*$/, '') + `/${activeUserId}`, { content })
      .then(() => {
        setInput('')
        // 回复后立即刷新（不等轮询）
        return http.get(adminApi.messages.replace(/\/*$/, '') + `/${activeUserId}`)
      })
      .then((res: any) => {
        setMessages(res.data.items ?? [])
        refreshUnread()
      })
      .catch(() => { /* 静默 */ })
      .finally(() => setSending(false))
  }

  // 时间显示
  const fmtTime = (iso: string | null) => {
    if (!iso) return ''
    const d = new Date(iso)
    const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    const now = new Date()
    return d.toDateString() === now.toDateString() ? hm : `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${hm}`
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px - 40px)', minHeight: 480, background: '#FFF', border: '1px solid #E8E8E8', borderRadius: 4, overflow: 'hidden' }}>
      {/* ===== 左：会话列表 ===== */}
      <div style={{ width: 300, flexShrink: 0, borderRight: '1px solid #F0F0F0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #F0F0F0', fontWeight: 600, fontSize: 14, color: '#333', display: 'flex', alignItems: 'center', gap: 8 }}>
          <MessageOutlined style={{ color: '#8C1F28' }} /> 会话列表
          <span style={{ fontSize: 12, color: '#999', fontWeight: 400 }}>（{conversations.length}）</span>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {loadingList && conversations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Spin size="small" /></div>
          ) : conversations.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无会话" style={{ marginTop: 60 }} />
          ) : (
            conversations.map((c) => (
              <button
                key={c.user_id}
                onClick={() => openConversation(c.user_id)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                  padding: '12px 14px', borderBottom: '1px solid #FAFAFA',
                  background: activeUserId === c.user_id ? '#FFF1F0' : '#FFF',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar size={36} style={{ background: '#8C1F28', flexShrink: 0 }} icon={<UserOutlined />} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.user_nickname || '会员'}
                      </span>
                      <span style={{ fontSize: 11, color: '#999', flexShrink: 0, marginLeft: 6 }}>{fmtTime(c.last_time)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#999', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.last_sender === 'admin' ? '顾问：' : ''}{c.last_message || '（空）'}
                    </div>
                    {/* 来源产品 + 未读数 */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 }}>
                      <span style={{ fontSize: 11, color: '#A8863F', background: '#FDF6E8', borderRadius: 2, padding: '1px 6px', maxWidth: '70%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.product_name ? `来自产品：${c.product_name}` : '直接咨询'}
                      </span>
                      {c.unread > 0 && (
                        <span style={{ background: '#FF4D4F', color: '#FFF', borderRadius: 10, minWidth: 18, height: 18, lineHeight: '18px', textAlign: 'center', fontSize: 11, padding: '0 5px' }}>
                          {c.unread > 99 ? '99+' : c.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ===== 右：聊天窗口 ===== */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {!activeUserId ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
            <Empty description="选择左侧会话开始回复" style={{ transform: 'translateY(-40px)' }} />
          </div>
        ) : (
          <>
            {/* 会话头：会员信息 */}
            <div style={{ padding: '12px 18px', borderBottom: '1px solid #F0F0F0', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar size={34} style={{ background: '#8C1F28' }} icon={<UserOutlined />} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#333' }}>{activeUser?.nickname || '会员'}</div>
                <div style={{ fontSize: 12, color: '#999' }}>{activeUser?.phone || ''}</div>
              </div>
            </div>

            {/* 消息区 */}
            <div style={{ flex: 1, overflow: 'auto', padding: '16px 18px', background: '#F7F7F7' }}>
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', color: '#BBB', fontSize: 13, marginTop: 60 }}>暂无消息，等待会员发起咨询</div>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: m.sender === 'admin' ? 'flex-end' : 'flex-start',
                    marginBottom: 14,
                  }}
                >
                  <div style={{ fontSize: 11, color: '#AAA', margin: '0 4px 3px' }}>
                    {m.sender === 'admin' ? (m.admin_name ? `${m.admin_name}（顾问）` : '顾问') : activeUser?.nickname || '会员'} {fmtTime(m.created_at)}
                  </div>
                  <div
                    style={{
                      maxWidth: '70%', padding: '9px 13px', borderRadius: 8, fontSize: 13.5, lineHeight: 1.6,
                      wordBreak: 'break-word', whiteSpace: 'pre-wrap',
                      background: m.sender === 'admin' ? '#8C1F28' : '#FFF',
                      color: m.sender === 'admin' ? '#F6ECD7' : '#333',
                      border: m.sender === 'admin' ? 'none' : '1px solid #E8E8E8',
                      boxShadow: '0 1px 2px rgba(0,0,0,.05)',
                    }}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* 回复输入区 */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid #F0F0F0', display: 'flex', gap: 10, alignItems: 'flex-end', background: '#FFF' }}>
              <Input.TextArea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onPressEnter={(e) => { e.preventDefault(); handleReply() }}
                rows={2}
                maxLength={1000}
                placeholder="回复该会员，Enter 发送，Shift+Enter 换行"
                style={{ resize: 'none', fontSize: 13.5 }}
              />
              <button
                onClick={handleReply}
                disabled={sending || !input.trim()}
                style={{
                  background: '#8C1F28', color: '#F6ECD7', border: 'none', borderRadius: 4,
                  padding: '8px 20px', fontSize: 13, cursor: sending || !input.trim() ? 'not-allowed' : 'pointer',
                  opacity: sending || !input.trim() ? .5 : 1, whiteSpace: 'nowrap', flexShrink: 0,
                }}
              >
                发送回复
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
