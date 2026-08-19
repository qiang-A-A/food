// =============================================================================
// src/pages/NewsDetail.tsx — 新闻详情（PRD F-4）
// -----------------------------------------------------------------------------
// 功能：居中 800px 容器 → 标题 + 日期 + 红色分隔线 + 富文本正文
//       （支持图片/视频渲染，DOMPurify 二次净化）。
// 数据：GET /api/public/news/{id}。
// =============================================================================

import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { http } from '@/api/http'
import { publicApi } from '@tsgq/api-client'
import { RichText } from '@/components/RichText'

interface NewsDetail {
  id: number
  title: string
  summary: string | null
  content: string | null
  publish_date: string
  is_top: boolean
}

export default function NewsDetail() {
  const { id } = useParams()
  const [news, setNews] = useState<NewsDetail | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    http.get(publicApi.newsDetail(id))
      .then((res: any) => setNews(res.data))
      .catch(() => setNotFound(true))
  }, [id])

  if (notFound) return <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-weak)' }}>新闻不存在</div>
  if (!news) return <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-weak)' }}>加载中…</div>

  return (
    <div className="container" style={{ maxWidth: 800, padding: '40px 24px' }}>
      {/* 标题 */}
      <h1 style={{ fontFamily: 'var(--font-title)', fontSize: 28, fontWeight: 700, color: 'var(--red-3)', lineHeight: 1.5 }}>
        {news.title}
      </h1>
      {/* 日期 */}
      <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-weak)' }}>
        {(news.publish_date || '').slice(0, 10)}
        {news.is_top && <span style={{ marginLeft: 10, background: '#8C1F28', color: '#F6ECD7', fontSize: 10, padding: '1px 6px', borderRadius: 2 }}>置顶</span>}
      </div>
      {/* 红色分隔线 */}
      <div style={{ height: 1, background: 'linear-gradient(90deg,transparent,#8C1F28,transparent)', margin: '18px 0 24px' }} />

      {/* 富文本正文（支持图片/视频，二次净化后渲染） */}
      <RichText html={news.content} />

      {/* 摘要兜底（无正文时） */}
      {!news.content && news.summary && <p style={{ fontSize: 14, lineHeight: 1.9 }}>{news.summary}</p>}
    </div>
  )
}
