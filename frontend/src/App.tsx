// =============================================================================
// src/App.tsx — 前台路由骨架（12 路由 + 404）
// -----------------------------------------------------------------------------
// 功能：声明前台全部页面路由（对应 PRD §4.1 与 UI/UX §1.2 13 视图）。
//       当前各页为占位组件，M4 阶段逐个替换为完整页面实现。
// 说明：路由层级 — 公共布局（导航/页脚）包裹业务页；认证页（登录/注册）
//       独立渲染；个人中心由 ProfileGuard 守卫（M4 实现守卫逻辑）。
// =============================================================================

import { Route, Routes } from 'react-router-dom' // 路由声明组件

import { Placeholder } from '@/pages/Placeholder' // 占位页组件（M4 逐个替换）
import { PublicLayout } from '@/layouts/PublicLayout' // 公共布局（导航 + 页脚）

function App() {
  return (
    <Routes>
      {/* ---- 公共布局组：顶部导航 + 页脚包裹的全部业务页 ---- */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Placeholder name="首页" />} />
        <Route path="/about" element={<Placeholder name="关于我们" />} />
        <Route path="/products" element={<Placeholder name="产品系列" />} />
        <Route path="/products/:id" element={<Placeholder name="产品详情" />} />
        <Route path="/news" element={<Placeholder name="新闻资讯" />} />
        <Route path="/news/:id" element={<Placeholder name="新闻详情" />} />
        <Route path="/customize" element={<Placeholder name="礼盒定制" />} />
        <Route path="/contact" element={<Placeholder name="联系我们" />} />
        {/* 个人中心：需登录（ProfileGuard 守卫在 M4 接入） */}
        <Route path="/profile" element={<Placeholder name="个人中心" />} />
      </Route>

      {/* ---- 认证页：独立布局（宣纸底 + 居中卡片，不显示导航/页脚）---- */}
      <Route path="/login" element={<Placeholder name="登录" standalone />} />
      <Route path="/register" element={<Placeholder name="注册" standalone />} />

      {/* ---- 404：未知路由友好提示（PRD F-7）---- */}
      <Route path="*" element={<Placeholder name="404" standalone />} />
    </Routes>
  )
}

export default App
