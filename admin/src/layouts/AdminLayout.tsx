// =============================================================================
// src/layouts/AdminLayout.tsx — 后台框架布局（M5 完整版）
// -----------------------------------------------------------------------------
// 功能：UI/UX §5.1 后台框架——顶栏 56px（折叠按钮/Logo/面包屑/管理员退出）
//       + 侧栏 224px（12 项一级 / 19 路由手风琴菜单，可折叠 64px + 悬停浮层）
//       + 内容区（#F5F5F5 / padding 20）。移动端（≤768px）侧栏变抽屉。
// 交互：手风琴展开（默认仅产品管理展开）、选中高亮、折叠时图标模式。
// =============================================================================

import { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  AppstoreOutlined, BlockOutlined, ClusterOutlined, DashboardOutlined,
  FileTextOutlined, FolderOutlined, GiftOutlined, IdcardOutlined,
  InfoCircleOutlined, MessageOutlined, PictureOutlined, SettingOutlined,
  ShoppingCartOutlined, TeamOutlined, UserOutlined,
} from '@ant-design/icons'
import { Avatar, Badge, Breadcrumb, Button, Drawer, Dropdown, Layout, Menu, Typography } from 'antd'

import { useAdminAuthStore } from '@/store/auth'
import { useMessagesStore } from '@/store/messages'

const { Header, Sider, Content } = Layout

// 前台官网地址（开发 5173 / 生产同域 /，后台为独立应用）
const FRONTEND_URL =
  window.location.port === '5174'
    ? `${window.location.protocol}//${window.location.hostname}:5173/`
    : '/'

// ---- 13 项一级菜单定义（含消息管理，与方案 §4.2 结构一致）----
// 消息管理菜单项在渲染时动态注入未读角标（useMessagesStore.unread）
const MENU_ITEMS = [
  { key: 'dashboard', icon: <DashboardOutlined />, label: '仪表盘' },
  {
    key: 'products', icon: <GiftOutlined />, label: '产品管理',
    children: [
      { key: '/admin/products', label: '产品列表' },
      { key: '/admin/products/trash', label: '回收站' },
    ],
  },
  {
    key: 'categories', icon: <FolderOutlined />, label: '系列管理',
    children: [
      { key: '/admin/categories', label: '系列列表' },
      { key: '/admin/categories/sort', label: '系列排序' },
    ],
  },
  {
    key: 'news', icon: <FileTextOutlined />, label: '新闻管理',
    children: [
      { key: '/admin/news', label: '新闻列表' },
      { key: '/admin/news/trash', label: '回收站' },
    ],
  },
  { key: 'banners', icon: <PictureOutlined />, label: '轮播图管理' },
  {
    key: 'about', icon: <InfoCircleOutlined />, label: '关于我们',
    children: [
      { key: '/admin/about/intro', label: '公司简介' },
      { key: '/admin/about/story', label: '品牌故事' },
      { key: '/admin/about/honors', label: '荣誉资质' },
      { key: '/admin/about/selling-points', label: '核心卖点' },
    ],
  },
  { key: 'messages', icon: <MessageOutlined />, label: '消息管理' },  // 未读角标在渲染时注入
  { key: 'intents', icon: <ShoppingCartOutlined />, label: '团购意向管理' },
  { key: 'users', icon: <TeamOutlined />, label: '用户管理' },
  { key: 'admins', icon: <IdcardOutlined />, label: '管理员管理' },
  { key: 'departments', icon: <ClusterOutlined />, label: '部门管理' },
  { key: 'roles', icon: <BlockOutlined />, label: '角色管理' },
  {
    key: 'settings', icon: <SettingOutlined />, label: '系统设置',
    children: [
      { key: '/admin/settings/contact', label: '联系方式' },
      { key: '/admin/settings/site', label: '站点设置' },
    ],
  },
]

// 一级 key → 中文名（面包屑显示）
const KEY_TITLES: Record<string, string> = {
  dashboard: '仪表盘', products: '产品管理', categories: '系列管理', news: '新闻管理',
  banners: '轮播图管理', about: '关于我们', messages: '消息管理', intents: '团购意向管理',
  users: '用户管理', admins: '管理员管理', departments: '部门管理', roles: '角色管理',
  settings: '系统设置',
}

