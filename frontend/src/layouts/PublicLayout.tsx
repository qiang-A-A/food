// =============================================================================
// src/layouts/PublicLayout.tsx — 前台公共布局（导航 + 内容 + 页脚）
// -----------------------------------------------------------------------------
// 功能：渲染顶部导航、页面内容出口（Outlet）与页脚；业务页面在此布局内。
//       M4 起为完整实现（红渐变导航、深红→玄黑页脚、结构性红竖线由
//       global.css main::before/after 提供）。
// =============================================================================

import { Outlet } from 'react-router-dom'

import { NavBar } from '@/components/NavBar'
import { Footer } from '@/components/Footer'

export function PublicLayout() {
  return (
    <>
      {/* 顶部导航（红渐变吸顶 + 金色底边线） */}
      <NavBar />

      {/* 页面内容区：结构性红竖线在 main::before/after（global.css） */}
      <main>
        <Outlet />
      </main>

      {/* 页脚（深红→玄黑渐变 + 合规信息） */}
      <Footer />
    </>
  )
}
