// =============================================================================
// src/pages/Intents.tsx — 团购意向管理（B-11）
// -----------------------------------------------------------------------------
// 功能：意向表格（提交用户手机号/昵称/公司/需求/数量/来源/状态/时间）+
//       详情弹窗 + 状态流转（待跟进→已联系→已成交/已关闭）+ 筛选搜索。
// 数据：GET /api/admin/intents、GET /{id}、PUT /{id}（状态流转）、DELETE。
// =============================================================================

import { useCallback, useEffect, useState } from 'react'
import { Button, Descriptions, Input, Modal, Select, Space, Table, message } from 'antd'
import { EyeOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

import { http } from '@/api/http'
import { adminApi } from '@tsgq/api-client'
import { IntentStatusTag } from '@/components/StatusTag'

interface IntentRow {
  id: number
  name: string
  phone: string
  company: string | null
  requirement: string | null
  quantity_range: string | null
  source: string
  status: string
  created_at: string
  user_phone: string | null
  user_nickname: string | null
}

// 来源文案映射
const SOURCE_TEXT: Record<string, string> = { contact: '联系我们', customize: '礼盒定制', product: '产品详情' }

const PAGE_SIZE = 10

export default function Intents() {
  const [list, setList] = useState<IntentRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState<IntentRow | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    const params: any = { page, page_size: PAGE_SIZE }
    if (keyword) params.keyword = keyword
    if (statusFilter) params.status = statusFilter
    http.get(adminApi.intents, { params })
      .then((res: any) => { setList(res.data.items); setTotal(res.data.total) })
      .catch((e: any) => message.error(e.message))
      .finally(() => setLoading(false))
  }, [page, keyword, statusFilter])
  useEffect(load, [load])

  // 查看详情
  const openDetail = async (row: IntentRow) => {
    try {
      const res: any = await http.get(`${adminApi.intents}/${row.id}`)
      setDetail(res.data)
      setDetailOpen(true)
    } catch (e: any) { message.error(e.message) }
  }

  // 状态流转（状态机：pending→contacted→deal/closed；pending→closed）
  const transition = async (row: IntentRow, status: string) => {
    try {
      await http.put(`${adminApi.intents}/${row.id}`, { status })
      message.success('状态已更新')
      setDetail(null)
      setDetailOpen(false)
      load()
    } catch (e: any) { message.error(e.message) }
  }

  const columns: ColumnsType<IntentRow> = [
    { title: '姓名', dataIndex: 'name', width: 80 },
    { title: '电话', dataIndex: 'phone', width: 120 },
    {
      title: '提交用户', width: 120,
      render: (_, r) => r.user_phone ? `${r.user_nickname ?? ''}(${r.user_phone})` : '—',
    },
    { title: '公司', dataIndex: 'company', ellipsis: true, render: (v) => v || '—' },
    { title: '需求', dataIndex: 'requirement', ellipsis: true, render: (v) => v || '—' },
    { title: '数量', dataIndex: 'quantity_range', width: 90, render: (v) => v || '—' },
    { title: '来源', dataIndex: 'source', width: 90, render: (v) => SOURCE_TEXT[v] ?? v },
    { title: '状态', dataIndex: 'status', width: 90, render: (v) => <IntentStatusTag status={v} /> },
    { title: '提交时间', dataIndex: 'created_at', width: 150, render: (v) => (v || '').slice(0, 16) },
    { title: '操作', width: 100, fixed: 'right', render: (_, r) => <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(r)}>详情</Button> },
  ]

  return (
    <div>
      <div className="admin-page-title">团购意向管理</div>
      {/* 顶部标注（PRD v2.1 已取消游客提交） */}
      <div style={{ marginBottom: 12, fontSize: 12, color: '#A8863F' }}>
        注：意向均由登录会员提交（游客提交已取消，PRD v2.1）
      </div>

      {/* 筛选与搜索 */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <Input.Search placeholder="搜索姓名 / 电话 / 公司" allowClear style={{ width: 240 }} onSearch={(v) => { setPage(1); setKeyword(v) }} />
        <Select
          placeholder="全部状态" allowClear style={{ width: 130 }}
          value={statusFilter}
          onChange={(v) => { setPage(1); setStatusFilter(v) }}
          options={[
            { value: 'pending', label: '待跟进' },
            { value: 'contacted', label: '已联系' },
            { value: 'deal', label: '已成交' },
            { value: 'closed', label: '已关闭' },
          ]}
        />
      </div>

      <Table rowKey="id" loading={loading} columns={columns} dataSource={list}
        pagination={{ current: page, pageSize: PAGE_SIZE, total, onChange: setPage, showSizeChanger: false }}
        scroll={{ x: 1100 }}
      />

      {/* 详情 + 状态流转弹窗 */}
      <Modal title="意向详情" open={detailOpen} onCancel={() => setDetailOpen(false)} footer={null} width={560}>
        {detail && (
          <>
            <Descriptions column={1} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="姓名">{detail.name}</Descriptions.Item>
              <Descriptions.Item label="电话">{detail.phone}</Descriptions.Item>
              <Descriptions.Item label="公司">{detail.company || '—'}</Descriptions.Item>
              <Descriptions.Item label="需求">{detail.requirement || '—'}</Descriptions.Item>
              <Descriptions.Item label="数量区间">{detail.quantity_range || '—'}</Descriptions.Item>
              <Descriptions.Item label="来源">{SOURCE_TEXT[detail.source] ?? detail.source}</Descriptions.Item>
              <Descriptions.Item label="当前状态"><IntentStatusTag status={detail.status} /></Descriptions.Item>
              <Descriptions.Item label="提交用户">{detail.user_phone ? `${detail.user_nickname ?? ''} (${detail.user_phone})` : '—'}</Descriptions.Item>
              <Descriptions.Item label="提交时间">{(detail.created_at || '').slice(0, 16)}</Descriptions.Item>
            </Descriptions>

            {/* 状态流转按钮（按状态机开放可选项） */}
            <div style={{ fontSize: 13, color: '#333', marginBottom: 8 }}>状态流转：</div>
            <Space>
              {detail.status === 'pending' && (
                <>
                  <Button type="primary" onClick={() => transition(detail, 'contacted')}>标记已联系</Button>
                  <Button onClick={() => transition(detail, 'closed')}>直接关闭</Button>
                </>
              )}
              {detail.status === 'contacted' && (
                <>
                  <Button type="primary" style={{ background: '#52C41A', borderColor: '#52C41A' }} onClick={() => transition(detail, 'deal')}>标记已成交</Button>
                  <Button danger onClick={() => transition(detail, 'closed')}>标记已关闭</Button>
                </>
              )}
              {(detail.status === 'deal' || detail.status === 'closed') && (
                <span style={{ color: '#999', fontSize: 13 }}>已结束（不可再流转）</span>
              )}
            </Space>
          </>
        )}
      </Modal>
    </div>
  )
}
