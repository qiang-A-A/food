// =============================================================================
// src/pages/Users.tsx — 用户管理（注册会员）
// -----------------------------------------------------------------------------
// 功能：用户表格（ID/手机号/昵称/注册时间/状态/详情/禁用/删除）。
// 数据：GET /api/admin/users、PATCH /{id}/status、DELETE、GET /{id}。
// =============================================================================

import { useCallback, useEffect, useState } from 'react'
import { Button, Descriptions, Input, Modal, Space, Table, message } from 'antd'
import { EyeOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

import { http } from '@/api/http'
import { adminApi } from '@tsgq/api-client'
import { BoolStatusTag } from '@/components/StatusTag'
import { ConfirmDanger } from '@/components/ConfirmDanger'

interface UserRow { id: number; phone: string; nickname: string | null; avatar: string | null; is_activate: boolean; created_at: string }

const PAGE_SIZE = 10

export default function Users() {
  const [list, setList] = useState<UserRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState<UserRow | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [disableTarget, setDisableTarget] = useState<UserRow | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    const params: any = { page, page_size: PAGE_SIZE }
    if (keyword) params.keyword = keyword
    http.get(adminApi.users, { params })
      .then((res: any) => { setList(res.data.items); setTotal(res.data.total) })
      .catch((e: any) => message.error(e.message))
      .finally(() => setLoading(false))
  }, [page, keyword])
  useEffect(load, [load])

  const openDetail = (row: UserRow) => { setDetail(row); setDetailOpen(true) }

  // 禁用/启用
  const toggleActive = async (row: UserRow, target: boolean) => {
    try {
      await http.patch(`${adminApi.users}/${row.id}/status`, { is_activate: target })
      message.success(target ? '已启用' : '已禁用')
      setDisableTarget(null)
      load()
    } catch (e: any) { message.error(e.message) }
  }

  const columns: ColumnsType<UserRow> = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '手机号', dataIndex: 'phone', width: 130 },
    { title: '昵称', dataIndex: 'nickname', render: (v) => v || '—' },
    { title: '注册时间', dataIndex: 'created_at', width: 160, render: (v) => (v || '').slice(0, 16) },
    { title: '状态', dataIndex: 'is_activate', width: 80, render: (v) => <BoolStatusTag value={v} /> },
    {
      title: '操作', width: 160, fixed: 'right',
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(r)}>详情</Button>
          <Button size="small" danger onClick={() => setDisableTarget(r)}>{r.is_activate ? '禁用' : '启用'}</Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div className="admin-page-title">用户管理</div>
      <div style={{ marginBottom: 14 }}>
        <Input.Search placeholder="搜索手机号 / 昵称" allowClear style={{ width: 240 }} onSearch={(v) => { setPage(1); setKeyword(v) }} />
      </div>
      <Table rowKey="id" loading={loading} columns={columns} dataSource={list}
        pagination={{ current: page, pageSize: PAGE_SIZE, total, onChange: setPage, showSizeChanger: false }}
      />

      <Modal title="用户详情" open={detailOpen} onCancel={() => setDetailOpen(false)} footer={null}>
        {detail && (
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="ID">{detail.id}</Descriptions.Item>
            <Descriptions.Item label="手机号">{detail.phone}</Descriptions.Item>
            <Descriptions.Item label="昵称">{detail.nickname || '—'}</Descriptions.Item>
            <Descriptions.Item label="头像">{detail.avatar || '默认头像'}</Descriptions.Item>
            <Descriptions.Item label="状态"><BoolStatusTag value={detail.is_activate} /></Descriptions.Item>
            <Descriptions.Item label="注册时间">{(detail.created_at || '').slice(0, 16)}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      <ConfirmDanger
        open={!!disableTarget}
        title={disableTarget?.is_activate ? '禁用用户' : '启用用户'}
        content={`确定${disableTarget?.is_activate ? '禁用' : '启用'}用户「${disableTarget?.nickname ?? disableTarget?.phone}」吗？禁用后该用户无法登录。`}
        confirmText={disableTarget?.is_activate ? '确认禁用' : '确认启用'}
        onOk={() => disableTarget && toggleActive(disableTarget, !disableTarget.is_activate)}
        onCancel={() => setDisableTarget(null)}
      />
    </div>
  )
}
