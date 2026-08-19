// =============================================================================
// src/pages/NotFound.tsx — 404 页（PRD F-7）
// -----------------------------------------------------------------------------
// 功能：大号红色 404 + 「宫阙深处 · 未见此页」 + 返回首页按钮（UI/UX §4.4.13）。
// =============================================================================

import { Link } from 'react-router-dom'

import { PalaceIcon } from '@/assets/symbols'

export default function NotFound() {
  return (
    <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 24px', position: 'relative', overflow: 'hidden' }}>
      {/* 大号红色 404 */}
      <div style={{ fontFamily: 'var(--font-title)', fontSize: 'clamp(96px,18vw,160px)', fontWeight: 900, color: '#8C1F28', lineHeight: 1, letterSpacing: 8 }}>
        404
      </div>
      <div style={{ marginTop: 16, fontFamily: 'var(--font-title)', fontSize: 22, color: 'var(--red-3)', letterSpacing: 6 }}>
        宫阙深处 · 未见此页
      </div>
      <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text-weak)' }}>
        您访问的页面不存在或已迁移
      </div>
      <Link
        to="/"
        style={{ marginTop: 28, background: 'var(--red)', color: '#F6ECD7', padding: '11px 36px', borderRadius: 2, textDecoration: 'none', fontSize: 14, letterSpacing: 4 }}
      >
        返回首页
      </Link>
      {/* 底部宫殿祥云装饰（低透明度，不遮挡内容） */}
      <div style={{ position: 'absolute', bottom: -30, left: '50%', transform: 'translateX(-50%)', opacity: .12, width: 420 }}>
        <PalaceIcon />
      </div>
    </div>
  )
}