export function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { admin, logout } = useAdminAuthStore()
  const unread = useMessagesStore((s) => s.unread)
  const refreshUnread = useMessagesStore((s) => s.refresh)

  const [collapsed, setCollapsed] = useState(false)  // 侧栏折叠
  const [openKeys, setOpenKeys] = useState<string[]>(['products']) // 默认仅产品展开
  const [drawerOpen, setDrawerOpen] = useState(false) // 移动端抽屉

  // 消息未读角标：挂载即拉取 + 每 10 秒轮询（打开会话后 Messages 页会主动 refresh）
  useEffect(() => {
    refreshUnread()
    const timer = setInterval(refreshUnread, 10_000)
    return () => clearInterval(timer)
  }, [refreshUnread])

  // 菜单项注入未读角标：消息管理 label 包 Badge（count=0 时 AntD 自动隐藏角标）
  const menuItems = useMemo(() =>
    MENU_ITEMS.map((item) =>
      item.key === 'messages'
        ? { ...item, label: <Badge count={unread} size="small" offset={[10, 0]} style={{ background: '#8C1F28' }}>消息管理</Badge> }
        : item
    ),
    [unread]
  )

  // 当前选中项（路由路径 → 反查一级 key 用于高亮）
  const selectedKeys = useMemo(() => {
    const path = location.pathname
    for (const item of MENU_ITEMS) {
      if (item.children?.some((c) => c.key === path)) return [path]
      if (path === `/admin/${item.key}` || (item.key === 'dashboard' && path === '/admin')) {
        return [item.key]
      }
    }
    return []
  }, [location.pathname])

  // 面包屑：定位当前一级菜单名
  const crumbTitle = useMemo(() => {
    const path = location.pathname
    const find = (items: typeof MENU_ITEMS): string | null => {
      for (const item of items) {
        if (item.children) {
          const child = item.children.find((c) => c.key === path)
          if (child) return `${KEY_TITLES[item.key]} / ${child.label}`
          const sub = find(item.children as any)
          if (sub) return sub
        }
        if (path === `/admin/${item.key}` || (item.key === 'dashboard' && path === '/admin')) {
          return KEY_TITLES[item.key]
        }
      }
      return null
    }
    return find(MENU_ITEMS) ?? '后台管理'
  }, [location.pathname])

  // 手风琴式展开：仅保留最后点击的父级
  const onOpenChange = (keys: string[]) => {
    setOpenKeys(keys.length ? [keys[keys.length - 1]] : [])
  }

  // 菜单点击：叶子项跳路由（支持两类 key——二级完整路径 '/admin/xxx'、
  // 一级短 key 'dashboard'/'banners' 等映射为 /admin/{key}；仪表盘为 /admin）
  const onMenuClick: any = ({ key }: { key: string }) => {
    if (key.startsWith('/admin/')) {
      navigate(key)
    } else if (key === 'dashboard') {
      navigate('/admin')
    } else {
      navigate(`/admin/${key}`)
    }
    setDrawerOpen(false)
  }

  // 退出登录
  const handleLogout = () => {
    logout()
    navigate('/admin/login', { replace: true })
  }

  // 顶栏右侧：管理员头像 + 名称 + 下拉（退出）
  const adminMenu = {
    items: [
      { key: 'logout', label: '退出登录', danger: true },
    ],
    onClick: ({ key }: { key: string }) => key === 'logout' && handleLogout(),
  }

  // 侧栏内容（桌面 Sider 与移动端 Drawer 共用）
  const siderContent = (
    <Menu
      mode="inline"
      items={menuItems}
      selectedKeys={selectedKeys}
      openKeys={collapsed ? undefined : openKeys}  // 折叠时不控制展开（AntD 自动处理）
      onOpenChange={onOpenChange}
      onClick={onMenuClick}
      inlineCollapsed={collapsed}
      style={{ borderInlineEnd: 'none', background: '#fff' }}
    />
  )

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* ===== 顶栏：56px 白底金边 ===== */}
      <Header style={{ background: '#fff', borderBottom: '1px solid #C9A96A', padding: '0 16px', display: 'flex', alignItems: 'center', gap: 12, height: 56, lineHeight: '56px', position: 'sticky', top: 0, zIndex: 10 }}>
        {/* 折叠按钮（移动端为抽屉开关） */}
        <Button
          type="text"
          icon={<AppstoreOutlined />}
          onClick={() => (window.innerWidth <= 768 ? setDrawerOpen(true) : setCollapsed((c) => !c))}
          aria-label="切换侧栏"
        />
        {/* Logo + 后台名（品牌点缀） */}
        <Typography.Text strong style={{ color: '#6E161D', fontSize: 16, letterSpacing: 2, whiteSpace: 'nowrap' }}>
          天上宫阙 · 后台管理
        </Typography.Text>
        {/* 面包屑 */}
        <Breadcrumb style={{ marginLeft: 16, fontSize: 12 }} items={[{ title: '首页' }, { title: crumbTitle }]} />

        {/* 管理员区 */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* 前台官网入口（便于从后台退回前台） */}
          <a
            href={FRONTEND_URL}
            style={{ fontSize: 13, color: '#8C1F28', textDecoration: 'none', borderBottom: '1px dashed #C9A96A' }}
            title="返回前台官网"
          >
            前台官网 →
          </a>
          <Dropdown menu={adminMenu} placement="bottomRight">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '0 8px' }}>
              <Avatar size={30} style={{ background: '#8C1F28' }} icon={<UserOutlined />} />
              <span style={{ fontSize: 13, color: '#333' }}>{admin?.name || admin?.username || '管理员'}</span>
            </div>
          </Dropdown>
        </div>
      </Header>

      <Layout>
        {/* ===== 侧栏（桌面）：224px ↔ 64px 折叠 ===== */}
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          width={224}
          collapsedWidth={64}
          className="admin-sider"
          style={{ background: '#fff', borderRight: '1px solid #E8E8E8', position: 'sticky', top: 56, height: 'calc(100vh - 56px)', overflow: 'auto' }}
        >
          {siderContent}
        </Sider>

        {/* ===== 移动端抽屉侧栏 ===== */}
        <Drawer placement="left" open={drawerOpen} onClose={() => setDrawerOpen(false)} width={224} styles={{ body: { padding: 0 } }}>
          {siderContent}
        </Drawer>

        {/* ===== 内容区 ===== */}
        <Content style={{ background: '#F5F5F5' }}>
          <div className="admin-content">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}
