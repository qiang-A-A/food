// =============================================================================
// src/App.tsx — 后台路由骨架（19 路由）
// -----------------------------------------------------------------------------
// 功能：声明后台全部管理路由（对应方案 §4.2 已确认的 12 项一级 / 19 路由）。
//       当前各页为占位；M5 阶段逐个实现完整管理模块。
// 说明：路由统一挂在 AdminLayout 下（顶栏 + 手风琴侧栏 + 内容区）；
//       超管登录为独立路由；AdminGuard 守卫在 M5 接入。
// =============================================================================

import { Navigate, Route, Routes } from 'react-router-dom' // 路由组件

import { AdminLayout } from '@/layouts/AdminLayout' // 后台布局（顶栏+侧栏+内容）
import { Placeholder } from '@/pages/Placeholder'   // 页面占位组件

function App() {
  return (
    <Routes>
      {/* ---- 超管登录：独立页面（登录页角落入口跳转）---- */}
      <Route path="/admin/login" element={<Placeholder name="超管登录" standalone />} />

      {/* ---- 后台主体：全部管理路由挂载在 AdminLayout 下 ---- */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Placeholder name="仪表盘" />} />

        {/* 产品管理：列表 / 回收站 */}
        <Route path="products" element={<Placeholder name="产品列表" />} />
        <Route path="products/trash" element={<Placeholder name="产品回收站" />} />

        {/* 系列管理：列表 / 排序 */}
        <Route path="categories" element={<Placeholder name="系列列表" />} />
        <Route path="categories/sort" element={<Placeholder name="系列排序" />} />

        {/* 新闻管理：列表 / 回收站 */}
        <Route path="news" element={<Placeholder name="新闻列表" />} />
        <Route path="news/trash" element={<Placeholder name="新闻回收站" />} />

        {/* 轮播图管理 */}
        <Route path="banners" element={<Placeholder name="轮播图管理" />} />

        {/* 关于我们：公司简介 / 品牌故事 / 荣誉资质 / 核心卖点 */}
        <Route path="about/intro" element={<Placeholder name="公司简介" />} />
        <Route path="about/story" element={<Placeholder name="品牌故事" />} />
        <Route path="about/honors" element={<Placeholder name="荣誉资质" />} />
        <Route path="about/selling-points" element={<Placeholder name="核心卖点" />} />

        {/* 团购意向管理 / 用户管理 / 管理员管理 / 部门管理 / 角色管理 */}
        <Route path="intents" element={<Placeholder name="团购意向管理" />} />
        <Route path="users" element={<Placeholder name="用户管理" />} />
        <Route path="admins" element={<Placeholder name="管理员管理" />} />
        <Route path="departments" element={<Placeholder name="部门管理" />} />
        <Route path="roles" element={<Placeholder name="角色管理" />} />

        {/* 系统设置：联系方式（MVP 必做）/ 站点设置（P2） */}
        <Route path="settings/contact" element={<Placeholder name="联系方式设置" />} />
        <Route path="settings/site" element={<Placeholder name="站点设置" />} />
      </Route>

      {/* 根路径重定向到后台（便于直接访问 /admin） */}
      <Route path="/" element={<Navigate to="/admin" replace />} />
      {/* 兜底：未知后台路由回仪表盘 */}
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  )
}

export default App
