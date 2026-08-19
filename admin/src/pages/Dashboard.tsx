// =============================================================================
// src/pages/Dashboard.tsx — 仪表盘
// -----------------------------------------------------------------------------
// 功能：7 个统计卡片（产品/系列/新闻/用户/轮播/团购意向/管理员，UI/UX §5.4）
//       + 4 个快捷入口（新增产品/新增新闻/上传轮播/查看团购意向）。
// 数据：GET /api/admin/dashboard。
// =============================================================================

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Col, Row, Statistic } from 'antd'
import {
  FileTextOutlined, FolderOutlined, GiftOutlined, IdcardOutlined,
  PictureOutlined, PlusOutlined, ShoppingCartOutlined, TeamOutlined,
} from '@ant-design/icons'

import { http } from '@/api/http'
import { adminApi } from '@tsgq/api-client'

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<Record<string, number> | null>(null)

  // 加载统计
  useEffect(() => {
    http.get(adminApi.dashboard).then((res: any) => setStats(res.data)).catch(() => setStats(null))
  }, [])

  // 7 统计卡定义（响应式 4 列 → 2 列 → 1 列）
  const cards = [
    { key: 'products', label: '产品数', icon: <GiftOutlined />, color: '#8C1F28', to: '/admin/products' },
    { key: 'categories', label: '系列数', icon: <FolderOutlined />, color: '#A8863F', to: '/admin/categories' },
    { key: 'news', label: '新闻数', icon: <FileTextOutlined />, color: '#1677FF', to: '/admin/news' },
    { key: 'users', label: '注册用户', icon: <TeamOutlined />, color: '#52C41A', to: '/admin/users' },
    { key: 'banners', label: '轮播图', icon: <PictureOutlined />, color: '#722ED1', to: '/admin/banners' },
    { key: 'intents', label: '团购意向', icon: <ShoppingCartOutlined />, color: '#FA8C16', to: '/admin/intents' },
    { key: 'admins', label: '管理员', icon: <IdcardOutlined />, color: '#13C2C2', to: '/admin/admins' },
  ]

  // 快捷入口（UI/UX §5.4：4 项）
  const shortcuts = [
    { label: '新增产品', icon: <PlusOutlined />, to: '/admin/products' },
    { label: '新增新闻', icon: <FileTextOutlined />, to: '/admin/news' },
    { label: '上传轮播图', icon: <PictureOutlined />, to: '/admin/banners' },
    { label: '查看团购意向', icon: <ShoppingCartOutlined />, to: '/admin/intents' },
  ]

  return (
    <div>
      <div className="admin-page-title">仪表盘</div>

      {/* 统计卡片（响应式 4 列） */}
      <Row gutter={[16, 16]}>
        {cards.map((c) => (
          <Col xs={12} sm={12} md={8} lg={6} key={c.key}>
            <Card hoverable onClick={() => navigate(c.to)} style={{ cursor: 'pointer' }}>
              <Statistic
                title={c.label}
                value={stats?.[c.key] ?? '--'}
                prefix={<span style={{ color: c.color, marginRight: 6 }}>{c.icon}</span>}
                valueStyle={{ color: '#2B1D16', fontWeight: 600 }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* 快捷入口 */}
      <div style={{ marginTop: 24 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#6E161D', marginBottom: 12 }}>快捷入口</div>
        <Row gutter={[16, 16]}>
          {shortcuts.map((s) => (
            <Col xs={12} sm={6} key={s.label}>
              <Card hoverable onClick={() => navigate(s.to)} style={{ textAlign: 'center', cursor: 'pointer' }}>
                <div style={{ fontSize: 20, color: '#8C1F28' }}>{s.icon}</div>
                <div style={{ marginTop: 8, fontSize: 13 }}>{s.label}</div>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    </div>
  )
}
