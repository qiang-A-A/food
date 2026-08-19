// =============================================================================
// src/pages/News.tsx — 新闻资讯列表（PRD F-4）
// -----------------------------------------------------------------------------
// 功能：新闻行列表（标题/日期/摘要）+ 分页；置顶优先展示。
// 数据：GET /api/public/news。
// =============================================================================

import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { http } from '@/api/http'
import { publicApi } from '@tsgq/api-client'
import { PageBanner } from '@/components/PageBanner'
import type { NewsItem } from '@/components/NewsCard'

const PAGE_SIZE = 10

export default function News() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [data, setData] = useState<{ items: NewsItem[]; total: number; page: number; pages: number } | null>(null)
  const page = Number(searchParams.get('page') ?? '1')

  useEffect(() => {
    http.get(publicApi.news, { params: { page, page_size: PAGE_SIZE } })
      .then((res: any) => setData(res.data))
      .catch(() => setData(null))
  }, [page])

  const goPage = (p: number) => setSearchParams(p > 1 ? { page: String(p) } : {})

  return (
    <div>
      <PageBanner title="新闻资讯" en="News" />
      <div className="container" style={{ maxWidth: 900 }}>
        {(data?.items ?? []).map((n) => (
          <Link
            key={n.id}
            to={`/news/${n.id}`}
            style={{
              display: 'block',
              background: '#FFFDF7',
              border: '1px solid var(--line)',
              borderLeft: '3px solid #8C1F28',
              borderRadius: 2,
              padding: '18px 22px',
              marginBottom: 14,
              textDecoration: 'none',
              color: 'inherit',
              transition: 'transform .2s, box-shadow .2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateX(4px)'; e.currentTarget.style.boxShadow = 'var(--shadow-card)' }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--text-weak)' }}>
              {n.is_top && <span style={{ background: '#8C1F28', color: '#F6ECD7', fontSize: 10, padding: '1px 6px', borderRadius: 2 }}>置顶</span>}
              <span>{(n.publish_date || '').slice(0, 10)}</span>
              <span style={{ marginLeft: 'auto', color: 'var(--gold-dark)' }}>阅读详情 →</span>
            </div>
            <div style={{ marginTop: 8, fontFamily: 'var(--font-title)', fontSize: 17, fontWeight: 600, color: 'var(--red-3)' }}>{n.title}</div>
            {n.summary && <div style={{ marginTop: 6, fontSize: 13, color: 'var(--text-weak)', lineHeight: 1.7 }}>{n.summary}</div>}
          </Link>
        ))}

        {(data?.items ?? []).length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-weak)' }}>暂无新闻</div>
        )}

        {(data?.pages ?? 0) > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 28 }}>
            {Array.from({ length: data?.pages ?? 0 }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => goPage(p)}
                style={{
                  minWidth: 34, height: 34,
                  border: p === page ? '1px solid #8C1F28' : '1px solid var(--line)',
                  background: p === page ? '#8C1F28' : '#FFFDF7',
                  color: p === page ? '#F6ECD7' : '#666',
                  borderRadius: 2, cursor: 'pointer',
                }}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
