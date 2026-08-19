// =============================================================================
// src/pages/Profile.tsx — 个人中心（PRD F-6）
// -----------------------------------------------------------------------------
// 功能：左侧资料卡（头像/昵称/手机号）+ 三导航（个人资料/修改密码/我的意向/
//       退出登录）；右侧内容区——资料编辑（昵称/手机号）、头像修改（上传本地
//       图片 ≤2MB 或 6 款默认头像库）、修改密码、我的意向列表。
// 数据：GET/PUT /api/user/profile、PUT /api/user/password、POST /api/user/avatar、
//       GET /api/user/intents。本页需登录（ProfileGuard 守卫）。
// =============================================================================

import { useEffect, useRef, useState } from 'react'

import { http } from '@/api/http'
import { userApi } from '@tsgq/api-client'
import { useAuthStore } from '@/store/auth'
import { useUiStore } from '@/store/ui'
import { PageBanner } from '@/components/PageBanner'

// 默认头像库（6 款，PRD F-6）：渲染为不同配色圆 + 宫阙字样
const DEFAULT_AVATARS = [
  { key: 'default-1', bg: '#8C1F28', label: '阙' },
  { key: 'default-2', bg: '#A8863F', label: '宫' },
  { key: 'default-3', bg: '#3E2C22', label: '御' },
  { key: 'default-4', bg: '#6E161D', label: '礼' },
  { key: 'default-5', bg: '#7A1A22', label: '成' },
  { key: 'default-6', bg: '#5A1016', label: '天' },
]

// 我的意向项
interface MyIntent { id: number; name: string; phone: string; company: string | null; requirement: string | null; quantity_range: string | null; source: string; status: string; created_at: string }

// 状态文案映射（后台同义，前台展示）
const STATUS_TEXT: Record<string, string> = { pending: '待跟进', contacted: '已联系', deal: '已成交', closed: '已关闭' }

type Tab = 'info' | 'avatar' | 'password' | 'intents'

