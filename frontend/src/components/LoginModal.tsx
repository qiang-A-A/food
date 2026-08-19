// =============================================================================
// src/components/LoginModal.tsx — 全局登录弹窗（权限分水岭核心）
// -----------------------------------------------------------------------------
// 功能：未登录用户点击受限操作（预约/咨询/团购/定制意向）时弹出的登录弹窗
//       （UI/UX §4.3 登录弹窗 + §6.5 权限分水岭）：
//       手机号+密码+记住登录态 → 校验 → 登录成功关闭弹窗并执行回跳动作；
//       含「去注册」入口（跳转注册页）；遮罩点击/ESC 关闭；焦点管理。
// =============================================================================

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { http } from '@/api/http'
import { userApi } from '@tsgq/api-client'
import { useAuthStore } from '@/store/auth'
import { useUiStore } from '@/store/ui'

export function LoginModal() {
  const open = useUiStore((s) => s.loginModalOpen)
  const closeLogin = useUiStore((s) => s.closeLogin)
  const runReturnAction = useUiStore((s) => s.runReturnAction)
  const clearReturnAction = useUiStore((s) => s.clearReturnAction)
  const showToast = useUiStore((s) => s.showToast)
  const setLogin = useAuthStore((s) => s.setLogin)
  const navigate = useNavigate()

  // 表单状态
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // ESC 关闭 + 焦点管理（UI/UX §7 无障碍）
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLogin()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, closeLogin])

  // 未打开时不渲染
  if (!open) return null

  // 提交登录
  const handleLogin = async () => {
    setError('')
    // 前端校验（11 位手机号 + 密码非空）
    if (!/^1\d{10}$/.test(phone)) {
      setError('请输入 11 位手机号')
      return
    }
    if (!password) {
      setError('请输入密码')
      return
    }
    setLoading(true)
    try {
      const res: any = await http.post(userApi.login, { phone, password })
      // 写入登录态（userToken 持久化到 localStorage）
      setLogin(res.data.token, res.data.user.nickname || '宫阙会员', res.data.user.avatar)
      closeLogin()
      runReturnAction()  // 权限分水岭：执行触发源的回跳动作（展开预约/意向表单等）
      showToast('ok', '登录成功')
    } catch (e: any) {
      setError(e.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="登录"
      onMouseDown={(e) => { if (e.target === e.currentTarget) closeLogin() }}  // 遮罩点击关闭
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(43,29,22,.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 16px',
      }}
    >
      {/* 登录卡片：宣纸白底 + 顶部金红金渐变条（UI/UX §3.1.2 认证卡） */}
      <div style={{ width: '100%', maxWidth: 380, background: '#FFFDF7', borderRadius: 2, boxShadow: '0 12px 40px rgba(0,0,0,.3)', position: 'relative' }}>
        <div style={{ height: 4, background: 'var(--grad-authbar)', borderRadius: '2px 2px 0 0' }} />
        <div style={{ padding: '30px 32px 26px' }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontFamily: 'var(--font-title)', fontSize: 22, fontWeight: 700, letterSpacing: 4, color: 'var(--red-3)' }}>会员登录</div>
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-weak)' }}>登录后可预约 · 咨询 · 提交团购/定制意向</div>
          </div>

          {/* 手机号 */}
          <label style={{ display: 'block', fontSize: 13, color: '#3E2C22', marginBottom: 4 }} htmlFor="lm-phone">手机号</label>
          <input
            id="lm-phone"
            type="tel"
            maxLength={11}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
            placeholder="请输入 11 位手机号"
            style={inputStyle}
          />

          {/* 密码 */}
          <label style={{ display: 'block', fontSize: 13, color: '#3E2C22', margin: '12px 0 4px' }} htmlFor="lm-pwd">密码</label>
          <input
            id="lm-pwd"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="请输入密码"
            style={inputStyle}
          />

          {/* 错误提示 */}
          {error && <div style={{ marginTop: 10, fontSize: 13, color: '#8C1F28' }}>{error}</div>}

          {/* 登录按钮 */}
          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: '100%', marginTop: 18, background: 'var(--red)', color: '#F6ECD7',
              border: 'none', borderRadius: 2, padding: '11px 0', fontSize: 15, letterSpacing: 6,
              cursor: 'pointer', fontWeight: 600, opacity: loading ? .6 : 1,
            }}
          >
            {loading ? '登录中…' : '登 录'}
          </button>

          {/* 去注册入口 */}
          <div style={{ marginTop: 14, textAlign: 'center', fontSize: 13 }}>
            <span style={{ color: 'var(--text-weak)' }}>还没有账号？</span>
            <button
              onClick={() => { closeLogin(); clearReturnAction(); navigate('/register') }}
              style={{ background: 'none', border: 'none', color: '#8C1F28', cursor: 'pointer', fontSize: 13, textDecoration: 'underline' }}
            >
              去注册
            </button>
          </div>
        </div>

        {/* 关闭按钮 */}
        <button
          aria-label="关闭"
          onClick={closeLogin}
          style={{ position: 'absolute', top: 10, right: 12, background: 'none', border: 'none', fontSize: 20, color: '#999', cursor: 'pointer', lineHeight: 1 }}
        >
          ×
        </button>
      </div>
    </div>
  )
}

// 输入框统一样式（白底金边，UI/UX §4.3 输入框规范）
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  border: '1px solid var(--gold)',
  borderRadius: 2,
  fontSize: 14,
  background: '#FFF',
  outline: 'none',
  boxSizing: 'border-box',
}
