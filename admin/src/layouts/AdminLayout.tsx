// =============================================================================
// src/layouts/AdminLayout.tsx — 后台布局骨架（顶栏 + 侧栏 + 内容区）
// -----------------------------------------------------------------------------
// 功能：后台整体框架（UI/UX §5.1）：56px 顶栏（Logo/面包屑/管理员）+ 224px
//       手风琴侧栏 + 内容区。M5 阶段替换为完整实现（12 一级菜单/折叠/高亮）。
// =============================================================================

import { Outlet } from 'react-router-dom' // 嵌套路由出口
import { Layout, Menu, Typography } from 'antd' // AntD 布局组件
import { DashboardOutlined, GiftOutlined } from '@ant-design/icons' // 图标（示意）

const { Header, Sider, Content } = Layout

export function AdminLayout() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* ---- 顶栏：56px 白底金边（Logo + 后台名 + 面包屑占位）---- */}
      <Header style={{ background: '#fff', borderBottom: '1px solid #C9A96A', padding: '0 20px', display: 'flex', alignItems: 'center', gap: 12, height: 56, lineHeight: '56px' }}>
        <Typography.Text strong style={{ color: '#6E161D', fontSize: 16, letterSpacing: 2 }}>
          天上宫阙 · 后台管理
        </Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          首页 / 仪表盘
        </Typography.Text>
      </Header>

      <Layout>
        {/* ---- 侧栏：224px 白底，一级菜单示意（M5 完整 12 项手风琴）---- */}
        <Sider width={224} style={{ background: '#fff', borderRight: '1px solid #E8E8E8' }}>
          <Menu
            mode="inline"
            defaultSelectedKeys={['dashboard']}
            style={{ borderInlineEnd: 'none' }}
            items={[
              { key: 'dashboard', icon: <DashboardOutlined />, label: '仪表盘' },
              { key: 'products', icon: <GiftOutlined />, label: '产品管理', children: [
                { key: 'products', label: '产品列表' },
                { key: 'products-trash', label: '回收站' },
              ]},
            ]}
          />
        </Sider>

        {/* ---- 内容区：浅灰底 + 20px 内边距 ---- */}
        <Content style={{ background: '#F5F5F5' }}>
          <div className="admin-content">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}
