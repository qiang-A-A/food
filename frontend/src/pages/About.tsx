// =============================================================================
// src/pages/About.tsx — 关于我们（PRD F-2）
// -----------------------------------------------------------------------------
// 功能：公司简介（图文）+ 品牌故事（御膳渊源，PRD v2.0 新增）→ 5 卖点详述
//       → 荣誉资质（卡片 + 印章）→ 工厂/非遗工坊（静态占位，MVP 静态呈现）。
// 数据：GET /api/public/about（company_intro/brand_story/honors/selling_points）。
// =============================================================================

import { useEffect, useState } from 'react'

import { http } from '@/api/http'
import { publicApi } from '@tsgq/api-client'
import { PalaceIcon, RuyiIcon } from '@/assets/symbols'
import { PageBanner } from '@/components/PageBanner'
import { RichText } from '@/components/RichText'
import { SectionTitle } from '@/components/SectionTitle'

interface AboutData {
  company_intro: string | null
  brand_story: string | null
  honors: { title: string; desc: string; icon?: string }[]
  selling_points: { title: string; desc: string; icon: string }[]
}

export default function About() {
  const [data, setData] = useState<AboutData | null>(null)

  useEffect(() => {
    http.get(publicApi.about).then((res: any) => setData(res.data)).catch(() => setData(null))
  }, [])

  const points = data?.selling_points?.length
    ? data.selling_points
    : [
        { title: '宫廷御膳传承', desc: '源自宫廷御膳技艺，传承千年礼制', icon: 'heritage' },
        { title: '非遗手工技艺', desc: '非遗匠人手作，古法烘焙', icon: 'craft' },
        { title: '甄选天然食材', desc: '严选天然原料，零添加承诺', icon: 'natural' },
        { title: '高端礼盒定制', desc: '企业团购与私人高端定制', icon: 'custom' },
        { title: '食品安全品质', desc: 'SC 认证工厂，全程品控', icon: 'safety' },
      ]

  const honors = data?.honors?.length
    ? data.honors
    : [
        { title: '中国礼赠食品创意金奖', desc: '中国食品礼品大赛 · 2025', icon: '金奖' },
        { title: 'SC 食品生产许可认证', desc: '食品级洁净车间 · 权威认证', icon: '认证' },
        { title: '国家级非遗糕点技艺合作单位', desc: '宫廷糕点传承保护 · 2023', icon: '非遗' },
      ]

  return (
    <div>
      <PageBanner title="关于我们" en="About Us" />

      <div className="container">
        {/* ===== 公司简介（图文左右） ===== */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 36, alignItems: 'center' }}>
          <div className="art-frame" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(165deg,#A4252E,#5A1016)', minHeight: 260, padding: 20 }}>
            <PalaceIcon style={{ width: '85%' }} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-title)', fontSize: 28, fontWeight: 700, color: 'var(--red-3)', letterSpacing: 3 }}>
              宫廷糕点 · 御礼天成
            </div>
            <div className="gold-divider" style={{ margin: '14px 0' }} />
            {data?.company_intro ? (
              <RichText html={data.company_intro} />
            ) : (
              <p style={{ fontSize: 14, lineHeight: 1.9, color: 'var(--text)' }}>
                天上宫阙，取意「九天宫阙」，以中国传统宫廷美学为设计语言，专注高端宫廷糕点与高奢商务礼赠。
                集研发、生产、销售于一体，以御膳渊源为魂、非遗技艺为骨，为政企客户与高端礼赠场景呈献御礼之雅。
              </p>
            )}
          </div>
        </div>

        {/* ===== 品牌故事（御膳渊源） ===== */}
        <SectionTitle cn="品牌故事" en="Brand Story" />
        <div style={{ background: '#FFFDF7', border: '1px solid var(--line)', borderRadius: 2, padding: '30px 34px' }}>
          {data?.brand_story ? (
            <RichText html={data.brand_story} />
          ) : (
            <p style={{ fontSize: 14, lineHeight: 2, color: 'var(--text)', textIndent: '2em' }}>
              相传宫廷御膳房汇聚天下糕点名匠，以精工细作、层层起酥之技艺，成就「御点珍馐」之美名。
              天上宫阙承此渊源，将古法配方与当代食品工业标准相融合，在保持宫廷糕点本味的同时，
              以现代品控体系保障食品安全，让千年御礼走向当代商务礼赠场景。
            </p>
          )}
        </div>

        {/* ===== 5 卖点详述 ===== */}
        <SectionTitle cn="核心卖点" en="Highlights" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 18 }}>
          {points.map((p) => (
            <div key={p.title} style={{ background: '#FFFDF7', border: '1px solid var(--line)', borderTop: '3px solid #8C1F28', borderRadius: 2, padding: 22, textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-title)', fontSize: 17, fontWeight: 700, color: 'var(--red-3)' }}>{p.title}</div>
              <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-weak)', lineHeight: 1.6 }}>{p.desc}</div>
            </div>
          ))}
        </div>

        {/* ===== 荣誉资质（3 卡 + 印章） ===== */}
        <SectionTitle cn="荣誉资质" en="Honors" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 18 }}>
          {honors.map((h) => (
            <div key={h.title} style={{ background: '#FFFDF7', border: '1px solid var(--line)', borderRadius: 2, padding: '24px 20px', textAlign: 'center', position: 'relative' }}>
              {/* 印章（UI/UX §3.8：46×46 方章） */}
              <div style={{ width: 46, height: 46, margin: '0 auto 12px', border: '2px solid #8C1F28', color: '#8C1F28', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, transform: 'rotate(-4deg)', borderRadius: 2 }}>
                {h.icon || '宫阙'}
              </div>
              <div style={{ fontFamily: 'var(--font-title)', fontSize: 16, fontWeight: 600, color: 'var(--red-3)' }}>{h.title}</div>
              <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-weak)' }}>{h.desc}</div>
              <RuyiIcon style={{ position: 'absolute', right: 10, bottom: 10, width: 26, opacity: .25 }} />
            </div>
          ))}
        </div>

        {/* ===== 工厂与非遗工坊（MVP 静态占位，UI/UX §8.2 替换清单） ===== */}
        <SectionTitle cn="工厂与工坊" en="Workshop" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 18 }}>
          {['中央工厂', '非遗糕点工坊', '技艺传承'].map((t, i) => (
            <div key={t}>
              <div className="art-frame" style={{ aspectRatio: '4/3', background: 'linear-gradient(165deg,#8C1F28,#5A1016)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PalaceIcon style={{ width: '60%', opacity: .85 }} />
              </div>
              <div style={{ marginTop: 10, textAlign: 'center', fontFamily: 'var(--font-title)', fontSize: 15, color: 'var(--red-3)', letterSpacing: 2 }}>{t}</div>
              <div style={{ marginTop: 4, textAlign: 'center', fontSize: 12, color: 'var(--text-weak)' }}>{['SC 认证洁净车间 · 全程品控', '古法起酥 · 匠人手作', '师徒相传 · 守护经典'][i]}（占位）</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
