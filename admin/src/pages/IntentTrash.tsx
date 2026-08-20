// =============================================================================
// src/pages/IntentTrash.tsx — 意向回收站（B-11 扩展）
// -----------------------------------------------------------------------------
// 功能：用户/管理员删除的意向（status=deleted）存放处——列表（含来源产品/
//       提交用户/删除原因说明）+ 恢复（→待跟进，详情字段保持）+ 永久删除。
// 数据：GET /api/admin/intents/trash、POST /{id}/restore、DELETE /{id}/permanent。
// =============================================================================

import { useCallback, useEffect, useState } from 'react'
import { Button, Input, Popconfirm, Table, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'

import { http } from '@/api/http'
import { adminApi } from '@tsgq/api-client'
import { IntentStatusTag } from '@/components/StatusTag'

interface TrashRow {
  id: number
  name: string
  phone: string
  company: string | null
  requirement: string | null
  quantity_range: string | null
  source: string
  product_name: string | null
  status: string
  created_at: string
  user_phone: string | null
  user_nickname: string | null
}

const PAGE_SIZE = 10

export default function IntentTrash() {
  const [list, setList] = useState<TrashRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    const params: any = { page, page_size: PAGE_SIZE }
    if (keyword) params.keyword = keyword
    http.get(adminApi.intentTrash, { params })
      .then((res: any) => { setList(res.data.items); setTotal(res.data.total) })
      .catch((e: any) => message.error(e.message))
      .finally(() => setLoading(false))
  }, [page, keyword])
  useEffect(load, [load])

  // 恢复：出回收站 → 待跟进（详情字段保持）
  const restore = async (id: number) => {
    try {
      await http.post(adminApi.intentRestore(id))
      message.success('意向已恢复，状态为待跟进')
      load()
    } catch (e: any) { message.error(e.message) }
  }

  // 永久删除（物理删除，不可恢复）
  const permanentDelete = async (id: number) => {
    try {
      await http.delete(adminApi.intentPermanent(id))
      message.success('已永久删除')
      load()
    } catch (e: any) { message.error(e.message) }
  }

  const columns: ColumnsType<TrashRow> = [
    { title: '姓名', dataIndex: 'name', width: 80 },
    { title: '电话', dataIndex: 'phone', width: 120 },
    {
      title: '提交用户', width: 130,
      render: (_, r) => r.user_phone ? `${r.user_nickname ?? ''}(${r.user_phone})` : '—',
    },
    { title: '公司', dataIndex: 'company', ellipsis: true, render: (v) => v || '—' },
    { title: '需求', dataIndex: 'requirement', ellipsis: true, render: (v) => v || '—' },
    {
      title: '来源', width: 140,
      render: (_, r) => r.source === 'product' && r.product_name ? `产品详情（${r.product_name}）` : ({ contact: '联系我们', customize: '礼盒定制', product: '产品详情' } as Record<string, string>)[r.source] ?? r.source,
    },
    { title: '状态', dataIndex: 'status', width: 90, render: (v) => <IntentStatusTag status={v} /> },
    { title: '提交时间', dataIndex: 'created_at', width: 150, render: (v) => (v || '').slice(0, 16) },
    {
      title: '操作', width: 150, fixed: 'right',
      render: (_, r) => (
        <>
          <Button size="small" type="primary" style={{ marginRight: 8 }} onClick={() => restore(r.id)}>恢复</Button>
          <Popconfirm title="永久删除后不可恢复，确定？" onConfirm={() => permanentDelete(r.id)} okText="永久删除" cancelText="取消" okButtonProps={{ danger: true }}>
            <Button size="small" danger>永久删除</Button>
          </Popconfirm>
        </>
      ),
    },
  ]

  return (
    <div>
      <div className="admin-page-title">意向回收站</div>
      <div style={{ marginBottom: 12, fontSize: 12, color: '#A8863F' }}>
        注：用户撤销后删除或管理员删除的意向存放于此（状态显示已删除）；恢复后状态回到「待跟进」，详情数据保持不变
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <Input.Search placeholder="搜索姓名 / 电话 / 公司" allowClear style={{ width: 240 }} onSearch={(v) => { setPage(1); setKeyword(v) }} />
      </div>

      <Table rowKey="id" loading={loading} columns={columns} dataSource={list}
        pagination={{ current: page, pageSize: PAGE_SIZE, total, onChange: setPage, showSizeChanger: false }}
        scroll={{ x: 1100 }}
      />
    </div>
  )
}
