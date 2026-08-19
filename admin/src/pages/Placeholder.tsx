// =============================================================================
// src/pages/Placeholder.tsx — 后台页面占位组件
// -----------------------------------------------------------------------------
// 功能：M1 阶段统一占位页，展示模块名与实施阶段提示；M5 逐个替换。
// =============================================================================

interface PlaceholderProps {
  name: string        // 模块中文名
  standalone?: boolean // 独立布局（超管登录页）
}

export function Placeholder({ name, standalone = false }: PlaceholderProps) {
  // 超管登录占位：居中卡片
  if (standalone) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F5F5' }}>
        <div style={{ background: '#fff', padding: '40px 56px', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 600, color: '#6E161D', marginBottom: 8 }}>{name}</div>
          <div style={{ fontSize: 13, color: '#999' }}>超管登录页将在 M5 实现</div>
        </div>
      </div>
    )
  }

  // 常规占位：页面标题 + 提示
  return (
    <div>
      <div className="admin-page-title">{name}</div>
      <div style={{ background: '#fff', border: '1px solid #E8E8E8', padding: 40, textAlign: 'center', color: '#999', fontSize: 13 }}>
        {name} 模块将在 M5 阶段实现
      </div>
    </div>
  )
}
