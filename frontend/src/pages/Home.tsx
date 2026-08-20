// =============================================================================
// src/pages/Home.tsx — 首页（PRD F-1）
// -----------------------------------------------------------------------------
// 功能：Hero 轮播（红墙宫阙插画 + 品牌标语「天上宫阙 · 御礼天成」）→
//       5 核心卖点卡 → 精选礼盒 8 卡（4 列）→ 最新新闻 3 卡 → 关于预览。
// 数据：GET /api/public/home 聚合接口（轮播/卖点/精选/新闻/关于摘要）。
// =============================================================================

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { http } from '@/api/http'
import { publicApi } from '@tsgq/api-client'
import { CakeIcon, CloudIcon, EaveIcon, GiftBoxIcon, LanternIcon, PalaceIcon } from '@/assets/symbols'
import { Carousel } from '@/components/Carousel'
import { ProductCard, type ProductItem } from '@/components/ProductCard'
import { NewsCard, type NewsItem } from '@/components/NewsCard'
import { SectionTitle } from '@/components/SectionTitle'

// 首页聚合数据结构（GET /api/public/home）
interface HomeData {
  banners: { id: number; image: string; link_url: string | null; title: string | null }[]
  selling_points: { title: string; desc: string; icon: string }[]
  featured_products: ProductItem[]
  latest_news: NewsItem[]
  about_brief: string
}

// Hero 轮播场景（svg: 占位 → SVG 插画；真实图片 URL → 渲染图片铺满）
function HeroScene({ scene }: { scene: string }) {
  // 真实图片（后台上传/URL 设置，非 svg: 占位标记）→ 直接渲染图片铺满
  // 修复：此前所有非 svg: 占位内容落入默认插画分支，后台设置的轮播图片
  //       在前台永远显示为红墙插画（"轮播图没有同步"根因）
  if (!scene.startsWith('svg:')) {
    return (
      <div style={{ position: 'absolute', inset: 0, background: '#3A0B0F' }}>
        <img src={scene} alt="轮播图" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </div>
    )
  }
  // 依据 banner.image 的占位标记渲染不同插画组合
  if (scene.includes('hero-scene-2')) {
    // 场景二：宫廷糕点陈设（礼盒 + 酥点 + 祥云）
    return (
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 20%, #A4252E, #6E161D 60%, #3A0B0F)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40 }}>
        <GiftBoxIcon className="hero-art" />
        <CakeIcon className="hero-art" />
        <CloudIcon className="hero-art" style={{ position: 'absolute', top: '18%', right: '12%', width: 90, opacity: .8 }} />
      </div>
    )
  }
  if (scene.includes('hero-scene-3')) {
    // 场景三：宫门宫灯
    return (
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 25%, #9E242D, #5A1016 65%, #2B1D16)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 30 }}>
        <LanternIcon className="hero-art" style={{ height: '42%' }} />
        <EaveIcon className="hero-art" style={{ width: 260, position: 'absolute', bottom: '22%' }} />
      </div>
    )
  }
  // 场景一（默认）：红墙宫阙
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 20%, #A4252E, #7A1A22 60%, #3F0B10)' }}>
      <PalaceIcon className="hero-art" style={{ width: 420, position: 'absolute', right: '8%', bottom: '12%', opacity: .9 }} />
      <CloudIcon className="hero-art" style={{ position: 'absolute', top: '16%', left: '12%', width: 100, opacity: .7 }} />
      <LanternIcon className="hero-art" style={{ position: 'absolute', left: '6%', bottom: '18%', height: '36%', opacity: .8 }} />
    </div>
  )
}

