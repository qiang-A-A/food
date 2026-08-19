// =============================================================================
// src/components/Footer.tsx — 页脚
// -----------------------------------------------------------------------------
// 功能：前台全站页脚（UI/UX §4.1）——深红→玄黑渐变底 + 页脚红金顶线；
//       商务订购热线 / 地址 / 版权 / 备案号 / SC 食品生产许可 / 微信二维码
//       （合规信息来自 settings 接口，PRD §8 食品安全合规）。
// =============================================================================

import { useEffect, useState } from 'react' // 数据加载
import { Link } from 'react-router-dom'

import { http } from '@/api/http'
import { publicApi } from '@tsgq/api-client'

// 联系方式数据结构（GET /api/public/contact）
interface ContactInfo {
  contact_phone: string | null
  contact_email: string | null
  contact_address: string | null
  contact_wechat_qr: string | null
  footer_icp: string | null
  footer_sc_license: string | null
}

export function Footer() {
  const [info, setInfo] = useState<ContactInfo | null>(null)

  // 加载联系方式（页脚合规信息数据源，失败静默保持占位）
  useEffect(() => {
    http.get(publicApi.contact)
      .then((res: any) => setInfo(res.data))
      .catch(() => setInfo(null))
  }, [])

  return (
    <footer
      style={{
        background: 'var(--grad-footer)',  // 深红→玄黑渐变
        color: 'var(--gold-light)',
        marginTop: 64,
        position: 'relative',
      }}
    >
      {/* 页脚红金顶线：金→红→金 3px 渐变（UI/UX §3.7.1） */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg,#C9A96A,#8C1F28,#C9A96A)' }} />

      <div className="container" style={{ padding: '44px 24px 30px' }}>
        {/* 品牌区：Logo + 标语 */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontFamily: 'var(--font-title)', fontSize: 26, fontWeight: 900, letterSpacing: 6, color: '#F6ECD7' }}>
            天上宫阙
          </div>
          <div style={{ marginTop: 8, fontSize: 13, letterSpacing: 4, color: 'var(--gold)' }}>
            天上宫阙 · 御礼天成
          </div>
        </div>

        {/* 联系与合规信息三列 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 24, fontSize: 13, lineHeight: 2 }}>
          {/* 商务订购 */}
          <div>
            <div style={{ color: '#C9A96A', letterSpacing: 2, marginBottom: 6 }}>商务订购</div>
            <div>订购热线：{info?.contact_phone || '400-000-0000'}</div>
            <div>邮箱：{info?.contact_email || 'contact@tsgq.com'}</div>
            <div>地址：{info?.contact_address || '（待填地址）'}</div>
          </div>

          {/* 快捷导航 */}
          <div>
            <div style={{ color: '#C9A96A', letterSpacing: 2, marginBottom: 6 }}>快捷导航</div>
            <Link to="/products" style={{ color: 'inherit', textDecoration: 'none', display: 'block' }}>产品系列</Link>
            <Link to="/customize" style={{ color: 'inherit', textDecoration: 'none', display: 'block' }}>礼盒定制</Link>
            <Link to="/contact" style={{ color: 'inherit', textDecoration: 'none', display: 'block' }}>企业团购</Link>
          </div>

          {/* 微信二维码（占位，上线替换真实二维码） */}
          <div>
            <div style={{ color: '#C9A96A', letterSpacing: 2, marginBottom: 6 }}>微信咨询</div>
            <div style={{ width: 96, height: 96, border: '1px solid rgba(201,169,106,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'rgba(232,217,181,.7)' }}>
              二维码占位
            </div>
          </div>
        </div>

        {/* 合规信息行：备案号 + SC 食品生产许可（食品类目必做，PRD §8） */}
        <div style={{ marginTop: 26, paddingTop: 16, borderTop: '1px solid rgba(201,169,106,.25)', textAlign: 'center', fontSize: 12, color: 'rgba(232,217,181,.65)', letterSpacing: 1 }}>
          <span>© 2026 天上宫阙 版权所有</span>
          <span style={{ margin: '0 12px' }}>|</span>
          <span>ICP 备案：{info?.footer_icp || '（待填备案号）'}</span>
          <span style={{ margin: '0 12px' }}>|</span>
          <span>SC 生产许可：{info?.footer_sc_license || 'SC00000000000000'}</span>
        </div>
      </div>
    </footer>
  )
}
