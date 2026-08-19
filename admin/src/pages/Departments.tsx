// =============================================================================
// src/pages/Departments.tsx — 部门管理（自引用树）
// -----------------------------------------------------------------------------
// 功能：部门表格（名称/上级/启用/操作）+ 新增/编辑（选择上级，顶级为空）。
// 数据：GET/POST /api/admin/departments、PUT /{id}、DELETE。
// =============================================================================

import { useCallback, useEffect, useState } from 'react'
import { Button, Form, Input, Modal, Select, Table, message } from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

import { http } from '@/api/http'
import { adminApi } from '@tsgq/api-client'
import { BoolStatusTag } from '@/components/StatusTag'
import { ConfirmDanger } from '@/components/ConfirmDanger'

interface DeptRow { id: number; dept_name: string; parent_id: number | null; is_activate: boolean }

export default function Departments() {
  const [list, setList] = useState<DeptRow[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<DeptRow | null>(null)
  const [delTarget, setDelTarget] = useState<DeptRow | null>(null)
  const [form] = Form.useForm()

  const load = useCallback(() => {
    http.get(adminApi.departments).then((res: any) => setList(res.data)).catch((e: any) => message.error(e.message))
  }, [])
  useEffect(load, [load])

  const openModal = (row?: DeptRow) => {
    setEditing(row ?? null)
    row ? form.setFieldsValue(row) : form.resetFields()
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    try {
      if (editing) {
        await http.put(`${adminApi.departments}/${editing.id}`, values)
        message.success('部门已更新')
      } else {
        await http.post(adminApi.departments, values)
        message.success('部门创建成功')
      }
      setModalOpen(false)
      load()
    } catch (e: any) { message.error(e.message) }
  }

  const handleDelete = async () => {
    if (!delTarget) return
    try {
      await http.delete(`${adminApi.departments}/${delTarget.id}`)
      message.success('部门已删除')
      setDelTarget(null)
      load()
    } catch (e: any) { message.error(e.message) }
  }

  const parentName = (id: number | null) => (id == null ? '—' : list.find((d) => d.id === id)?.dept_name ?? `#${id}`)

  const columns: ColumnsType<DeptRow> = [
    { title: '部门名称', dataIndex: 'dept_name', render: (v) => <b style={{ color: '#6E161D' }}>{v}</b> },
    { title: '上级部门', dataIndex: 'parent_id', render: parentName },
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
      <div className="admin-page-title">部门管理</div>
      <div style={{ marginBottom: 14 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>新增部门</Button>
      </div>
      <Table rowKey="id" columns={columns} dataSource={list} pagination={false} />

      <Modal title={editing ? '编辑部门' : '新增部门'} open={modalOpen} onOk={handleSubmit} onCancel={() => setModalOpen(false)} okText="保存" cancelText="取消" destroyOnHidden>
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item name="dept_name" label="部门名称" rules={[{ required: true, message: '请输入部门名称' }]}>
            <Input placeholder="如 宫阙总部" />
          </Form.Item>
          <Form.Item name="parent_id" label="上级部门（选填，留空为顶级）">
            <Select allowClear placeholder="选择上级部门" options={list.filter((d) => d.id !== editing?.id).map((d) => ({ value: d.id, label: d.dept_name }))} />
          </Form.Item>
        </Form>
      </Modal>

      <ConfirmDanger open={!!delTarget} title="删除部门" content={`确定删除「${delTarget?.dept_name}」吗？其下有子部门或管理员时将无法删除。`} onOk={handleDelete} onCancel={() => setDelTarget(null)} />
    </div>
  )
}
