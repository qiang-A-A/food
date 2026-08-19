// =============================================================================
// src/components/SectionTitle.tsx — 区块标题（红菱 + 中文大标题 + 英文点缀）
// -----------------------------------------------------------------------------
// 功能：前台统一区块标题组件（UI/UX §3.5.1 结构性红菱 + §3.8 金色分隔线），
//       用于首页/内页各内容区块顶部。
// =============================================================================

interface SectionTitleProps {
  cn: string    // 中文标题（深红宋体 + 两侧红菱）
  en?: string   // 英文装饰点缀（金色小字，如 TIANSHANGGONGQUE）
}

export function SectionTitle({ cn, en }: SectionTitleProps) {
  return (
    <div className="section-title">
      <div className="cn">{cn}</div>
      {en && <div className="en">{en}</div>}
      <div className="gold-divider" />
    </div>
  )
}
