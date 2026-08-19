// =============================================================================
// src/pages/Products.tsx — 产品系列列表（PRD F-3）
// -----------------------------------------------------------------------------
// 功能：品类筛选 Tab（全部 + 5 品类：御点珍馐/节令礼盒/宫廷茶点/商务套装/
//       高端定制）→ 产品卡网格（4 列，展示名称/系列/规格/¥xxx 起）→ 分页。
// 数据：GET /api/public/products（category_id/category_slug/keyword/分页）+ /categories。
// =============================================================================

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom' // 品类/页码与 URL 联动

import { http } from '@/api/http'
import { publicApi } from '@tsgq/api-client'
import { PageBanner } from '@/components/PageBanner'
import { ProductCard, type ProductItem } from '@/components/ProductCard'

interface Category { id: number; name: string; slug: string }
interface PageData { items: ProductItem[]; total: number; page: number; page_size: number; pages: number }

const PAGE_SIZE = 8  // 每页 8 个（PRD F-3）

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [cats, setCats] = useState<Category[]>([])
  const [data, setData] = useState<PageData | null>(null)
  const [loading, setLoading] = useState(true)

  // 当前筛选：slug（全部=空）+ 页码（读 URL）
  const activeSlug = searchParams.get('slug') ?? ''
  const page = Number(searchParams.get('page') ?? '1')

  // 加载品类列表
  useEffect(() => {
    http.get(publicApi.categories).then((res: any) => setCats(res.data)).catch(() => setCats([]))
  }, [])

  // 加载产品列表（依赖品类/页码变化）
  useEffect(() => {
    setLoading(true)
    const params: any = { page, page_size: PAGE_SIZE }
    if (activeSlug) params.category_slug = activeSlug
    http.get(publicApi.products, { params })
      .then((res: any) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [activeSlug, page])

  // 切换品类/页码：更新 URL（保持可分享/可回退）
  const navigateTo = useCallback((slug: string, pg: number) => {
    const next: Record<string, string> = {}
    if (slug) next.slug = slug
    if (pg > 1) next.page = String(pg)
    setSearchParams(next)
  }, [setSearchParams])

  return (
    <div>
      <PageBanner title="产品系列" en="Products" />

      <div className="container">
        {/* ===== 品类筛选 Tab（全部 + 5 品类，UI/UX §4.4.3） ===== */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginBottom: 26 }}>
          <TabBtn label="全部" active={activeSlug === ''} onClick={() => navigateTo('', 1)} />
          {cats.map((c) => (
            <TabBtn key={c.id} label={c.name} active={activeSlug === c.slug} onClick={() => navigateTo(c.slug, 1)} />
          ))}
        </div>

        {/* ===== 产品网格（4 列） ===== */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-weak)' }}>加载中…</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 18 }}>
              {(data?.items ?? []).map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
              {(data?.items ?? []).length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-weak)', padding: 50, fontSize: 13 }}>
                  该品类暂无上架产品，敬请期待
                </div>
              )}
            </div>

            {/* ===== 分页（PRD F-3：每页 8） ===== */}
            {(data?.pages ?? 0) > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 32 }}>
                <PageBtn label="‹" disabled={page <= 1} onClick={() => navigateTo(activeSlug, page - 1)} />
                {Array.from({ length: data?.pages ?? 0 }, (_, i) => i + 1).map((p) => (
                  <PageBtn key={p} label={String(p)} active={p === page} onClick={() => navigateTo(activeSlug, p)} />
                ))}
                <PageBtn label="›" disabled={page >= (data?.pages ?? 1)} onClick={() => navigateTo(activeSlug, page + 1)} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// 品类 Tab 按钮（active 红底米字，UI/UX §4.3 系列 Tab）
function TabBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 22px',
        border: active ? '1px solid #8C1F28' : '1px solid var(--line)',
        background: active ? '#8C1F28' : '#FFFDF7',
        color: active ? '#F6ECD7' : '#666',
        borderRadius: 2,
        cursor: 'pointer',
        fontSize: 14,
        letterSpacing: 1,
        transition: 'all .2s',
      }}
    >
      {label}
    </button>
  )
}

// 分页按钮（active 红底米字，UI/UX §4.3 分页）
function PageBtn({ label, active, disabled, onClick }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        minWidth: 34,
        height: 34,
        border: active ? '1px solid #8C1F28' : '1px solid var(--line)',
        background: active ? '#8C1F28' : '#FFFDF7',
        color: active ? '#F6ECD7' : '#666',
        borderRadius: 2,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? .4 : 1,
        fontSize: 14,
      }}
    >
      {label}
    </button>
  )
}
