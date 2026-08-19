// =============================================================================
// src/pages/Banners.tsx — 轮播图管理
// -----------------------------------------------------------------------------
// 功能：轮播图卡片网格（16:6 缩略图 + 标题/链接/排序 + 启停 + 删除）+
//       新增/编辑弹窗（图片上传 kind=image / 跳转链接 / 排序）。
// 数据：GET/POST /api/admin/banners、PUT /{id}、PATCH status、DELETE。
// =============================================================================

import { useCallback, useEffect, useState } from 'react'
import { Button, Form, Input, InputNumber, Modal, Switch, message } from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'

import { http } from '@/api/http'
import { adminApi } from '@tsgq/api-client'
import { ConfirmDanger } from '@/components/ConfirmDanger'

interface BannerRow { id: number; title: string | null; image: string; link_url: string | null; sort_order: number; is_activate: boolean }

export default function Banners() {
  const [list, setList] = useState<BannerRow[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<BannerRow | null>(null)
  const [delTarget, setDelTarget] = useState<BannerRow | null>(null)
  const [form] = Form.useForm()

  const load = useCallback(() => {
    http.get(adminApi.banners).then((res: any) => setList(res.data)).catch((e: any) => message.error(e.message))
  }, [])
  useEffect(load, [load])

  const openModal = (row?: BannerRow) => {
    setEditing(row ?? null)
    row ? form.setFieldsValue(row) : form.resetFields()
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    try {
      if (editing) {
        await http.put(`${adminApi.banners}/${editing.id}`, values)
        message.success('轮播图已更新')
      } else {
        await http.post(adminApi.banners, values)
        message.success('轮播图创建成功')
      }
      setModalOpen(false)
      load()
    } catch (e: any) { message.error(e.message) }
  }

  const toggleActive = async (row: BannerRow, checked: boolean) => {
    try {
      await http.patch(`${adminApi.banners}/${row.id}/status`, { is_activate: checked })
      message.success('状态已更新')
      load()
    } catch (e: any) { message.error(e.message) }
  }

  const handleDelete = async () => {
    if (!delTarget) return
    try {
      await http.delete(`${adminApi.banners}/${delTarget.id}`)
      message.success('轮播图已删除')
      setDelTarget(null)
      load()
    } catch (e: any) { message.error(e.message) }
  }

  return (
    <div>
      <div className="admin-page-title">轮播图管理</div>
      <div style={{ marginBottom: 14 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>上传轮播图</Button>
      </div>

      {/* 卡片网格（16:6 缩略图） */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
        {list.map((b) => (
          <div key={b.id} style={{ background: '#fff', border: '1px solid #E8E8E8', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ aspectRatio: '16/6', background: b.image.startsWith('svg:') ? 'linear-gradient(120deg,#A4252E,#5A1016)' : '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F6ECD7', fontSize: 12 }}>
              {b.image.startsWith('svg:') ? `轮播占位（${b.image}）` : <img src={b.image} alt={b.title ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
            <div style={{ padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <b style={{ color: '#6E161D', fontSize: 14 }}>{b.title || '（无标题）'}</b>
                <Switch size="small" checked={b.is_activate} onChange={(c) => toggleActive(b, c)} />
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: '#999' }}>
                链接：{b.link_url || '—'} · 排序：{b.sort_order}
              </div>
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <Button size="small" icon={<EditOutlined />} onClick={() => openModal(b)}>编辑</Button>
                <Button size="small" danger icon={<DeleteOutlined />} onClick={() => setDelTarget(b)}>删除</Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal title={editing ? '编辑轮播图' : '上传轮播图'} open={modalOpen} onOk={handleSubmit} onCancel={() => setModalOpen(false)} okText="保存" cancelText="取消" destroyOnHidden>
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item name="image" label="图片 URL" rules={[{ required: true, message: '请填写图片地址' }]} extra="通过上方上传获得 URL，或填 svg:hero-scene-N 占位">
            <Input placeholder="图片 URL" />
          </Form.Item>
          <Form.Item name="title" label="标题">
            <Input placeholder="如 中秋主视觉" />
          </Form.Item>
          <Form.Item name="link_url" label="跳转链接">
            <Input placeholder="如 /products（选填）" />
          </Form.Item>
          <Form.Item name="sort_order" label="排序（越小越前）" initialValue={0}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <ConfirmDanger open={!!delTarget} title="删除轮播图" content="确定删除该轮播图吗？" onOk={handleDelete} onCancel={() => setDelTarget(null)} />
    </div>
  )
}
