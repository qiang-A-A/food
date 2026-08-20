// =============================================================================
// src/App.tsx — 后台路由（超管登录 + 12 项一级 / 19 路由）
// -----------------------------------------------------------------------------
// 功能：后台全部管理路由（对应方案 §4.2 已确认结构），主体挂载在
//       AdminLayout 下并受 AdminGuard 守卫；超管登录为独立路由。
// =============================================================================

import { Navigate, Route, Routes } from 'react-router-dom'

import { AdminLayout } from '@/layouts/AdminLayout'
import { AdminGuard } from '@/guards/AdminGuard'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Products from '@/pages/Products'
import ProductsTrash from '@/pages/ProductsTrash'
import Categories from '@/pages/Categories'
import CategoriesSort from '@/pages/CategoriesSort'
import News from '@/pages/News'
import NewsTrash from '@/pages/NewsTrash'
import Banners from '@/pages/Banners'
import AboutIntro from '@/pages/AboutIntro'
import AboutStory from '@/pages/AboutStory'
import AboutHonors from '@/pages/AboutHonors'
import AboutPoints from '@/pages/AboutPoints'
import Intents from '@/pages/Intents'
import IntentTrash from '@/pages/IntentTrash'
import Messages from '@/pages/Messages'
import Users from '@/pages/Users'
import Admins from '@/pages/Admins'
import Departments from '@/pages/Departments'
import Roles from '@/pages/Roles'
import SettingsContact from '@/pages/SettingsContact'
import SettingsSite from '@/pages/SettingsSite'

function App() {
  return (
    <Routes>
      {/* 超管登录（独立页面） */}
      <Route path="/admin/login" element={<Login />} />

      {/* 后台主体（AdminGuard 守卫） */}
      <Route
        path="/admin"
        element={
          <AdminGuard>
            <AdminLayout />
          </AdminGuard>
        }
      >
        <Route index element={<Dashboard />} />
        {/* 产品管理 */}
        <Route path="products" element={<Products />} />
        <Route path="products/trash" element={<ProductsTrash />} />
        {/* 系列管理 */}
        <Route path="categories" element={<Categories />} />
        <Route path="categories/sort" element={<CategoriesSort />} />
        {/* 新闻管理 */}
        <Route path="news" element={<News />} />
        <Route path="news/trash" element={<NewsTrash />} />
        {/* 轮播图 */}
        <Route path="banners" element={<Banners />} />
        {/* 关于我们 */}
        <Route path="about/intro" element={<AboutIntro />} />
        <Route path="about/story" element={<AboutStory />} />
        <Route path="about/honors" element={<AboutHonors />} />
        <Route path="about/selling-points" element={<AboutPoints />} />
        {/* 团购意向 / 意向回收站 / 消息 / 用户 / 管理员 / 部门 / 角色 */}
        <Route path="intents" element={<Intents />} />
        <Route path="intents/trash" element={<IntentTrash />} />
        <Route path="messages" element={<Messages />} />
        <Route path="users" element={<Users />} />
        <Route path="admins" element={<Admins />} />
        <Route path="departments" element={<Departments />} />
        <Route path="roles" element={<Roles />} />
        {/* 系统设置 */}
        <Route path="settings/contact" element={<SettingsContact />} />
        <Route path="settings/site" element={<SettingsSite />} />
      </Route>

      {/* 根路径 → 后台（后台为独立应用） */}
      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  )
}

export default App
