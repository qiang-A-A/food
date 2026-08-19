// =============================================================================
// src/components/ChatWidget.tsx — 在线顾问聊天弹窗（咨询顾问，浮窗壳）
// -----------------------------------------------------------------------------
// 功能：类微信右下角浮窗外壳，内部复用 ChatPanel（数据/气泡/输入/轮询）。
//       · 产品详情页「咨询顾问」按钮打开，携带 productId 供后台溯源
//       · 登录态由调用方保证（PermissionCTA 已登录才打开）
// =============================================================================

import { ChatPanel } from '@/components/ChatPanel'

interface ChatWidgetProps {
  productId?: number | null  // 来源产品（产品详情页咨询时携带）
  onClose: () => void        // 关闭弹窗
}

export function ChatWidget({ productId, onClose }: ChatWidgetProps) {
  return (
    <div
      role="dialog"
      aria-label="在线顾问聊天"
      style={{
        position: 'fixed', right: 24, bottom: 24, zIndex: 1000,
        width: 'min(380px, calc(100vw - 32px))', height: 520,
        maxHeight: 'calc(100vh - 48px)',
        background: '#FFFDF7', borderRadius: 6, overflow: 'hidden',
        boxShadow: '0 16px 48px rgba(43,29,22,.28)',
        display: 'flex', flexDirection: 'column',
        border: '1px solid var(--gold)',
      }}
    >
      {/* ===== 头部：品牌 + 关闭 ===== */}
      <div style={{
        background: 'linear-gradient(135deg,#8C1F28 0%,#A8323B 100%)',
        padding: '14px 16px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div>
          <div style={{ color: '#F6ECD7', fontFamily: 'var(--font-title)', fontSize: 15, fontWeight: 700, letterSpacing: 1 }}>
            天上宫阙 · 在线顾问
          </div>
          <div style={{ color: 'rgba(246,236,215,.75)', fontSize: 11, marginTop: 2 }}>
            在线咨询 · 工作时间 9:00-18:00
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="关闭聊天"
          style={{
            background: 'rgba(255,255,255,.15)', border: 'none', color: '#F6ECD7',
            width: 28, height: 28, borderRadius: '50%', cursor: 'pointer',
            fontSize: 15, lineHeight: '28px',
          }}
        >
          ×
        </button>
      </div>

      {/* ===== 聊天核心（自适应剩余高度） ===== */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <ChatPanel productId={productId} height="100%" />
        </div>
      </div>
    </div>
  )
}
