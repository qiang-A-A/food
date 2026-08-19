// =============================================================================
// src/pages/ProductDetail.tsx — 产品详情（PRD F-3）
// -----------------------------------------------------------------------------
// 功能：左图区（产品实拍图/礼盒包装图 Tab + 缩略图切换）右信息区（产品编号/
//       所属系列/金色分隔线/规格参数表/食品合规字段/富文本描述）→
//       权限双态 CTA（未登录「登录后可预约/咨询」→ 登录弹窗 → 回跳打开意向
//       弹窗；已登录「立即预约/咨询顾问」→ 直接打开意向弹窗，source=product）。
// 数据：GET /api/public/products/{id}；意向提交 POST /api/user/intents。
// =============================================================================

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'

import { http } from '@/api/http'
import { publicApi } from '@tsgq/api-client'
import { ProductPlaceholder } from '@/assets/symbols'
import { IntentForm } from '@/components/IntentForm'
import { PermissionCTA } from '@/components/PermissionCTA'
import { RichText } from '@/components/RichText'
import { useUiStore } from '@/store/ui'

// 产品详情数据结构
interface ProductDetail {
  id: number
  product_no: string
  name: string
  model: string | null
  series: string | null
  category_name: string | null
  cover_image: string | null
  product_images: string[]
  box_images: string[]
  description: string | null
  spec_params: { key: string; value: string }[]
  spec: string | null
  flavor: string | null
  ingredients: string | null
  net_weight: string | null
  shelf_life: string | null
  storage: string | null
  allergen: string | null
  box_spec: string | null
  price: string | null
  is_featured: boolean
}

