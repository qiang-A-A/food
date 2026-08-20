// =============================================================================
// src/pages/Login.tsx — 登录页（PRD F-6）
// -----------------------------------------------------------------------------
// 功能：宣纸纸感底 + 居中登录卡（手机号+密码）→ 登录成功跳转个人中心；
//       左上角「返回首页」按钮（从任意入口进入登录页均可退回首页）；
//       角落低调「管理员入口」链接（同页跳转后台登录，不新开窗口，PRD B-1）。
// 数据：POST /api/user/login。
// =============================================================================

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { http } from '@/api/http'
import { userApi } from '@tsgq/api-client'
import { useAuthStore } from '@/store/auth'
import { useUiStore } from '@/store/ui'

// 后台应用地址：开发环境 5174 端口，生产同域 /admin/login
const ADMIN_LOGIN_URL =
  window.location.port === '5173'
    ? `${window.location.protocol}//${window.location.hostname}:5174/admin/login`
    : '/admin/login'

export default function Login() {
  const navigate = useNavigate()
  const setLogin = useAuthStore((s) => s.setLogin)
  const showToast = useUiStore((s) => s.showToast)

  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setError('')
    if (!/^1\d{10}$/.test(phone)) { setError('请输入 11 位手机号'); return }
    if (!password) { setError('请输入密码'); return }
    setLoading(true)
    try {
      const res: any = await http.post(userApi.login, { phone, password })
      setLogin(res.data.token, res.data.user.nickname || '宫阙会员', res.data.user.avatar)
      showToast('ok', '登录成功')
      navigate('/profile')  // 登录成功 → 个人中心（PRD F-6）
    } catch (e: any) {
      setError(e.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', position: 'relative' }}>
      {/* 返回首页（左上角，金色描边弱化按钮） */}
      <Link
        to="/"
        style={{
          position: 'absolute', top: 18, left: 24,
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 13, color: 'var(--gold-dark)', textDecoration: 'none',
          border: '1px solid var(--gold)', borderRadius: 2, padding: '6px 14px',
          opacity: .85, transition: 'all .2s',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(201,169,106,.12)' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
      >
        ‹ 返回首页
      </Link>

      {/* 登录卡：宣纸白底 + 顶部金红金渐变条（UI/UX §3.1.2 认证卡） */}
      <div style={{ width: '100%', maxWidth: 400, background: '#FFFDF7', borderRadius: 2, boxShadow: 'var(--shadow-card)', position: 'relative' }}>
        <div style={{ height: 4, background: 'var(--grad-authbar)', borderRadius: '2px 2px 0 0' }} />
        <div style={{ padding: '34px 36px 30px' }}>
          {/* 品牌区 */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontFamily: 'var(--font-title)', fontSize: 26, fontWeight: 900, letterSpacing: 6, color: 'var(--red-3)' }}>天上宫阙</div>
            <div style={{ marginTop: 6, fontSize: 12, letterSpacing: 3, color: 'var(--gold-dark)' }}>TIANSHANGGONGQUE</div>
          </div>

          <label htmlFor="login-phone" style={{ display: 'block', fontSize: 13, color: '#3E2C22', marginBottom: 4 }}>手机号</label>
          <input id="login-phone" type="tel" maxLength={11} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} placeholder="请输入 11 位手机号" style={inputStyle} />

          <label htmlFor="login-pwd" style={{ display: 'block', fontSize: 13, color: '#3E2C22', margin: '14px 0 4px' }}>密码</label>
          <input id="login-pwd" type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} placeholder="请输入密码" style={inputStyle} />

          {error && <div style={{ marginTop: 10, fontSize: 13, color: '#8C1F28' }}>{error}</div>}

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{ width: '100%', marginTop: 20, background: 'var(--red)', color: '#F6ECD7', border: 'none', borderRadius: 2, padding: '12px 0', fontSize: 15, letterSpacing: 8, cursor: 'pointer', fontWeight: 600, opacity: loading ? .6 : 1 }}
          >
            {loading ? '登录中…' : '登 录'}
          </button>

          <div style={{ marginTop: 16, textAlign: 'center', fontSize: 13 }}>
            <span style={{ color: 'var(--text-weak)' }}>还没有账号？</span>
            <Link to="/register" style={{ color: '#8C1F28', textDecoration: 'underline' }}>立即注册</Link>
          </div>
        </div>
      </div>

      {/* 角落低调管理员入口（UI/UX §4.4.9：同页跳转，不新开窗口） */}
      <a
        href={ADMIN_LOGIN_URL}
        style={{ position: 'absolute', bottom: 18, right: 24, fontSize: 12, color: 'var(--text-weak)', textDecoration: 'none', opacity: .7 }}
        title="管理员入口"
      >
        管理员入口
      </a>
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
