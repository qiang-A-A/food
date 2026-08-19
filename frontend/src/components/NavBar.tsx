// =============================================================================
// src/components/NavBar.tsx — 顶部导航
// -----------------------------------------------------------------------------
// 功能：前台全站导航（UI/UX §4.2）——宫廷红渐变吸顶 + 金色底边线；
//       6 个菜单项（首页/关于我们/产品系列/定制服务/新闻资讯/联系我们）；
//       右侧登录态区（未登录：登录+注册按钮；已登录：头像+昵称→个人中心）；
//       移动端汉堡菜单（≤768px 纵向展开）。
// =============================================================================

import { useState } from 'react' // 菜单展开状态
import { Link, NavLink, useNavigate } from 'react-router-dom' // 路由链接

import { useAuthStore } from '@/store/auth'

// 菜单项定义（与 PRD/UI/UX 对齐：原型为 6 项含「定制服务」）
const MENUS = [
  { to: '/', label: '首页' },
  { to: '/about', label: '关于我们' },
  { to: '/products', label: '产品系列' },
  { to: '/customize', label: '定制服务' },
  { to: '/news', label: '新闻资讯' },
  { to: '/contact', label: '联系我们' },
]

export function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false) // 移动端汉堡展开态
  const { isLogin, nickname } = useAuthStore()
  const navigate = useNavigate()

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'var(--grad-nav)',   // 宫廷红渐变（UI/UX §3.1.2）
        borderBottom: '2px solid var(--gold)', // 金色底边线
      }}
    >
      <div
        className="container"
        style={{ height: 76, display: 'flex', alignItems: 'center', gap: 28 }}
      >
        {/* Logo：金色图形 + 书法体品牌名（UI/UX §3.8） */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
          <svg width="34" height="34" viewBox="0 0 48 48" aria-hidden="true">
            <circle cx="24" cy="24" r="21" fill="none" stroke="#C9A96A" strokeWidth="2" />
            <path d="M24 8l3.5 9.5L37 17l-8 5 3 9.5-8-6-8 6 3-9.5-8-5 9.5.5z" fill="#C9A96A" opacity=".9" />
          </svg>
          <span style={{ fontFamily: 'var(--font-title)', fontWeight: 900, fontSize: 23, color: '#F6ECD7', letterSpacing: 3 }}>
            天上宫阙
          </span>
        </Link>

        {/* 菜单（桌面端） */}
        <nav aria-label="主导航" style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
          {MENUS.map((m) => (
            <NavLink
              key={m.to}
              to={m.to}
              end={m.to === '/'}
              className="nav-item"
              style={({ isActive }) => ({
                padding: '8px 14px',
                fontSize: 15,
                letterSpacing: 2,
                color: isActive ? '#FFF' : 'rgba(246,236,215,.88)',
                textDecoration: 'none',
                position: 'relative',
                borderBottom: isActive ? '2px solid #C9A96A' : '2px solid transparent',
                transition: 'color .25s',
              })}
            >
              {m.label}
            </NavLink>
          ))}
        </nav>

        {/* 登录态区：未登录显示登录/注册；已登录显示昵称（隐藏于移动端汉堡） */}
        <div className="nav-user" style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {isLogin ? (
            <button
              onClick={() => navigate('/profile')}
              style={{ background: 'none', border: '1px solid rgba(201,169,106,.7)', color: '#F6ECD7', borderRadius: 2, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}
            >
              {nickname || '宫阙会员'}
            </button>
          ) : (
            <>
              <button
                onClick={() => navigate('/login')}
                style={{ background: 'none', border: '1px solid var(--gold)', color: 'var(--gold-light)', borderRadius: 2, padding: '6px 16px', cursor: 'pointer', fontSize: 13 }}
              >
                登录
              </button>
              <button
                onClick={() => navigate('/register')}
                style={{ background: 'var(--gold)', border: 'none', color: '#3A2B16', borderRadius: 2, padding: '6px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
              >
                注册
              </button>
            </>
          )}
        </div>

        {/* 汉堡按钮（移动端） */}
        <button
          className="hamburger"
          aria-label="菜单"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 6,
            marginLeft: 'auto',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" stroke="#F6ECD7" strokeWidth="2">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </div>

      {/* 移动端菜单：纵向全宽列表（红渐变底） */}
      {menuOpen && (
        <nav
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '0 24px 16px',
            gap: 2,
            background: 'var(--grad-nav)',
          }}
        >
          {MENUS.map((m) => (
            <NavLink
              key={m.to}
              to={m.to}
              end={m.to === '/'}
              onClick={() => setMenuOpen(false)}
              style={({ isActive }) => ({
                padding: '12px 8px',
                color: isActive ? '#FFF' : 'rgba(246,236,215,.85)',
                textDecoration: 'none',
                borderBottom: '1px solid rgba(201,169,106,.25)',
                letterSpacing: 2,
              })}
            >
              {m.label}
            </NavLink>
          ))}
        </nav>
      )}

      {/* 响应式：≤768px 显示汉堡、隐藏桌面菜单与登录区 */}
      <style>{`
        @media (max-width: 768px) {
          nav[aria-label="主导航"] { display: none !important; }
          .nav-user { display: none !important; }
          .hamburger { display: block !important; }
        }
      `}</style>
    </header>
  )
}
