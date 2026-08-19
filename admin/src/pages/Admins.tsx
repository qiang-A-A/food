// =============================================================================
// src/pages/Admins.tsx — 管理员管理（多超管 RBAC）
// -----------------------------------------------------------------------------
// 功能：管理员表格（用户名/姓名/角色/部门/状态/时间/编辑/禁用/删除）+
//       新增/编辑弹窗（含角色/部门下拉、密码重置）。禁止删除/禁用自己。
// 数据：GET/POST /api/admin/admins、PUT /{id}、PATCH status、DELETE。
// =============================================================================

import { useCallback, useEffect, useState } from 'react'
import { Button, Form, Input, Modal, Select, Space, Switch, Table, message } from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

import { http } from '@/api/http'
import { adminApi } from '@tsgq/api-client'
import { BoolStatusTag } from '@/components/StatusTag'
import { ConfirmDanger } from '@/components/ConfirmDanger'
import { useAdminAuthStore } from '@/store/auth'

interface AdminRow { id: number; username: string; name: string; role_id: number; dept_id: number | null; is_activate: boolean; created_at: string }

const PAGE_SIZE = 10

export default function Admins() {
  const myId = useAdminAuthStore((s) => s.admin?.id)
  const [list, setList] = useState<AdminRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [roles, setRoles] = useState<{ id: number; role_name: string }[]>([])
  const [depts, setDepts] = useState<{ id: number; dept_name: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AdminRow | null>(null)
  const [delTarget, setDelTarget] = useState<AdminRow | null>(null)
  const [form] = Form.useForm()

  // 加载角色/部门（表单下拉）
  useEffect(() => {
    http.get(adminApi.roles).then((res: any) => setRoles(res.data)).catch(() => {})
    http.get(adminApi.departments).then((res: any) => setDepts(res.data)).catch(() => {})
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    http.get(adminApi.admins, { params: { page, page_size: PAGE_SIZE } })
      .then((res: any) => { setList(res.data.items); setTotal(res.data.total) })
      .catch((e: any) => message.error(e.message))
      .finally(() => setLoading(false))
  }, [page])
  useEffect(load, [load])

  const openModal = (row?: AdminRow) => {
    setEditing(row ?? null)
    row ? form.setFieldsValue({ ...row, password: '' }) : form.resetFields()
    setModalOpen(true)
  }

  // 保存（新增/编辑；password 有值则重置密码）
  const handleSubmit = async () => {
    const values = await form.validateFields()
    try {
      if (editing) {
        await http.put(`${adminApi.admins}/${editing.id}`, values)
        message.success('管理员已更新')
      } else {
        await http.post(adminApi.admins, values)
        message.success('管理员创建成功')
      }
      setModalOpen(false)
      load()
    } catch (e: any) { message.error(e.message) }
  }

  // 禁用/启用（禁止禁用自己）
  const toggleActive = async (row: AdminRow, target: boolean) => {
    if (row.id === myId) { message.warning('不能禁用当前登录账号'); return }
    try {
      await http.patch(`${adminApi.admins}/${row.id}/status`, { is_activate: target })
      message.success(target ? '已启用' : '已禁用')
      load()
    } catch (e: any) { message.error(e.message) }
  }

  // 删除（禁止删除自己）
  const handleDelete = async () => {
    if (!delTarget) return
    if (delTarget.id === myId) { message.warning('不能删除当前登录账号'); setDelTarget(null); return }
    try {
      await http.delete(`${adminApi.admins}/${delTarget.id}`)
      message.success('管理员已删除')
      setDelTarget(null)
      load()
    } catch (e: any) { message.error(e.message) }
  }

  const roleName = (id: number) => roles.find((r) => r.id === id)?.role_name ?? `#${id}`
  const deptName = (id: number | null) => (id == null ? '—' : depts.find((d) => d.id === id)?.dept_name ?? `#${id}`)

  const columns: ColumnsType<AdminRow> = [
    { title: '用户名', dataIndex: 'username', width: 110, render: (v) => <b style={{ color: '#6E161D' }}>{v}{v === 'admin' ? '（超管）' : ''}</b> },
    { title: '姓名', dataIndex: 'name', width: 110 },
    { title: '角色', dataIndex: 'role_id', width: 110, render: roleName },
    { title: '部门', dataIndex: 'dept_id', width: 100, render: deptName },
    { title: '创建时间', dataIndex: 'created_at', width: 150, render: (v) => (v || '').slice(0, 16) },
    { title: '状态', dataIndex: 'is_activate', width: 80, render: (v) => <BoolStatusTag value={v} /> },
    {
      title: '操作', width: 160, fixed: 'right',
      render: (_, r) => (
        <Space>
          <Button size="small" type="link" icon={<EditOutlined />} onClick={() => openModal(r)}>编辑</Button>
          <Button size="small" type="link" danger onClick={() => toggleActive(r, !r.is_activate)}>{r.is_activate ? '禁用' : '启用'}</Button>
          <Button size="small" type="link" danger icon={<DeleteOutlined />} onClick={() => setDelTarget(r)}>删除</Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div className="admin-page-title">管理员管理</div>
      <div style={{ marginBottom: 14 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>新增管理员</Button>
      </div>
      <Table rowKey="id" loading={loading} columns={columns} dataSource={list}
        pagination={{ current: page, pageSize: PAGE_SIZE, total, onChange: setPage, showSizeChanger: false }}
      />

      <Modal title={editing ? `编辑管理员：${editing.username}` : '新增管理员'} open={modalOpen} onOk={handleSubmit} onCancel={() => setModalOpen(false)} okText="保存" cancelText="取消" width={560} destroyOnClose>
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
              <Input placeholder="登录账号" />
            </Form.Item>
            <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
              <Input placeholder="真实姓名" />
            </Form.Item>
            <Form.Item name="password" label={editing ? '重置密码（留空不修改）' : '密码'} rules={editing ? [] : [{ required: true, message: '请输入密码' }]}>
              <Input.Password placeholder={editing ? '留空则不修改' : '初始密码（6-20 位）'} />
            </Form.Item>
            <Form.Item name="phone" label="手机号">
              <Input placeholder="选填" maxLength={11} />
            </Form.Item>
            <Form.Item name="role_id" label="角色" rules={[{ required: true, message: '请选择角色' }]} initialValue={1}>
              <Select options={roles.map((r) => ({ value: r.id, label: r.role_name }))} />
            </Form.Item>
            <Form.Item name="dept_id" label="部门">
              <Select allowClear placeholder="选填" options={depts.map((d) => ({ value: d.id, label: d.dept_name }))} />
            </Form.Item>
            <Form.Item name="email" label="邮箱">
              <Input placeholder="选填" />
            </Form.Item>
            <Form.Item name="post" label="岗位">
              <Input placeholder="选填" />
            </Form.Item>
          </div>
          <Form.Item name="is_activate" label="启用" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <ConfirmDanger open={!!delTarget} title="删除管理员" content={`确定删除管理员「${delTarget?.username}」吗？`} onOk={handleDelete} onCancel={() => setDelTarget(null)} />
    </div>
  )
}
