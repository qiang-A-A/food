// =============================================================================
// src/pages/Register.tsx — 注册页（PRD F-6）
// -----------------------------------------------------------------------------
// 功能：手机号 + 密码 + 确认密码（6-20 位校验）+ 昵称（可选）→ 注册即登录
//       （后端返回 user JWT）→ 跳转个人中心。
// 数据：POST /api/user/register。
// =============================================================================

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { http } from '@/api/http'
import { userApi } from '@tsgq/api-client'
import { useAuthStore } from '@/store/auth'
import { useUiStore } from '@/store/ui'

export default function Register() {
  const navigate = useNavigate()
  const setLogin = useAuthStore((s) => s.setLogin)
  const showToast = useUiStore((s) => s.showToast)

  const [form, setForm] = useState({ phone: '', password: '', confirm: '', nickname: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleRegister = async () => {
    setError('')
    // 前端校验（UI/UX §4.4.11：6-20 位校验）
    if (!/^1\d{10}$/.test(form.phone)) { setError('请输入 11 位手机号'); return }
    if (form.password.length < 6 || form.password.length > 20) { setError('密码长度需为 6-20 位'); return }
    if (form.password !== form.confirm) { setError('两次输入的密码不一致'); return }
    setLoading(true)
    try {
      const res: any = await http.post(userApi.register, {
        phone: form.phone,
        password: form.password,
        confirm_password: form.confirm,
        nickname: form.nickname.trim() || undefined,
      })
      // 注册即登录：写入登录态并跳转个人中心（PRD F-6）
      setLogin(res.data.token, res.data.user.nickname || '宫阙会员', res.data.user.avatar)
      showToast('ok', '注册成功')
      navigate('/profile')
    } catch (e: any) {
      setError(e.message || '注册失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
      <div style={{ width: '100%', maxWidth: 400, background: '#FFFDF7', borderRadius: 2, boxShadow: 'var(--shadow-card)' }}>
        <div style={{ height: 4, background: 'var(--grad-authbar)', borderRadius: '2px 2px 0 0' }} />
        <div style={{ padding: '30px 36px 28px' }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontFamily: 'var(--font-title)', fontSize: 24, fontWeight: 700, letterSpacing: 6, color: 'var(--red-3)' }}>注册会员</div>
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-weak)' }}>注册即登录 · 尊享预约/咨询/团购定制服务</div>
          </div>

          <Label text="手机号"><input type="tel" maxLength={11} value={form.phone} onChange={(e) => set('phone', e.target.value.replace(/\D/g, ''))} placeholder="请输入 11 位手机号" style={inputStyle} /></Label>
          <Label text="密码"><input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="请设置密码（6-20 位）" style={inputStyle} /></Label>
          <Label text="确认密码"><input type="password" value={form.confirm} onChange={(e) => set('confirm', e.target.value)} placeholder="请再次输入密码" style={inputStyle} /></Label>
          <Label text="昵称（选填）"><input maxLength={20} value={form.nickname} onChange={(e) => set('nickname', e.target.value)} placeholder="给自己取个昵称（默认「宫阙会员」）" style={inputStyle} /></Label>

          {error && <div style={{ marginTop: 10, fontSize: 13, color: '#8C1F28' }}>{error}</div>}

          <button
            onClick={handleRegister}
            disabled={loading}
            style={{ width: '100%', marginTop: 20, background: 'var(--red)', color: '#F6ECD7', border: 'none', borderRadius: 2, padding: '12px 0', fontSize: 15, letterSpacing: 8, cursor: 'pointer', fontWeight: 600, opacity: loading ? .6 : 1 }}
          >
            {loading ? '注册中…' : '注 册'}
          </button>

          <div style={{ marginTop: 16, textAlign: 'center', fontSize: 13 }}>
            <span style={{ color: 'var(--text-weak)' }}>已有账号？</span>
            <Link to="/login" style={{ color: '#8C1F28', textDecoration: 'underline' }}>去登录</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// 字段标签包装
function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 14 }}>
      <label style={{ display: 'block', fontSize: 13, color: '#3E2C22', marginBottom: 4 }}>{text}</label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid var(--gold)',
  borderRadius: 2,
  fontSize: 14,
  background: '#FFF',
  outline: 'none',
  boxSizing: 'border-box',
}
