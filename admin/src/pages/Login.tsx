// =============================================================================
// src/pages/Login.tsx — 超管登录页
// -----------------------------------------------------------------------------
// 功能：后台登录（UI/UX §4.4.10 超管登录卡）——用户名+密码 → POST /api/auth/login
//       → 写入登录态 → 跳转后台仪表盘；含「返回用户登录」链接。
// =============================================================================

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Form, Input, message } from 'antd'
import { LockOutlined, UserOutlined } from '@ant-design/icons'

import { http } from '@/api/http'
import { authApi } from '@tsgq/api-client'
import { useAdminAuthStore } from '@/store/auth'

// 前台用户登录地址（开发 5173 / 生产同域 /login）
const USER_LOGIN_URL =
  window.location.port === '5174'
    ? `${window.location.protocol}//${window.location.hostname}:5173/login`
    : '/login'

export default function Login() {
  const navigate = useNavigate()
  const setLogin = useAdminAuthStore((s) => s.setLogin)
  const [loading, setLoading] = useState(false)

  // 提交超管登录
  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true)
    try {
      const res: any = await http.post(authApi.login, values)
      // 写入登录态并跳转仪表盘
      setLogin(res.data.token, {
        id: res.data.admin.id,
        username: res.data.admin.username,
        name: res.data.admin.name,
        role_id: res.data.admin.role_id,
        dept_id: res.data.admin.dept_id,
      })
      message.success('登录成功，欢迎回来')
      navigate('/admin', { replace: true })
    } catch (e: any) {
      message.error(e.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F5F5' }}>
      <Card style={{ width: 380, boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
        {/* 品牌区：Logo + 后台名（品牌点缀：深红 + 金边） */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#6E161D', letterSpacing: 3 }}>
            天上宫阙 · 后台管理
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: '#A8863F' }}>TIANSHANGGONGQUE ADMIN</div>
        </div>

        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item name="username" label="管理员账号" rules={[{ required: true, message: '请输入管理员账号' }]}>
            <Input prefix={<UserOutlined />} placeholder="请输入用户名" size="large" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="请输入密码" size="large" />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            size="large"
            loading={loading}
            style={{ background: '#8C1F28', borderColor: '#8C1F28' }}
          >
            进入后台
          </Button>
        </Form>

        {/* 返回用户登录（角落低调入口） */}
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <a href={USER_LOGIN_URL} style={{ fontSize: 12, color: '#999' }}>← 返回用户登录</a>
        </div>
      </Card>
    </div>
  )
}
