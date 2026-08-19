// =============================================================================
// src/pages/ProductsTrash.tsx — 产品回收站
// -----------------------------------------------------------------------------
// 功能：已删除产品列表 → 恢复 / 彻底删除 / 一键清空（危险操作二次确认）。
// 数据：GET /api/admin/products/trash、POST /{id}/restore、DELETE /trash。
// =============================================================================

import { useCallback, useEffect, useState } from 'react'
import { Button, Table, message } from 'antd'
import { DeleteOutlined, RollbackOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

import { http } from '@/api/http'
import { adminApi } from '@tsgq/api-client'
import { ConfirmDanger } from '@/components/ConfirmDanger'

interface TrashRow { id: number; name: string; product_no: string; series: string | null; created_at: string }

export default function ProductsTrash() {
  const [list, setList] = useState<TrashRow[]>([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    http.get(`${adminApi.products}/trash`, { params: { page, page_size: 10 } })
      .then((res: any) => setList(res.data.items))
      .catch((e: any) => message.error(e.message))
      .finally(() => setLoading(false))
  }, [page])

  useEffect(load, [load])

  // 恢复
  const restore = async (id: number) => {
    try {
      await http.post(`${adminApi.products}/${id}/restore`)
      message.success('产品已恢复')
      load()
    } catch (e: any) { message.error(e.message) }
  }

  // 彻底清空（危险：物理删除）
  const clearTrash = async () => {
    try {
      await http.delete(`${adminApi.products}/trash`)
      message.success('回收站已清空')
      setClearOpen(false)
      load()
    } catch (e: any) { message.error(e.message) }
  }

  const columns: ColumnsType<TrashRow> = [
    { title: '产品编号', dataIndex: 'product_no', width: 140 },
    { title: '名称', dataIndex: 'name' },
    { title: '系列', dataIndex: 'series', width: 100, render: (v) => v || '—' },
    { title: '删除时间', dataIndex: 'created_at', width: 160, render: (v) => (v || '').slice(0, 16) },
    {
      title: '操作', width: 140,
      render: (_, r) => (
        <Button size="small" icon={<RollbackOutlined />} onClick={() => restore(r.id)}>恢复</Button>
      ),
    },
  ]

  return (
    <div>
      <div className="admin-page-title">产品回收站</div>
      <div style={{ marginBottom: 12 }}>
        <Button danger icon={<DeleteOutlined />} onClick={() => setClearOpen(true)}>彻底清空回收站</Button>
        <span style={{ marginLeft: 10, fontSize: 12, color: '#999' }}>清空后不可恢复，操作前请确认</span>
      </div>
      <Table rowKey="id" loading={loading} columns={columns} dataSource={list}
        pagination={{ current: page, pageSize: 10, onChange: setPage, showSizeChanger: false }}
      />
      <ConfirmDanger
        open={clearOpen}
        title="彻底清空回收站"
        content="将物理删除回收站中全部产品，此操作不可撤销！"
        confirmText="确认清空"
        onOk={clearTrash}
        onCancel={() => setClearOpen(false)}
      />
    </div>
  )
}
