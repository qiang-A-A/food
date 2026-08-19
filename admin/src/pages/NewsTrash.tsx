// =============================================================================
// src/pages/NewsTrash.tsx — 新闻回收站
// -----------------------------------------------------------------------------
// 功能：已删除新闻列表 → 恢复 / 彻底清空（二次确认）。
// 数据：GET /api/admin/news/trash、POST /{id}/restore、DELETE /trash。
// =============================================================================

import { useCallback, useEffect, useState } from 'react'
import { Button, Table, message } from 'antd'
import { DeleteOutlined, RollbackOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

import { http } from '@/api/http'
import { adminApi } from '@tsgq/api-client'
import { ConfirmDanger } from '@/components/ConfirmDanger'

interface TrashRow { id: number; title: string; publish_date: string }

export default function NewsTrash() {
  const [list, setList] = useState<TrashRow[]>([])
  const [total, setTotal] = useState(0) // 审计修复：此前写死 page_size=20 且无分页，
                                        // 超过 20 条时其余数据不可达
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    http.get(`${adminApi.news}/trash`, { params: { page, page_size: 10 } })
      .then((res: any) => { setList(res.data.items); setTotal(res.data.total) })
      .catch((e: any) => message.error(e.message))
      .finally(() => setLoading(false))
  }, [page])
  useEffect(load, [load])

  const restore = async (id: number) => {
    try {
      await http.post(`${adminApi.news}/${id}/restore`)
      message.success('新闻已恢复')
      load()
    } catch (e: any) { message.error(e.message) }
  }

  const clearTrash = async () => {
    try {
      await http.delete(`${adminApi.news}/trash`)
      message.success('回收站已清空')
      setClearOpen(false)
      load()
    } catch (e: any) { message.error(e.message) }
  }

  const columns: ColumnsType<TrashRow> = [
    { title: '标题', dataIndex: 'title' },
    { title: '发布日期', dataIndex: 'publish_date', width: 160, render: (v) => (v || '').slice(0, 16) },
    {
      title: '操作', width: 120,
      render: (_, r) => <Button size="small" icon={<RollbackOutlined />} onClick={() => restore(r.id)}>恢复</Button>,
    },
  ]

  return (
    <div>
      <div className="admin-page-title">新闻回收站</div>
      <div style={{ marginBottom: 12 }}>
        <Button danger icon={<DeleteOutlined />} onClick={() => setClearOpen(true)}>彻底清空回收站</Button>
      </div>
      <Table rowKey="id" loading={loading} columns={columns} dataSource={list}
        pagination={{ current: page, pageSize: 10, total, onChange: setPage, showSizeChanger: false }}
      />
      <ConfirmDanger open={clearOpen} title="彻底清空回收站" content="将物理删除回收站中全部新闻，此操作不可撤销！" confirmText="确认清空" onOk={clearTrash} onCancel={() => setClearOpen(false)} />
    </div>
  )
}
