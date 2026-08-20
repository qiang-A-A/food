// =============================================================================
// src/pages/Contact.tsx — 联系我们（PRD F-5）
// -----------------------------------------------------------------------------
// 功能：左卡片——联系方式（商务热线/邮箱/地址/微信二维码，来自 settings）；
//       右卡片——门店地图（后台「联系方式设置」地图嵌入地址 map_url 渲染，
//       2026-08-20 需求 #5：原提交团购意向表单移除）。
// 数据：GET /api/public/contact。
// =============================================================================

import { useEffect, useState } from 'react'

import { http } from '@/api/http'
import { publicApi } from '@tsgq/api-client'
import { PageBanner } from '@/components/PageBanner'

interface ContactInfo {
  contact_phone: string | null
  contact_email: string | null
  contact_address: string | null
  contact_wechat_qr: string | null
  map_url: string | null
}

export default function Contact() {
  const [info, setInfo] = useState<ContactInfo | null>(null)

  useEffect(() => {
    http.get(publicApi.contact).then((res: any) => setInfo(res.data)).catch(() => setInfo(null))
  }, [])

  return (
    <div>
      <PageBanner title="联系我们" en="Contact Us" />

      <div className="container" style={{ maxWidth: 1000 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 28 }}>
          {/* ===== 左：联系方式卡片 ===== */}
          <div style={{ background: '#FFFDF7', border: '1px solid var(--line)', borderRadius: 2, padding: 30 }}>
            <div style={{ fontFamily: 'var(--font-title)', fontSize: 20, fontWeight: 700, color: 'var(--red-3)', letterSpacing: 2 }}>联系方式</div>
            <div className="gold-divider" style={{ margin: '14px 0' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: 14 }}>
              <Row label="商务订购热线" value={info?.contact_phone || '400-000-0000'} highlight />
              <Row label="电子邮箱" value={info?.contact_email || 'contact@tsgq.com'} />
              <Row label="公司地址" value={info?.contact_address || '（待填地址）'} />
            </div>

            {/* 微信二维码（审计修复：读取后端 contact_wechat_qr 真实数据，
                此前硬编码「占位」导致设置中的二维码永远不生效） */}
            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <div style={{ display: 'inline-block', padding: 10, border: '1px solid var(--line)', background: '#FFF' }}>
                {info?.contact_wechat_qr ? (
                  <img src={info.contact_wechat_qr} alt="微信二维码" style={{ width: 108, height: 108, objectFit: 'contain', display: 'block' }} />
                ) : (
                  <div style={{ width: 108, height: 108, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#999' }}>
                    微信二维码待上传
                  </div>
                )}
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-weak)' }}>扫码添加商务顾问微信</div>
            </div>

            <div style={{ marginTop: 22, padding: 12, background: 'rgba(201,169,106,.1)', border: '1px dashed var(--gold)', fontSize: 12, color: 'var(--text-weak)', lineHeight: 1.8 }}>
              企业团购 / 高端定制咨询，欢迎致电商务热线，或提交右侧团购意向表单，顾问将在 24 小时内与您联系。
            </div>
          </div>

          {/* ===== 右：门店地图（后台地图 API 设置 map_url 渲染，需求 #5） ===== */}
          <div style={{ background: '#FFFDF7', border: '1px solid var(--line)', borderRadius: 2, padding: 24, minHeight: 320, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontFamily: 'var(--font-title)', fontSize: 20, fontWeight: 700, color: 'var(--red-3)', letterSpacing: 2, marginBottom: 14 }}>门店位置</div>
            {info?.map_url ? (
              <iframe
                src={info.map_url}
                title="门店地图"
                style={{ flex: 1, width: '100%', minHeight: 320, border: '1px solid var(--line)', borderRadius: 2 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            ) : (
              <div style={{ flex: 1, minHeight: 260, border: '1px dashed var(--gold)', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--text-weak)', background: 'rgba(201,169,106,.06)' }}>
                地图待配置（后台「联系方式设置」填写地图嵌入地址）
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// 联系方式行组件
function Row({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
      <span style={{ color: 'var(--text-weak)', fontSize: 13, flexShrink: 0, width: 92 }}>{label}</span>
      <span style={{ color: highlight ? '#8C1F28' : '#2B1D16', fontWeight: highlight ? 700 : 400, fontSize: highlight ? 18 : 14, letterSpacing: 1 }}>
        {value}
      </span>
    </div>
  )
}
