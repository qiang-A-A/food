// =============================================================================
// src/pages/News.tsx — 新闻管理
// -----------------------------------------------------------------------------
// 功能：新闻列表（搜索/置顶 Tag/上架 Switch/编辑/删除/新增）——编辑弹窗含
//       TipTap 富文本编辑器（图片+视频嵌入，仅超管可插入视频）。
// 数据：GET/POST /api/admin/news、PUT /{id}、PATCH status、DELETE。
// =============================================================================

import { useCallback, useEffect, useState } from 'react'
import { Button, DatePicker, Form, Input, Modal, Space, Switch, Table, message } from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

import { http } from '@/api/http'
import { adminApi } from '@tsgq/api-client'
import { ConfirmDanger } from '@/components/ConfirmDanger'
import { TopTag } from '@/components/StatusTag'
import { RichTextEditor } from '@/components/RichTextEditor'

interface NewsRow { id: number; title: string; summary: string | null; cover_image: string | null; is_top: boolean; is_activate: boolean; publish_date: string }

const PAGE_SIZE = 10

export default function News() {
  const [list, setList] = useState<NewsRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<NewsRow | null>(null)
  const [delTarget, setDelTarget] = useState<NewsRow | null>(null)
  const [form] = Form.useForm()

  const load = useCallback(() => {
    setLoading(true)
    const params: any = { page, page_size: PAGE_SIZE }
    if (keyword) params.keyword = keyword
    http.get(adminApi.news, { params })
      .then((res: any) => { setList(res.data.items); setTotal(res.data.total) })
      .catch((e: any) => message.error(e.message))
      .finally(() => setLoading(false))
  }, [page, keyword])
  useEffect(load, [load])

  // 打开新增/编辑（编辑时拉详情回填富文本）
  const openModal = (row?: NewsRow) => {
    setEditing(row ?? null)
    if (row) {
      http.get(`${adminApi.news}/${row.id}`).then((res: any) => {
        form.setFieldsValue({ ...res.data, publish_date: res.data.publish_date ? dayjs(res.data.publish_date) : undefined })
      }).catch(() => {})
    } else {
      form.resetFields()
    }
    setModalOpen(true)
  }

  // 保存
  const handleSubmit = async () => {
    const values = await form.validateFields()
    const payload = { ...values, publish_date: values.publish_date ? values.publish_date.format('YYYY-MM-DD HH:mm:ss') : undefined }
    try {
      if (editing) {
        await http.put(`${adminApi.news}/${editing.id}`, payload)
        message.success('新闻已更新')
      } else {
        await http.post(adminApi.news, payload)
        message.success('新闻创建成功')
      }
      setModalOpen(false)
      load()
    } catch (e: any) { message.error(e.message) }
  }

  // 上架/下架
  const toggleActive = async (row: NewsRow, checked: boolean) => {
    try {
      await http.patch(`${adminApi.news}/${row.id}/status`, { is_activate: checked })
      message.success('状态已更新')
      load()
    } catch (e: any) { message.error(e.message) }
  }

  // 删除
  const handleDelete = async () => {
    if (!delTarget) return
    try {
      await http.delete(`${adminApi.news}/${delTarget.id}`)
      message.success('已移入回收站')
      setDelTarget(null)
      load()
    } catch (e: any) { message.error(e.message) }
  }

  const columns: ColumnsType<NewsRow> = [
    { title: '标题', dataIndex: 'title', render: (v, r) => (<Space>{r.is_top && <TopTag top />}{v}</Space>) },
    { title: '摘要', dataIndex: 'summary', ellipsis: true, render: (v) => v || '—' },
    { title: '发布日期', dataIndex: 'publish_date', width: 150, render: (v) => (v || '').slice(0, 16) },
    { title: '上架', dataIndex: 'is_activate', width: 80, render: (v, r) => <Switch size="small" checked={v} onChange={(c) => toggleActive(r, c)} /> },
    {
      title: '操作', width: 130, fixed: 'right',
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
      <div className="admin-page-title">新闻列表</div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <Input.Search placeholder="搜索标题" allowClear style={{ width: 240 }} onSearch={(v) => { setPage(1); setKeyword(v) }} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>新增新闻</Button>
      </div>

      <Table rowKey="id" loading={loading} columns={columns} dataSource={list}
        pagination={{ current: page, pageSize: PAGE_SIZE, total, onChange: setPage, showSizeChanger: false }}
      />

      {/* 新增/编辑弹窗（含富文本 + 视频） */}
      <Modal title={editing ? `编辑新闻：${editing.title}` : '新增新闻'} open={modalOpen} onOk={handleSubmit} onCancel={() => setModalOpen(false)} width={820} okText="保存" cancelText="取消" destroyOnHidden>
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="新闻标题" />
          </Form.Item>
          <Form.Item name="summary" label="摘要">
            <Input.TextArea rows={2} placeholder="列表页展示的摘要（选填）" maxLength={300} />
          </Form.Item>
          {/* 审计修复：补封面字段——此前表单无 cover_image，编辑时后端
              全量更新会将其重置为空（编辑一次新闻封面丢失），且无任何入口
              设置封面。列表页/首页新闻卡展示依赖该字段。 */}
          <Form.Item name="cover_image" label="封面图 URL">
            <Input placeholder="通过上传获得 URL，或填 svg:news 占位（选填）" />
          </Form.Item>
          <Form.Item name="publish_date" label="发布日期">
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <div style={{ display: 'flex', gap: 40 }}>
            <Form.Item name="is_top" label="置顶" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="is_activate" label="上架" valuePropName="checked" initialValue={true}>
              <Switch />
            </Form.Item>
          </div>
          <Form.Item name="content" label="正文（富文本，支持图片与视频嵌入）" valuePropName="value" getValueFromEvent={(html) => html}>
            <RichTextEditor placeholder="输入新闻正文，可插入图片与视频…" />
          </Form.Item>
        </Form>
      </Modal>

      <ConfirmDanger open={!!delTarget} title="删除新闻" content={`确定将「${delTarget?.title}」移入回收站吗？`} onOk={handleDelete} onCancel={() => setDelTarget(null)} />
    </div>
  )
}
