// =============================================================================
// src/components/ProductCard.tsx — 产品卡片
// -----------------------------------------------------------------------------
// 功能：前台产品卡（UI/UX §4.3 产品卡规范）——白底金边 + hover 上浮红边；
//       封面金框+内红细边相框（§3.7.2）；展示 名称/所属系列/规格/「¥xxx 起」；
//       精选产品带红 Tag（PRD F-3）。
// =============================================================================

import { Link } from 'react-router-dom'

import { ProductPlaceholder } from '@/assets/symbols'

// 产品列表项数据结构（对应 GET /api/public/products items）
export interface ProductItem {
  id: number
  name: string
  series: string | null
  model: string | null
  product_no: string
  cover_image: string | null
  price: string | null
  is_featured: boolean
  spec: string | null
  category_name?: string | null
}

export function ProductCard({ product, index = 0 }: { product: ProductItem; index?: number }) {
  return (
    <Link
      to={`/products/${product.id}`}
      className="product-card"
      style={{
        display: 'block',
        background: '#FFFDF7',
        border: '1px solid rgba(140,31,40,.24)',  // 卡片红边（UI/UX §3.7.1）
        borderRadius: 2,
        overflow: 'hidden',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'transform .25s, box-shadow .25s, border-color .25s',
      }}
    >
      {/* 封面区：图片占位或真实图，套金框+内红边相框（art-frame） */}
      <div className="art-frame" style={{ position: 'relative', aspectRatio: '4/3', background: '#3A0B0F' }}>
        {product.cover_image ? (
          <img
            src={product.cover_image}
            alt={product.name}
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <ProductPlaceholder kind={(index + 1) % 3 === 0 ? 'cake' : 'giftbox'} seed={product.id} />
        )}
        {/* 精选红 Tag（UI/UX §5.3 Tag 规范） */}
        {product.is_featured && (
          <span style={{ position: 'absolute', top: 10, left: 10, background: '#8C1F28', color: '#F6ECD7', fontSize: 11, letterSpacing: 1, padding: '2px 8px', borderRadius: 2 }}>
            精选
          </span>
        )}
      </div>

      {/* 信息区：名称/系列/规格/最低价起（PRD v2.2 确认展示 ¥xxx 起） */}
      <div style={{ padding: 14 }}>
        <div style={{ fontFamily: 'var(--font-title)', fontSize: 16, fontWeight: 600, color: 'var(--red-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {product.name}
        </div>
        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-weak)' }}>
          {[product.series, product.spec].filter(Boolean).join(' · ') || product.model}
        </div>
        <div style={{ marginTop: 10, fontSize: 15, fontWeight: 700, color: '#8C1F28', letterSpacing: 1 }}>
          {product.price ? `${product.price} 起` : '价格面议'}
        </div>
      </div>

      {/* hover 上浮 + 红边强化（UI/UX §4.3） */}
      <style>{`
        .product-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-card);
          border-color: var(--red-3);
        }
      `}</style>
    </Link>
  )
}