export default function ProductDetail() {
  const { id } = useParams()  // 路由参数：产品 id
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [intentOpen, setIntentOpen] = useState(false)  // 意向弹窗开关
  const showToast = useUiStore((s) => s.showToast)

  // 加载产品详情
  useEffect(() => {
    if (!id) return
    http.get(publicApi.productDetail(id))
      .then((res: any) => setProduct(res.data))
      .catch(() => setNotFound(true))
  }, [id])

  // 图片集合：实拍图/礼盒图合并 + Tab 分组（UI/UX §4.4.4）
  const [galleryTab, setGalleryTab] = useState<'product' | 'box'>('product')
  const images = useMemo(() => {
    const list = galleryTab === 'product'
      ? (product?.product_images ?? [])
      : (product?.box_images ?? [])
    return list.length ? list : null  // 无真实图时用占位
  }, [product, galleryTab])
  const [mainIdx, setMainIdx] = useState(0)

  // 未加载/404 处理
  if (notFound) {
    return <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-weak)' }}>产品不存在或已下架</div>
  }
  if (!product) {
    return <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-weak)' }}>加载中…</div>
  }

  // 规格表：固定食品合规行 + spec_params（UI/UX §4.4.4 合规范式，缺失兜底显示）
  const specRows: [string, string | null][] = [
    ['口味', product.flavor],
    ['礼盒规格', product.box_spec],
    ['净含量', product.net_weight],
    ['配料表', product.ingredients],
    ['保质期', product.shelf_life],
    ['储存条件', product.storage],
    ['过敏原提示', product.allergen],
  ]

  return (
    <div className="container" style={{ padding: '36px 24px' }}>
      {/* 面包屑 */}
      <div style={{ fontSize: 12, color: 'var(--text-weak)', marginBottom: 18 }}>
        首页 / 产品系列 / <b style={{ color: 'var(--red-3)' }}>{product.name}</b>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 36 }}>
        {/* ===== 左：图区 ===== */}
        <div>
          {/* 图集 Tab：产品实拍 / 礼盒包装（UI/UX §4.4.4） */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <TabBtn label="产品实拍" active={galleryTab === 'product'} onClick={() => { setGalleryTab('product'); setMainIdx(0) }} />
            <TabBtn label="礼盒包装" active={galleryTab === 'box'} onClick={() => { setGalleryTab('box'); setMainIdx(0) }} />
          </div>
          {/* 主图（金框相框） */}
          <div className="art-frame" style={{ aspectRatio: '4/3', background: '#3A0B0F' }}>
            {images ? (
              <img src={images[mainIdx]} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <ProductPlaceholder seed={product.id} />
            )}
          </div>
          {/* 缩略图（多图切换） */}
          {images && images.length > 1 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setMainIdx(i)}
                  style={{
                    width: 64, height: 48, padding: 0, border: i === mainIdx ? '2px solid #8C1F28' : '1px solid var(--line)',
                    cursor: 'pointer', borderRadius: 2, overflow: 'hidden', background: '#FFF',
                  }}
                  aria-label={`查看第 ${i + 1} 张图片`}
                >
                  <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ===== 右：信息区 ===== */}
        <div>
          {/* 产品编号 Tag */}
          <span style={{ display: 'inline-block', background: 'rgba(201,169,106,.15)', border: '1px solid var(--gold)', color: 'var(--gold-dark)', fontSize: 12, padding: '2px 10px', borderRadius: 2 }}>
            编号 {product.product_no}
          </span>
          <h1 style={{ fontFamily: 'var(--font-title)', fontSize: 30, fontWeight: 700, color: 'var(--red-3)', margin: '12px 0 6px' }}>
            {product.name}
          </h1>
          <div style={{ fontSize: 13, color: 'var(--text-weak)' }}>
            {[product.category_name, product.series, product.model].filter(Boolean).join(' · ')}
          </div>

          {/* 金色分隔线 */}
          <div className="gold-divider" style={{ margin: '16px 0' }} />

          {/* 最低价起（PRD v2.2：¥xxx 起，完整报价线下洽谈） */}
          <div style={{ fontSize: 22, fontWeight: 700, color: '#8C1F28', marginBottom: 16 }}>
            {product.price ? `${product.price} 起` : '价格面议 · 线下洽谈'}
          </div>

          {/* 规格参数表（食品合规字段强制渲染） */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <tbody>
              {specRows.map(([k, v]) => (
                <tr key={k} style={{ borderBottom: '1px solid rgba(201,169,106,.25)' }}>
                  <td style={{ padding: '9px 12px', background: 'rgba(201,169,106,.08)', color: 'var(--red-3)', fontWeight: 600, width: 110 }}>{k}</td>
                  <td style={{ padding: '9px 12px', color: '#2B1D16' }}>{v || '—'}</td>
                </tr>
              ))}
              {/* spec_params 附加参数（JSON 渲染） */}
              {(product.spec_params ?? []).map((p, i) => (
                <tr key={`sp-${i}`} style={{ borderBottom: '1px solid rgba(201,169,106,.25)' }}>
                  <td style={{ padding: '9px 12px', background: 'rgba(201,169,106,.08)', color: 'var(--red-3)', fontWeight: 600, width: 110 }}>{p.key}</td>
                  <td style={{ padding: '9px 12px', color: '#2B1D16' }}>{p.value}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* 产品描述（富文本渲染） */}
          {product.description && (
            <div style={{ marginTop: 18 }}>
              <div style={{ fontFamily: 'var(--font-title)', fontSize: 16, fontWeight: 600, color: 'var(--red-3)', marginBottom: 8 }}>产品说明</div>
              <RichText html={product.description} />
            </div>
          )}

          {/* ===== 权限双态 CTA（UI/UX §6.5） ===== */}
          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            {/* 立即预约：未登录「登录后可预约」→ 登录后回跳打开意向弹窗 */}
            <PermissionCTA
              guestLabel="登录后可预约"
              userLabel="立即预约"
              onLoggedIn={() => setIntentOpen(true)}
              onGuestReturn={() => setIntentOpen(true)}  // 登录成功后自动展开（回跳原操作）
            />
            {/* 咨询顾问 */}
            <PermissionCTA
              guestLabel="登录后可咨询"
              userLabel="咨询顾问"
              variant="ghost"
              onLoggedIn={() => { setIntentOpen(true); showToast('ok', '填写需求后顾问将尽快联系您') }}
              onGuestReturn={() => setIntentOpen(true)}
            />
          </div>
        </div>
      </div>

      {/* ===== 意向弹窗（预约/咨询共用，source=product） ===== */}
      {intentOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="预约咨询"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setIntentOpen(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(43,29,22,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}
        >
          <div style={{ width: '100%', maxWidth: 480, background: '#FFFDF7', borderRadius: 2, boxShadow: '0 12px 40px rgba(0,0,0,.3)', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ height: 4, background: 'var(--grad-authbar)', borderRadius: '2px 2px 0 0' }} />
            <div style={{ position: 'relative', padding: '24px 28px' }}>
              <button aria-label="关闭" onClick={() => setIntentOpen(false)} style={{ position: 'absolute', top: 12, right: 14, background: 'none', border: 'none', fontSize: 20, color: '#999', cursor: 'pointer' }}>×</button>
              <IntentForm source="product" fields={['company', 'quantity']} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// 图集 Tab 按钮
function TabBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 16px',
        border: active ? '1px solid #8C1F28' : '1px solid var(--line)',
        background: active ? '#8C1F28' : '#FFFDF7',
        color: active ? '#F6ECD7' : '#666',
        borderRadius: 2,
        cursor: 'pointer',
        fontSize: 13,
      }}
    >
      {label}
    </button>
  )
}
