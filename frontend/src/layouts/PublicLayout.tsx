// =============================================================================
// src/layouts/PublicLayout.tsx — 前台公共布局（导航 + 页脚）
// -----------------------------------------------------------------------------
// 功能：渲染顶部导航栏与页脚，包裹业务页面内容（对应 UI/UX §4.1 页面框架）。
//       M4 阶段替换为完整实现（宫廷红渐变导航、金色底边线、深红→玄黑页脚）。
// =============================================================================

import { Outlet } from 'react-router-dom' // 嵌套路由出口：渲染子路由内容

export function PublicLayout() {
  return (
    <>
      {/* 顶部导航占位（M4 完整实现：红渐变吸顶 + 6 菜单项 + 登录态区） */}
      <header style={{ height: 76, background: 'var(--grad-nav)', color: '#F6ECD7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, letterSpacing: 4 }}>
        天上宫阙 · 顶部导航（M1 占位）
      </header>

      {/* 页面内容区：结构性红竖线由 global.css main::before/after 提供 */}
      <main className="container" style={{ minHeight: '60vh', padding: '40px 24px' }}>
        <Outlet />
      </main>

      {/* 页脚占位（M4 完整实现：深红→玄黑渐变 + 热线/地址/备案/SC 许可） */}
      <footer style={{ background: 'var(--grad-footer)', color: '#E8D9B5', textAlign: 'center', padding: '32px 0', fontSize: 13 }}>
        天上宫阙 · 御礼天成 — 页脚（M1 占位）
      </footer>
    </>
  )
}
