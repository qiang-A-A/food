// =============================================================================
// src/pages/Categories.tsx — 系列（品类）列表
// -----------------------------------------------------------------------------
// 功能：品类增删改查（UI/UX §5.4 系列列表）——名称/Slug/封面/排序/启用/
//       产品数；删除前校验（其下有产品返回 409 提示）。
// 数据：GET/POST/PUT/DELETE /api/admin/categories。
// =============================================================================

import { useCallback, useEffect, useState } from 'react'
import { Button, Form, Input, InputNumber, Modal, Space, Switch, Table, message } from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

import { http } from '@/api/http'
import { adminApi } from '@tsgq/api-client'
import { ConfirmDanger } from '@/components/ConfirmDanger'

interface CatRow { id: number; name: string; slug: string; cover_image: string | null; sort_order: number; is_activate: boolean; product_count: number }

export default function Categories() {
  const [list, setList] = useState<CatRow[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CatRow | null>(null)
  const [delTarget, setDelTarget] = useState<CatRow | null>(null)
  const [form] = Form.useForm()

  const load = useCallback(() => {
    setLoading(true)
    http.get(adminApi.categories).then((res: any) => setList(res.data)).catch((e: any) => message.error(e.message)).finally(() => setLoading(false))
  }, [])
  useEffect(load, [load])

  // 打开新增/编辑
  const openModal = (row?: CatRow) => {
    setEditing(row ?? null)
    row ? form.setFieldsValue(row) : form.resetFields()
    setModalOpen(true)
  }

  // 保存
  const handleSubmit = async () => {
    const values = await form.validateFields()
    try {
      if (editing) {
        await http.put(`${adminApi.categories}/${editing.id}`, values)
        message.success('系列已更新')
      } else {
        await http.post(adminApi.categories, values)
        message.success('系列创建成功')
      }
      setModalOpen(false)
      load()
    } catch (e: any) { message.error(e.message) }
  }

  // 切换启用
  const toggleActive = async (row: CatRow, checked: boolean) => {
    try {
      await http.put(`${adminApi.categories}/${row.id}`, { ...row, is_activate: checked })
      message.success('状态已更新')
      load()
    } catch (e: any) { message.error(e.message) }
  }

  // 删除
  const handleDelete = async () => {
    if (!delTarget) return
    try {
      await http.delete(`${adminApi.categories}/${delTarget.id}`)
      message.success('系列已删除')
      setDelTarget(null)
      load()
    } catch (e: any) { message.error(e.message) }
  }

  const columns: ColumnsType<CatRow> = [
    { title: '排序', dataIndex: 'sort_order', width: 60 },
    { title: '系列名称', dataIndex: 'name', width: 140, render: (v) => <b style={{ color: '#6E161D' }}>{v}</b> },
    { title: 'Slug', dataIndex: 'slug', width: 120, render: (v) => <code>{v}</code> },
    { title: '产品数', dataIndex: 'product_count', width: 80 },
    { title: '启用', dataIndex: 'is_activate', width: 80, render: (v, r) => <Switch size="small" checked={v} onChange={(c) => toggleActive(r, c)} /> },
    {
      title: '操作', width: 130,
      render: (_, r) => (
        <Space>
          <Button size="small" type="link" icon={<EditOutlined />} onClick={() => openModal(r)}>编辑</Button>
          <Button size="small" type="link" danger icon={<DeleteOutlined />} onClick={() => setDelTarget(r)}>删除</Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div className="admin-page-title">系列列表</div>
      <div style={{ marginBottom: 14 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>新增系列</Button>
      </div>
      <Table rowKey="id" loading={loading} columns={columns} dataSource={list} pagination={false} />

      <Modal title={editing ? `编辑系列：${editing.name}` : '新增系列'} open={modalOpen} onOk={handleSubmit} onCancel={() => setModalOpen(false)} okText="保存" cancelText="取消" destroyOnHidden>
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item name="name" label="系列名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="如 御点珍馐" />
          </Form.Item>
          <Form.Item name="slug" label="Slug（URL 标识）" rules={[{ required: true, message: '请输入 slug' }, { pattern: /^[a-z0-9-]+$/, message: '仅小写字母/数字/连字符' }]}>
            <Input placeholder="如 yudian" />
          </Form.Item>
          <Form.Item name="sort_order" label="排序（越小越前）" initialValue={0}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          {/* 审计修复：补封面字段——此前表单无 cover_image，编辑时后端全量
              更新会将其重置为空（编辑一次系列封面丢失），且无入口设置封面 */}
          <Form.Item name="cover_image" label="封面图 URL">
            <Input placeholder="通过上传获得 URL，或填 svg:cat-xxx 占位（选填）" />
          </Form.Item>
          <Form.Item name="is_activate" label="启用" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <ConfirmDanger
        open={!!delTarget}
        title="删除系列"
        content={`确定删除「${delTarget?.name}」吗？其下有产品时将无法删除。`}
        onOk={handleDelete}
        onCancel={() => setDelTarget(null)}
      />
    </div>
  )
}
