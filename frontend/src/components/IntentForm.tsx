// =============================================================================
// src/components/IntentForm.tsx — 团购/定制意向表单（双态）
// -----------------------------------------------------------------------------
// 功能：联系我们/礼盒定制/产品详情共用的意向表单（UI/UX §4.4.7/§4.4.8）：
//       · 未登录：表单锁定 + 「登录后可提交」按钮 → 打开登录弹窗，登录后
//         自动解锁表单（回跳原操作，权限分水岭）
//       · 已登录：可填写 姓名/电话/公司/需求/数量区间 → POST /api/user/intents
//       提交成功 Toast 提示 + 显示商务热线。
// =============================================================================

import { useState } from 'react' // 表单状态

import { http } from '@/api/http'
import { userApi } from '@tsgq/api-client'
import { useAuthStore } from '@/store/auth'
import { useUiStore } from '@/store/ui'

interface IntentFormProps {
  source: 'contact' | 'customize' | 'product'  // 来源页（后台据此区分入口）
  fields?: ('company' | 'quantity')[]          // 需要展示的附加字段（联系=公司+数量；定制=公司）
  companyRequired?: boolean                    // 公司名称是否必填（定制服务页）
}

export function IntentForm({ source, fields = ['company', 'quantity'], companyRequired = false }: IntentFormProps) {
  const isLogin = useAuthStore((s) => s.isLogin)
  const openLogin = useUiStore((s) => s.openLogin)
  const showToast = useUiStore((s) => s.showToast)

  // 表单字段状态
  const [form, setForm] = useState({ name: '', phone: '', company: '', requirement: '', quantity_range: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // 更新单个字段
  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }))

  // 提交意向
  const handleSubmit = async () => {
    setError('')
    // 前端校验：姓名必填 + 11 位手机号 + 公司名（定制页必填）
    if (!form.name.trim()) { setError('请填写姓名'); return }
    if (!/^1\d{10}$/.test(form.phone)) { setError('请填写 11 位手机号'); return }
    if (companyRequired && !form.company.trim()) { setError('请填写公司名称'); return }
    setLoading(true)
    try {
      await http.post(userApi.intents, {
        name: form.name.trim(),
        phone: form.phone,
        company: form.company.trim() || null,
        requirement: form.requirement.trim() || null,
        quantity_range: form.quantity_range || null,
        source,  // 来源页标记
      })
      setSubmitted(true)  // 提交成功 → 显示商务热线提示
      setForm({ name: '', phone: '', company: '', requirement: '', quantity_range: '' })
      showToast('ok', '意向提交成功，顾问将尽快与您联系')
    } catch (e: any) {
      setError(e.message || '提交失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  // ---- 未登录态：表单锁定 + 登录引导（权限双态） ----
  if (!isLogin) {
    return (
      <div style={{ background: 'rgba(201,169,106,.08)', border: '1px dashed var(--gold)', borderRadius: 2, padding: 24, textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-title)', fontSize: 18, color: 'var(--red-3)', marginBottom: 10 }}>
          登录后可提交{source === 'customize' ? '定制意向' : '团购意向'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-weak)', marginBottom: 16 }}>
          请先登录会员账号，登录后自动展开表单
        </div>
        <button
          onClick={() => openLogin()}
          style={{ background: 'var(--red)', color: '#F6ECD7', border: 'none', borderRadius: 2, padding: '10px 28px', cursor: 'pointer', fontSize: 14, letterSpacing: 2 }}
        >
          登录后提交
        </button>
      </div>
    )
  }

  // ---- 已登录态：可填写表单 ----
  if (submitted) {
    return (
      <div style={{ background: '#FFFDF7', border: '1px solid #52C41A', borderRadius: 2, padding: 26, textAlign: 'center' }}>
        <div style={{ fontSize: 18, color: '#2B1D16', fontWeight: 600 }}>提交成功</div>
        <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text-weak)' }}>
          商务顾问将尽快与您联系，亦可致电 <b style={{ color: '#8C1F28' }}>400-000-0000</b>
        </div>
        <button
          onClick={() => setSubmitted(false)}
          style={{ marginTop: 16, background: 'none', border: '1px solid var(--gold)', color: 'var(--gold-dark)', borderRadius: 2, padding: '8px 20px', cursor: 'pointer' }}
        >
          再提交一条
        </button>
      </div>
    )
  }

  return (
    <div style={{ background: '#FFFDF7', border: '1px solid var(--line)', borderRadius: 2, padding: 24 }}>
      <div style={{ fontFamily: 'var(--font-title)', fontSize: 18, color: 'var(--red-3)', marginBottom: 18 }}>
        {source === 'customize' ? '提交定制意向' : '提交团购意向'}
      </div>

      {/* 姓名 + 电话 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 14 }}>
        <Field label="姓名 *"><input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="您的称呼" style={inputStyle} /></Field>
        <Field label="联系电话 *"><input type="tel" maxLength={11} value={form.phone} onChange={(e) => set('phone', e.target.value.replace(/\D/g, ''))} placeholder="11 位手机号" style={inputStyle} /></Field>
      </div>

      {/* 公司名称（团购场景必显；定制页必填） */}
      {fields.includes('company') && (
        <Field label={companyRequired ? '公司名称 *' : '公司名称'}>
          <input value={form.company} onChange={(e) => set('company', e.target.value)} placeholder={companyRequired ? '企业/机构名称（必填）' : '企业/机构名称（选填）'} style={inputStyle} />
        </Field>
      )}

      {/* 需求描述 */}
      <Field label={source === 'customize' ? '定制需求描述' : '采购需求'}>
        <textarea
          value={form.requirement}
          onChange={(e) => set('requirement', e.target.value)}
          placeholder={source === 'customize' ? '口味搭配 / 纹样 / 礼盒规格 / 定制周期等' : '如：中秋团购 200 盒，需定制烫金 LOGO'}
          rows={3}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </Field>

      {/* 数量区间（团购场景） */}
      {fields.includes('quantity') && (
        <Field label="预计数量区间">
          <select value={form.quantity_range} onChange={(e) => set('quantity_range', e.target.value)} style={inputStyle}>
            <option value="">请选择（选填）</option>
            <option value="20 盒以内">20 盒以内</option>
            <option value="20-50 盒">20-50 盒</option>
            <option value="50-100 盒">50-100 盒</option>
            <option value="100-500 盒">100-500 盒</option>
            <option value="500 盒以上">500 盒以上</option>
          </select>
        </Field>
      )}

      {/* 错误提示 */}
      {error && <div style={{ marginTop: 10, fontSize: 13, color: '#8C1F28' }}>{error}</div>}

      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{
          width: '100%', marginTop: 18, background: 'var(--red)', color: '#F6ECD7',
          border: 'none', borderRadius: 2, padding: '11px 0', fontSize: 15, letterSpacing: 4,
          cursor: 'pointer', opacity: loading ? .6 : 1,
        }}
      >
        {loading ? '提交中…' : '提 交 意 向'}
      </button>
    </div>
  )
}

// 字段包装（label + 内容）
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 12 }}>
      <label style={{ display: 'block', fontSize: 13, color: '#3E2C22', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  )
}

// 输入框统一样式（白底金边）
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  border: '1px solid var(--gold)',
  borderRadius: 2,
  fontSize: 14,
  background: '#FFF',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
}
