// =============================================================================
// src/components/PermissionCTA.tsx — 权限双态 CTA（权限分水岭核心组件）
// -----------------------------------------------------------------------------
// 功能：受限操作按钮的双态渲染（UI/UX §4.3 权限双态 CTA + §6.5）：
//       · 未登录：弱化金色描边「登录后可预约/咨询」→ 点击弹出登录弹窗，
//         并携带回跳动作（登录成功后自动执行 onGuestReturn，如展开意向表单）
//       · 已登录：红底米字「立即预约/咨询顾问」→ 点击执行 onLoggedIn
// =============================================================================

import { useAuthStore } from '@/store/auth'
import { useUiStore } from '@/store/ui'

interface PermissionCTAProps {
  guestLabel: string        // 未登录文案（如 登录后可预约）
  userLabel: string         // 已登录文案（如 立即预约）
  variant?: 'primary' | 'ghost'  // 已登录态按钮风格（红底 / 描边）
  onLoggedIn: () => void    // 已登录点击动作（如打开预约/咨询弹窗或解锁表单）
  onGuestReturn?: () => void  // 未登录回跳动作（登录成功后执行，实现回跳原操作）
}

export function PermissionCTA({
  guestLabel, userLabel, variant = 'primary', onLoggedIn, onGuestReturn,
}: PermissionCTAProps) {
  const isLogin = useAuthStore((s) => s.isLogin)
  const openLogin = useUiStore((s) => s.openLogin)

  // 未登录：弱化双态按钮 → 点击打开登录弹窗（携带回跳动作）
  if (!isLogin) {
    return (
      <button
        onClick={() => openLogin(onGuestReturn ?? undefined)}
        style={{
          background: 'transparent',
          border: '1px solid var(--gold)',
          color: 'var(--gold-dark)',
          borderRadius: 2,
          padding: '10px 22px',
          fontSize: 14,
          letterSpacing: 2,
          cursor: 'pointer',
          opacity: .85,
          transition: 'all .2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(201,169,106,.12)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        {guestLabel}
      </button>
    )
  }

  // 已登录：主按钮（红底米字）或描边按钮
  const primary = variant === 'primary'
  return (
    <button
      onClick={onLoggedIn}
      style={{
        background: primary ? 'var(--red)' : 'transparent',
        border: primary ? 'none' : '1px solid var(--red)',
        color: primary ? '#F6ECD7' : 'var(--red)',
        borderRadius: 2,
        padding: '10px 22px',
        fontSize: 14,
        letterSpacing: 2,
        cursor: 'pointer',
        transition: 'all .2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = primary ? 'var(--red-2)' : 'rgba(140,31,40,.08)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = primary ? 'var(--red)' : 'transparent'
      }}
    >
      {userLabel}
    </button>
  )
}
