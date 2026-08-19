// =============================================================================
// src/components/StatusTag.tsx — 状态标签（品牌语义色）
// -----------------------------------------------------------------------------
// 功能：业务状态统一 Tag 渲染（UI/UX §5.3 Tag 规范 + §3.1.3 语义色）：
//       · 团购意向四态：待跟进 金 / 已联系 蓝 / 已成交 绿 / 已关闭 灰
//       · 产品精选：金「精选」；新闻置顶：红「置顶」
//       · 通用启用/停用：绿/灰
// =============================================================================

import { Tag } from 'antd'

// 意向状态 → 颜色与文案
const INTENT_STATUS: Record<string, { color: string; text: string }> = {
  pending: { color: 'gold', text: '待跟进' },
  contacted: { color: 'blue', text: '已联系' },
  deal: { color: 'green', text: '已成交' },
  closed: { color: 'default', text: '已关闭' },
}

// 产品发布状态 → 颜色与文案（草稿仅后台可见）
const PUBLISH_STATUS: Record<string, { color: string; text: string }> = {
  on: { color: 'green', text: '上架' },
  off: { color: 'default', text: '下架' },
  draft: { color: 'orange', text: '草稿' },
}

// 通用布尔状态
const BOOL_STATUS: Record<string, { color: string; text: string }> = {
  true: { color: 'green', text: '启用' },
  false: { color: 'default', text: '停用' },
}

export function IntentStatusTag({ status }: { status: string }) {
  const s = INTENT_STATUS[status] ?? { color: 'default', text: status }
  return <Tag color={s.color}>{s.text}</Tag>
}

export function PublishStatusTag({ status }: { status: string }) {
  const s = PUBLISH_STATUS[status] ?? { color: 'default', text: status }
  return <Tag color={s.color}>{s.text}</Tag>
}

export function BoolStatusTag({ value }: { value: boolean }) {
  const s = BOOL_STATUS[String(value)] ?? BOOL_STATUS.false
  return <Tag color={s.color}>{s.text}</Tag>
}

export function FeaturedTag({ featured }: { featured: boolean }) {
  return featured ? <Tag color="gold">精选</Tag> : null
}

export function TopTag({ top }: { top: boolean }) {
  return top ? <Tag color="red">置顶</Tag> : null
}
