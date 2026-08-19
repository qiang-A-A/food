// =============================================================================
// src/pages/Placeholder.tsx — 页面占位组件
// -----------------------------------------------------------------------------
// 功能：M1 阶段统一占位页，展示页面名与背景图案说明；
//       M4 阶段各路由将替换为真实页面组件（本组件届时移除）。
// 说明：standalone 用于认证页/404（居中卡片式布局，无导航页脚）。
// =============================================================================

interface PlaceholderProps {
  name: string        // 页面中文名
  standalone?: boolean // 是否为独立布局（登录/注册/404）
}

export function Placeholder({ name, standalone = false }: PlaceholderProps) {
  // 独立布局：全屏居中卡片
  if (standalone) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#fffdf7', border: '1px solid var(--line)', padding: '48px 64px', textAlign: 'center', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ fontFamily: 'var(--font-title)', fontSize: 28, color: 'var(--red-3)', letterSpacing: 4 }}>{name}</div>
          <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-weak)' }}>页面建设中（M4 实现）</div>
        </div>
      </div>
    )
  }

  // 常规布局：区块标题风格占位
  return (
    <div className="section-title">
      <div className="cn">{name}</div>
      <div className="en">TIANSHANGGONGQUE</div>
      <div className="gold-divider" />
      <p style={{ fontSize: 13, color: 'var(--text-weak)' }}>该页面将在 M4 阶段实现（背景：{name}专属宫廷线稿）</p>
    </div>
  )
}
