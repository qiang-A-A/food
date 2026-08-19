// =============================================================================
// src/components/RichText.tsx — 富文本安全渲染
// -----------------------------------------------------------------------------
// 功能：渲染后端返回的富文本 HTML（新闻正文/产品描述）。
//       安全：渲染前经 DOMPurify 二次净化（开发技术文档 §5.5 双重净化，
//       后端 nh3 入库净化 + 前端 DOMPurify 渲染前净化）。
// =============================================================================

import DOMPurify from 'dompurify'

interface RichTextProps {
  html?: string | null   // 富文本 HTML
  className?: string
}

export function RichText({ html, className }: RichTextProps) {
  if (!html) return null
  // DOMPurify 白名单净化（默认配置已覆盖 p/img/video/iframe 等常用标签）
  const safe = DOMPurify.sanitize(html, {
    ADD_ATTR: ['target'],  // 允许 a 标签 target
  })
  return (
    <div
      className={`rich-text ${className ?? ''}`}
      dangerouslySetInnerHTML={{ __html: safe }}  // 已净化的 HTML 才能注入
      style={{ lineHeight: 1.8, fontSize: 15 }}
    />
  )
}
