// =============================================================================
// src/components/ScrollToTop.tsx — 路由切换滚动重置
// -----------------------------------------------------------------------------
// 功能：SPA 路由切换默认保留滚动位置（从长页面底部点导航，新页面仍停在
//       底部）。本组件监听 pathname，变化时立即滚回页面顶部，保证从任何
//       入口进入新页面都从顶端开始展示。
// 说明：仅监听 pathname（不监听 hash），不干扰页面内锚点/聊天滚动。
// =============================================================================

import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null  // 纯副作用组件，不渲染任何内容
}
