// =============================================================================
// src/pages/Roles.tsx — 角色管理
// -----------------------------------------------------------------------------
// 功能：角色列表（名称/启用/操作）+ 新增/编辑；删除前校验（被引用 409）。
// 数据：GET/POST /api/admin/roles、PUT /{id}、DELETE。
// =============================================================================

import { useCallback, useEffect, useState } from 'react'
import { Button, Form, Input, Modal, Table, message } from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

import { http } from '@/api/http'
import { adminApi } from '@tsgq/api-client'
import { BoolStatusTag } from '@/components/StatusTag'
import { ConfirmDanger } from '@/components/ConfirmDanger'

interface RoleRow { id: number; role_name: string; is_activate: boolean }

export default function Roles() {
  const [list, setList] = useState<RoleRow[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<RoleRow | null>(null)
  const [delTarget, setDelTarget] = useState<RoleRow | null>(null)
  const [form] = Form.useForm()

  const load = useCallback(() => {
    http.get(adminApi.roles).then((res: any) => setList(res.data)).catch((e: any) => message.error(e.message))
  }, [])
  useEffect(load, [load])

  const openModal = (row?: RoleRow) => {
    setEditing(row ?? null)
    row ? form.setFieldsValue(row) : form.resetFields()
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    try {
      if (editing) {
        await http.put(`${adminApi.roles}/${editing.id}`, values)
        message.success('角色已更新')
      } else {
        await http.post(adminApi.roles, values)
        message.success('角色创建成功')
      }
      setModalOpen(false)
      load()
    } catch (e: any) { message.error(e.message) }
  }

  const handleDelete = async () => {
    if (!delTarget) return
    try {
      await http.delete(`${adminApi.roles}/${delTarget.id}`)
      message.success('角色已删除')
      setDelTarget(null)
      load()
    } catch (e: any) { message.error(e.message) }
  }

  const columns: ColumnsType<RoleRow> = [
    { title: '角色名称', dataIndex: 'role_name', render: (v) => <b style={{ color: '#6E161D' }}>{v}</b> },
    { title: '启用', dataIndex: 'is_activate', width: 80, render: (v) => <BoolStatusTag value={v} /> },
    {
      title: '操作', width: 130,
      render: (_, r) => (
        <>
          <Button size="small" type="link" icon={<EditOutlined />} onClick={() => openModal(r)}>编辑</Button>
          <Button size="small" type="link" danger icon={<DeleteOutlined />} onClick={() => setDelTarget(r)}>删除</Button>
        </>
      ),
    },
  ]

  return (
    <div>
      <div className="admin-page-title">角色管理</div>
      <div style={{ marginBottom: 14 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>新增角色</Button>
      </div>
      <Table rowKey="id" columns={columns} dataSource={list} pagination={false} />

      <Modal title={editing ? '编辑角色' : '新增角色'} open={modalOpen} onOk={handleSubmit} onCancel={() => setModalOpen(false)} okText="保存" cancelText="取消" destroyOnHidden>
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item name="role_name" label="角色名称" rules={[{ required: true, message: '请输入角色名称' }]}>
            <Input placeholder="如 运营编辑" />
          </Form.Item>
        </Form>
      </Modal>

      <ConfirmDanger open={!!delTarget} title="删除角色" content={`确定删除「${delTarget?.role_name}」吗？仍被管理员引用时将无法删除。`} onOk={handleDelete} onCancel={() => setDelTarget(null)} />
    </div>
  )
}
