// =============================================================================
// src/pages/Customize.tsx — 礼盒定制（PRD F-8）
// -----------------------------------------------------------------------------
// 功能：定制说明（礼盒形制/口味搭配/纹样装帧 三选区）→ 定制流程 4 步
//       （意向咨询→顾问对接→打样确认→批量生产）→ 定制意向表单（双态，
//       仅登录提交，source=customize；报价线下洽谈）。
// =============================================================================

import { PageBanner } from '@/components/PageBanner'
import { IntentForm } from '@/components/IntentForm'
import { SectionTitle } from '@/components/SectionTitle'
import { GiftBoxIcon, RuyiIcon } from '@/assets/symbols'

// 定制方案说明卡数据（UI/UX §4.4.8）
const OPTIONS = [
  { icon: '礼', title: '礼盒形制', desc: '单层 / 双层 / 提篮礼盒，尺寸与装帧可按需定制' },
  { icon: '味', title: '口味搭配', desc: '御点珍馐 / 节令糕品自由组合，一对一口味搭配顾问' },
  { icon: '纹', title: '纹样装帧', desc: '宫廷纹样库可选（祥云/回纹/如意），支持企业 LOGO 烫金' },
]

// 定制流程 4 步（PRD F-8）
const STEPS = ['意向咨询', '顾问对接', '打样确认', '批量生产']

export default function Customize() {
  return (
    <div>
      <PageBanner title="礼盒定制" en="Customized Gift Boxes" />

      <div className="container">
        {/* ===== 定制方案说明（3 卡） ===== */}
        <SectionTitle cn="定制方案" en="Customization Options" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 18, marginTop: 24 }}>
          {OPTIONS.map((o) => (
            <div key={o.title} style={{ background: '#FFFDF7', border: '1px solid var(--line)', borderTop: '3px solid #8C1F28', borderRadius: 2, padding: 26, textAlign: 'center' }}>
              {/* 印章式图标 */}
              <div style={{ width: 44, height: 44, margin: '0 auto 12px', border: '2px solid #C9A96A', color: '#8C1F28', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, borderRadius: 2, transform: 'rotate(-3deg)' }}>
                {o.icon}
              </div>
              <div style={{ fontFamily: 'var(--font-title)', fontSize: 17, fontWeight: 700, color: 'var(--red-3)' }}>{o.title}</div>
              <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-weak)', lineHeight: 1.7 }}>{o.desc}</div>
            </div>
          ))}
        </div>

        {/* ===== 定制流程 4 步 ===== */}
        <SectionTitle cn="定制流程" en="Process" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 16, marginTop: 24 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ textAlign: 'center', position: 'relative' }}>
              <div style={{ width: 44, height: 44, margin: '0 auto', borderRadius: '50%', border: '2px solid #C9A96A', background: '#FFFDF7', color: '#8C1F28', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700 }}>
                {i + 1}
              </div>
              <div style={{ marginTop: 10, fontFamily: 'var(--font-title)', fontSize: 15, color: 'var(--red-3)', letterSpacing: 1 }}>{s}</div>
              {/* 步骤间连线（金色） */}
              {i < STEPS.length - 1 && (
                <div style={{ position: 'absolute', top: 22, left: 'calc(50% + 34px)', width: 'calc(100% - 68px)', height: 1, background: 'var(--gold)', opacity: .5 }} />
              )}
            </div>
          ))}
        </div>

        {/* ===== 定制意向表单（双态：仅登录提交） ===== */}
        <SectionTitle cn="提交定制意向" en="Submit Inquiry" />
        <div style={{ maxWidth: 640, margin: '24px auto 0' }}>
          {/* 说明：定制报价线下洽谈（PRD F-8） */}
          <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-weak)', marginBottom: 16 }}>
            定制产品不展示统一报价，提交意向后由顾问一对一定制方案 · 起订量 50 盒起
          </div>
          <IntentForm source="customize" fields={[]} />
        </div>

        {/* 底部装饰（礼盒金线剪影） */}
        <div style={{ textAlign: 'center', opacity: .3, marginTop: 40 }}>
          <GiftBoxIcon style={{ width: 180 }} />
          <RuyiIcon style={{ width: 30, marginLeft: 16, opacity: .6 }} />
        </div>
      </div>
    </div>
  )
}
