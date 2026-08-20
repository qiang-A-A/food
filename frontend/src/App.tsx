// =============================================================================
// src/App.tsx — 前台路由（12 路由 + 404）
// -----------------------------------------------------------------------------
// 功能：声明前台全部页面路由（对应 PRD §4.1 与 UI/UX §1.2 13 视图），
//       挂载全局登录弹窗与 Toast；个人中心由 ProfileGuard 守卫。
// =============================================================================

import { Route, Routes } from 'react-router-dom'

import { PublicLayout } from '@/layouts/PublicLayout'
import { ProfileGuard } from '@/guards/ProfileGuard'
import { LoginModal } from '@/components/LoginModal'
import { ScrollToTop } from '@/components/ScrollToTop'
import { Toast } from '@/components/Toast'

import Home from '@/pages/Home'
import About from '@/pages/About'
import Products from '@/pages/Products'
import ProductDetail from '@/pages/ProductDetail'
import News from '@/pages/News'
import NewsDetail from '@/pages/NewsDetail'
import Customize from '@/pages/Customize'
import Contact from '@/pages/Contact'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Profile from '@/pages/Profile'
import NotFound from '@/pages/NotFound'

function App() {
  return (
    <>
      {/* 路由切换滚动重置：任何入口进入新页面都从顶部开始（含页脚导航跳转） */}
      <ScrollToTop />
      {/* 全局浮层：登录弹窗（权限分水岭）+ Toast */}
      <LoginModal />
      <Toast />

      <Routes>
        {/* ---- 公共布局组：顶部导航 + 页脚包裹的业务页 ---- */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/news" element={<News />} />
          <Route path="/news/:id" element={<NewsDetail />} />
          <Route path="/customize" element={<Customize />} />
          <Route path="/contact" element={<Contact />} />
          {/* 个人中心：需登录（ProfileGuard 守卫） */}
          <Route path="/profile" element={<ProfileGuard><Profile /></ProfileGuard>} />
          {/* 404：未知路由友好提示（在公共布局内渲染） */}
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* ---- 认证页：独立布局（宣纸底 + 居中卡片，无导航/页脚） ---- */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </>
  )
}

export default App
