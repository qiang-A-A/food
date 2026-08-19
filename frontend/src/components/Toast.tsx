// =============================================================================
// src/components/Toast.tsx — 全局轻提示
// -----------------------------------------------------------------------------
// 功能：顶部居中 Toast（UI/UX §6.3：成功绿边 / 失败红边，2.6s 消失），
//       由 ui store 驱动，挂载在 App 根部。
// =============================================================================

import { useUiStore } from '@/store/ui'

export function Toast() {
  const toast = useUiStore((s) => s.toast)

  if (!toast) return null
  // 成功：绿边；失败：红边（UI/UX §3.1.3 语义色）
  const borderColor = toast.type === 'ok' ? '#52C41A' : '#8C1F28'

  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        top: 18,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 2000,
        background: '#FFFDF7',
        border: `1px solid ${borderColor}`,
        borderLeft: `4px solid ${borderColor}`,
        borderRadius: 2,
        padding: '10px 22px',
        fontSize: 14,
        color: '#2B1D16',
        boxShadow: '0 6px 24px rgba(43,29,22,.18)',
        animation: 'toastIn .25s ease',
      }}
    >
      {toast.text}
      <style>{`@keyframes toastIn{from{transform:translate(-50%,-10px);opacity:0}to{transform:translate(-50%,0);opacity:1}}`}</style>
    </div>
  )
}