export default function Home() {
  const [data, setData] = useState<HomeData | null>(null)

  // 加载首页聚合数据
  useEffect(() => {
    http.get(publicApi.home)
      .then((res: any) => setData(res.data))
      .catch(() => setData(null))
  }, [])

  // 默认卖点（后端未返回时兜底，与 UI/UX 一致的 5 项）
  const points = data?.selling_points?.length
    ? data.selling_points
    : [
        { title: '宫廷御膳传承', desc: '源自宫廷御膳技艺，传承千年礼制', icon: 'heritage' },
        { title: '非遗手工技艺', desc: '非遗匠人手作，古法烘焙', icon: 'craft' },
        { title: '甄选天然食材', desc: '严选天然原料，零添加承诺', icon: 'natural' },
        { title: '高端礼盒定制', desc: '企业团购与私人高端定制', icon: 'custom' },
        { title: '食品安全品质', desc: 'SC 认证工厂，全程品控', icon: 'safety' },
      ]

  // 轮播 slides（banners 为空时用默认 3 屏）
  const banners = data?.banners?.length
    ? data.banners
    : [
        { id: 0, image: 'svg:hero-scene-1', link_url: null, title: null },
        { id: 1, image: 'svg:hero-scene-2', link_url: null, title: null },
        { id: 2, image: 'svg:hero-scene-3', link_url: null, title: null },
      ]

  return (
    <div>
      {/* ===== Hero 轮播（link_url 存在时点击跳转，需求 #4） ===== */}
      <Carousel
        slides={banners.map((b) => ({
          bg: <HeroScene scene={b.image} />,
          slogan: '天上宫阙 · 御礼天成',
          sub: b.title || '宫廷御制糕点 · 高奢商务礼赠',
          link: b.link_url || undefined,
        }))}
      />

      <div className="container">
        {/* ===== 核心卖点（5 卡） ===== */}
        <SectionTitle cn="品牌核心卖点" en="Brand Highlights" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 18, marginTop: 24 }}>
          {points.map((p) => (
            <div
              key={p.title}
              className="point-card"
              style={{
                background: '#FFFDF7',
                border: '1px solid rgba(201,169,106,.35)',
                borderTop: '3px solid #8C1F28',  // 顶部红条（UI/UX §4.3 卖点卡）
                borderRadius: 2,
                padding: '22px 18px',
                textAlign: 'center',
                position: 'relative',
                transition: 'transform .25s, box-shadow .25s',
              }}
            >
              {/* 右上角红色角线装饰 */}
              <span style={{ position: 'absolute', top: 0, right: 0, width: 14, height: 14, borderTop: '2px solid #8C1F28', borderRight: '2px solid #8C1F28' }} />
              <div style={{ fontSize: 13, letterSpacing: 1, color: 'var(--gold-dark)' }}>{p.icon.toUpperCase()}</div>
              <div style={{ marginTop: 8, fontFamily: 'var(--font-title)', fontSize: 17, fontWeight: 700, color: 'var(--red-3)' }}>{p.title}</div>
              <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-weak)', lineHeight: 1.6 }}>{p.desc}</div>
            </div>
          ))}
        </div>

        {/* ===== 精选礼盒（8 卡 / 4 列） ===== */}
        <SectionTitle cn="精选礼盒" en="Featured Gift Boxes" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 18, marginTop: 24 }}>
          {(data?.featured_products ?? []).map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
          {/* 无数据占位提示 */}
          {(data?.featured_products ?? []).length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-weak)', padding: 40, fontSize: 13 }}>
              精选礼盒筹备中，敬请期待
            </div>
          )}
        </div>

        {/* ===== 最新新闻（3 卡） ===== */}
        <SectionTitle cn="最新资讯" en="Latest News" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 18, marginTop: 24 }}>
          {(data?.latest_news ?? []).map((n) => (
            <NewsCard key={n.id} news={n} />
          ))}
        </div>

        {/* ===== 关于我们预览 ===== */}
        <SectionTitle cn="关于天上宫阙" en="About Us" />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))',
            gap: 32,
            alignItems: 'center',
            marginTop: 24,
            background: '#FFFDF7',
            border: '1px solid var(--line)',
            borderRadius: 2,
            padding: 32,
          }}
        >
          {/* 插画区（宫殿金线剪影 + 金框相框） */}
          <div className="art-frame" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(165deg,#A4252E,#5A1016)', minHeight: 220, padding: 20 }}>
            <PalaceIcon style={{ width: '80%', opacity: .95 }} />
          </div>
          {/* 摘要 + 了解更多 */}
          <div>
            <div style={{ fontFamily: 'var(--font-title)', fontSize: 24, fontWeight: 700, color: 'var(--red-3)', letterSpacing: 2 }}>
              御膳渊源 · 礼承宫廷
            </div>
            <p style={{ marginTop: 14, fontSize: 14, color: 'var(--text)', lineHeight: 1.9 }}>
              {data?.about_brief || '天上宫阙，承宫廷御膳之渊源，以非遗手工技艺呈御礼之雅，为商务礼赠打造高端宫廷糕点。'}
            </p>
            <Link
              to="/about"
              style={{ display: 'inline-block', marginTop: 16, background: 'var(--red)', color: '#F6ECD7', padding: '10px 26px', borderRadius: 2, textDecoration: 'none', fontSize: 14, letterSpacing: 2 }}
            >
              了解更多
            </Link>
          </div>
        </div>
      </div>

      {/* Hero 插画与卖点卡 hover 样式 */}
      <style>{`
        .hero-art { opacity: .92 }
        .point-card:hover { transform: translateY(-5px); box-shadow: var(--shadow-card); border-color: var(--red-3) }
      `}</style>
    </div>
  )
}
