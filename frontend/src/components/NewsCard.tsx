// =============================================================================
// src/components/NewsCard.tsx — 新闻卡片（列表行/首页预览）
// -----------------------------------------------------------------------------
// 功能：新闻列表项（UI/UX §4.4.5）——标题/日期/摘要；首页新闻卡白底金边
//       + hover 上浮；封面图套金框相框。
// =============================================================================

import { Link } from 'react-router-dom'

// 新闻项数据结构（对应 GET /api/public/news items）
export interface NewsItem {
  id: number
  title: string
  summary: string | null
  cover_image: string | null
  publish_date: string
  is_top: boolean
}

export function NewsCard({ news }: { news: NewsItem }) {
  // 格式化日期：ISO → YYYY-MM-DD
  const date = (news.publish_date || '').slice(0, 10)
  return (
    <Link
      to={`/news/${news.id}`}
      className="news-card"
      style={{
        display: 'block',
        background: '#FFFDF7',
        border: '1px solid rgba(140,31,40,.24)',
        borderRadius: 2,
        overflow: 'hidden',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'transform .25s, box-shadow .25s, border-color .25s',
      }}
    >
      {/* 封面（可选）：金框相框 */}
      {news.cover_image && (
        <div className="art-frame" style={{ aspectRatio: '16/9' }}>
          <img src={news.cover_image} alt={news.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}
      <div style={{ padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* 置顶红 Tag（UI/UX §5.3） */}
          {news.is_top && <span style={{ background: '#8C1F28', color: '#F6ECD7', fontSize: 10, padding: '1px 6px', borderRadius: 2 }}>置顶</span>}
          <span style={{ fontSize: 12, color: 'var(--text-weak)' }}>{date}</span>
        </div>
        <div style={{ marginTop: 8, fontFamily: 'var(--font-title)', fontSize: 16, fontWeight: 600, color: 'var(--red-3)', lineHeight: 1.5 }}>
          {news.title}
        </div>
        {news.summary && (
          <div style={{ marginTop: 6, fontSize: 13, color: 'var(--text-weak)', lineHeight: 1.7, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {news.summary}
          </div>
        )}
      </div>
      <style>{`.news-card:hover{transform:translateY(-4px);box-shadow:var(--shadow-card);border-color:var(--red-3)}`}</style>
    </Link>
  )
}
