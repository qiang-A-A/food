// =============================================================================
// src/components/PageBanner.tsx — 内页横幅
// -----------------------------------------------------------------------------
// 功能：内页顶部横幅（UI/UX §3.1.2 页面 Banner 渐变 + 金色底边线），
//       展示页面中文标题与英文点缀。
// =============================================================================

interface PageBannerProps {
  title: string   // 页面中文标题（如 产品系列）
  en?: string     // 英文点缀（可选）
}

export function PageBanner({ title, en }: PageBannerProps) {
  return (
    <div
      style={{
        background: 'var(--grad-banner)',  // 红渐变（内页 Banner）
        borderBottom: '2px solid var(--gold)',  // 金色底边线
        padding: '46px 24px',
        textAlign: 'center',
        marginBottom: 32,
      }}
    >
      <h1
        style={{
          fontFamily: 'var(--font-title)',
          fontSize: 34,
          fontWeight: 700,
          letterSpacing: 8,
          color: '#F6ECD7',  // 米字（深红底上对比度 ≈8.7:1）
          margin: 0,
        }}
      >
        {title}
      </h1>
      {en && (
        <div style={{ marginTop: 8, fontSize: 12, letterSpacing: 6, color: 'var(--gold-light)', textTransform: 'uppercase' }}>
          {en}
        </div>
      )}
    </div>
  )
}