export default function Profile() {
  const { nickname, setLogin, logout } = useAuthStore()
  const showToast = useUiStore((s) => s.showToast)

  // 用户资料
  const [profile, setProfile] = useState<{ id: number; phone: string; nickname: string | null; avatar: string | null } | null>(null)
  // 当前 Tab
  const [tab, setTab] = useState<Tab>('info')
  // 我的意向
  const [intents, setIntents] = useState<MyIntent[]>([])
  // 表单状态
  const [nick, setNick] = useState('')
  const [phone, setPhone] = useState('')
  const [pwd, setPwd] = useState({ old: '', fresh: '' })
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('') // 审计修复：资料/意向加载失败提示（此前静默吞错）
  const fileRef = useRef<HTMLInputElement>(null) // 头像上传 input

  // 加载个人资料 + 我的意向（审计修复：失败显示错误而非空白/“暂无意向”误导）
  useEffect(() => {
    http.get(userApi.profile).then((res: any) => {
      setProfile(res.data)
      setNick(res.data.nickname ?? '')
      setPhone(res.data.phone ?? '')
    }).catch((e: any) => setLoadError(e.message || '资料加载失败'))
    http.get(userApi.intents).then((res: any) => setIntents(res.data.items ?? [])).catch(() => setLoadError('意向记录加载失败'))
  }, [])

  // 更新资料（昵称/手机号）
  const handleSaveInfo = async () => {
    setError('')
    // 审计修复：手机号格式校验（此前仅 maxLength，填了非法号码也保存）
    if (phone && !/^1\d{10}$/.test(phone)) { setError('手机号格式不正确（11 位，1 开头）'); return }
    try {
      await http.put(userApi.profile, { nickname: nick, phone })
      // 审计修复：从 store 读真实 token 写回登录态——此前 `?? ''` 在 token 为空时
      // 会把 isLogin 置 true 而 token 为空串，导致后续请求不带鉴权头
      const token = useAuthStore.getState().userToken
      if (!token) return
      setLogin(token, nick || '宫阙会员', profile?.avatar ?? '')
      showToast('ok', '资料已保存')
    } catch (e: any) { setError(e.message) }
  }

  // 修改密码
  const handleChangePwd = async () => {
    setError('')
    // 审计修复：补校验——新密码上限 20 位、原密码必填（此前仅查下限 6）
    if (pwd.fresh.length < 6 || pwd.fresh.length > 20) { setError('新密码长度需 6-20 位'); return }
    if (!pwd.old) { setError('请输入原密码'); return }
    try {
      await http.put(userApi.password, { old_password: pwd.old, new_password: pwd.fresh })
      setPwd({ old: '', fresh: '' })
      showToast('ok', '密码修改成功')
    } catch (e: any) { setError(e.message) }
  }

  // 选择默认头像
  const handlePickAvatar = async (key: string) => {
    try {
      const res: any = await http.post(userApi.avatar, null, { params: { avatar_key: key } })
      setProfile((p) => (p ? { ...p, avatar: res.data.avatar } : p))
      showToast('ok', '头像已更新')
    } catch (e: any) { showToast('err', e.message) }
  }

  // 上传本地头像（≤2MB jpg/png）
  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { showToast('err', '图片不能超过 2MB'); return }
    // 审计修复：显式校验文件类型（accept 属性可被绕过，此前可上传任意类型文件）
    if (!['image/jpeg', 'image/png'].includes(file.type)) { showToast('err', '仅支持 jpg/png 图片'); return }
    const fd = new FormData()
    fd.append('file', file)
    fd.append('avatar_key', '')
    try {
      const res: any = await http.post(userApi.avatar, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setProfile((p) => (p ? { ...p, avatar: res.data.avatar } : p))
      showToast('ok', '头像上传成功')
    } catch (err: any) { showToast('err', err.message) } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  // 退出登录
  const handleLogout = () => {
    logout()
    showToast('ok', '已退出登录')
  }

  return (
    <div>
      <PageBanner title="个人中心" en="My Account" />
      <div className="container" style={{ maxWidth: 960 }}>
        {/* 审计修复：加载失败提示（此前静默吞错无法区分“暂无”与“请求失败”） */}
        {loadError && <div style={{ margin: '0 0 12px', padding: '10px 14px', background: '#FDF0EE', border: '1px solid #E5C6C0', color: '#8C1F28', fontSize: 13, borderRadius: 2 }}>⚠ {loadError}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 28, alignItems: 'start' }}>
          {/* ===== 左：资料卡 + 导航 ===== */}
          <div style={{ background: '#FFFDF7', border: '1px solid var(--line)', borderRadius: 2, padding: 28, textAlign: 'center' }}>
            {/* 头像（红渐变圆 + 首字，UI/UX §4.4.12） */}
            <div style={{ width: 84, height: 84, margin: '0 auto', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(165deg,#A4252E,#5A1016)', fontSize: 34, color: '#F6ECD7', fontWeight: 700 }}>
              {profile?.avatar?.startsWith('default-') ? (
                (DEFAULT_AVATARS.find((a) => a.key === profile.avatar)?.label ?? '阙')
              ) : profile?.avatar ? (
                <img src={profile.avatar} alt="头像" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : '阙'}
            </div>
            <div style={{ marginTop: 12, fontFamily: 'var(--font-title)', fontSize: 18, fontWeight: 700, color: 'var(--red-3)' }}>{nickname || '宫阙会员'}</div>
            <div style={{ marginTop: 4, fontSize: 13, color: 'var(--text-weak)' }}>{profile?.phone ?? '--'}</div>

            {/* 导航 */}
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {([
                ['info', '个人资料'],
                ['avatar', '修改头像'],
                ['password', '修改密码'],
                ['intents', '我的意向'],
              ] as [Tab, string][]).map(([k, label]) => (
                <button key={k} onClick={() => setTab(k)} style={{ padding: '10px 0', border: 'none', borderBottom: tab === k ? '2px solid #8C1F28' : '1px solid var(--line)', background: 'none', color: tab === k ? '#8C1F28' : '#666', cursor: 'pointer', fontSize: 14, fontWeight: tab === k ? 600 : 400 }}>
                  {label}
                </button>
              ))}
              <button onClick={handleLogout} style={{ padding: '10px 0', border: 'none', background: 'none', color: '#8C1F28', cursor: 'pointer', fontSize: 14 }}>
                退出登录
              </button>
            </div>
          </div>

          {/* ===== 右：内容区 ===== */}
          <div style={{ background: '#FFFDF7', border: '1px solid var(--line)', borderRadius: 2, padding: 28 }}>
            {tab === 'info' && (
              <>
                <Title>个人资料</Title>
                <Field label="昵称"><input value={nick} onChange={(e) => setNick(e.target.value)} style={inputStyle} /></Field>
                <Field label="手机号"><input value={phone} maxLength={11} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} style={inputStyle} /></Field>
                {error && <Err text={error} />}
                <Btn onClick={handleSaveInfo}>保存资料</Btn>
              </>
            )}

            {tab === 'avatar' && (
              <>
                <Title>修改头像</Title>
                {/* 默认头像库（6 款） */}
                <div style={{ fontSize: 13, color: 'var(--text-weak)', margin: '8px 0 12px' }}>从默认头像库选择：</div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {DEFAULT_AVATARS.map((a) => (
                    <button
                      key={a.key}
                      onClick={() => handlePickAvatar(a.key)}
                      aria-label={`选择默认头像 ${a.label}`}
                      style={{
                        width: 52, height: 52, borderRadius: '50%', background: a.bg, color: '#F6ECD7',
                        fontSize: 20, fontWeight: 700, border: profile?.avatar === a.key ? '3px solid var(--gold)' : '3px solid transparent',
                        cursor: 'pointer',
                      }}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
                {/* 上传本地图片 */}
                <div style={{ fontSize: 13, color: 'var(--text-weak)', margin: '22px 0 12px' }}>或上传本地图片（≤2MB，jpg/png）：</div>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png" onChange={handleUploadAvatar} style={{ fontSize: 13 }} />
              </>
            )}

            {tab === 'password' && (
              <>
                <Title>修改密码</Title>
                <Field label="原密码"><input type="password" value={pwd.old} onChange={(e) => setPwd((p) => ({ ...p, old: e.target.value }))} style={inputStyle} /></Field>
                <Field label="新密码"><input type="password" value={pwd.fresh} onChange={(e) => setPwd((p) => ({ ...p, fresh: e.target.value }))} placeholder="6-20 位" style={inputStyle} /></Field>
                {error && <Err text={error} />}
                <Btn onClick={handleChangePwd}>确认修改</Btn>
              </>
            )}

            {tab === 'intents' && (
              <>
                <Title>我的意向</Title>
                {intents.length === 0 && <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-weak)', fontSize: 13 }}>暂无意向记录</div>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                  {intents.map((it) => (
                    <div key={it.id} style={{ border: '1px solid var(--line)', borderRadius: 2, padding: 14, fontSize: 13 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <b style={{ color: 'var(--red-3)' }}>{it.requirement || '意向咨询'}</b>
                        <span style={{ color: '#52C41A' }}>{STATUS_TEXT[it.status] ?? it.status}</span>
                      </div>
                      <div style={{ marginTop: 6, color: 'var(--text-weak)' }}>
                        {it.quantity_range || '数量面议'} · {(it.created_at || '').slice(0, 10)}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// 区块标题
function Title({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: 'var(--font-title)', fontSize: 18, fontWeight: 700, color: 'var(--red-3)', marginBottom: 14 }}>{children}</div>
}
// 字段包装
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 13, color: '#3E2C22', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  )
}
// 错误提示
function Err({ text }: { text: string }) { return <div style={{ marginBottom: 10, fontSize: 13, color: '#8C1F28' }}>{text}</div> }
// 主按钮
function Btn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ marginTop: 6, background: 'var(--red)', color: '#F6ECD7', border: 'none', borderRadius: 2, padding: '10px 34px', fontSize: 14, letterSpacing: 2, cursor: 'pointer' }}>
      {children}
    </button>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid var(--gold)', borderRadius: 2,
  fontSize: 14, background: '#FFF', outline: 'none', boxSizing: 'border-box',
}
