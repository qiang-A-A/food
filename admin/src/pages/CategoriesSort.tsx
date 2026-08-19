// =============================================================================
// src/pages/CategoriesSort.tsx — 系列排序
// -----------------------------------------------------------------------------
// 功能：品类排序页（UI/UX §5.4 系列排序）——序号 + 上移/下移 + 保存排序
//       （批量 PUT /api/admin/categories/sort，body {orders:[{id,sort_order}]}）。
// =============================================================================

import { useCallback, useEffect, useState } from 'react'
import { Button, Space, Table, message } from 'antd'
import { ArrowDownOutlined, ArrowUpOutlined, SaveOutlined } from '@ant-design/icons'

import { http } from '@/api/http'
import { adminApi } from '@tsgq/api-client'

interface SortRow { id: number; name: string; slug: string; sort_order: number }

export default function CategoriesSort() {
  const [list, setList] = useState<SortRow[]>([])
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    http.get(adminApi.categories).then((res: any) => setList(res.data)).catch((e: any) => message.error(e.message))
  }, [])
  useEffect(load, [load])

  // 上移/下移（交换 sort_order 后重排）
  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir
    if (target < 0 || target >= list.length) return
    const next = [...list]
    ;[next[index], next[target]] = [next[target], next[index]]
    // 依据新顺序重写 sort_order（1..n）
    setList(next.map((row, i) => ({ ...row, sort_order: i + 1 })))
  }

  // 保存排序（批量提交）
  const save = async () => {
    setSaving(true)
    try {
      await http.put(`${adminApi.categories}/sort`, { orders: list.map((r) => ({ id: r.id, sort_order: r.sort_order })) })
      message.success('排序已保存')
    } catch (e: any) { message.error(e.message) } finally { setSaving(false) }
  }

  return (
    <div>
      <div className="admin-page-title">系列排序</div>
      <div style={{ marginBottom: 12, fontSize: 13, color: '#999' }}>
        点击上移/下移调整展示顺序，保存后前台品类 Tab 按此顺序排列
      </div>
      <Table
        rowKey="id"
        pagination={false}
        dataSource={list}
        columns={[
          { title: '序号', dataIndex: 'sort_order', width: 60, render: (v) => <b style={{ color: '#6E161D' }}>{v}</b> },
          { title: '系列名称', dataIndex: 'name' },
          { title: 'Slug', dataIndex: 'slug', render: (v) => <code>{v}</code> },
          {
            title: '排序操作', width: 160,
            render: (_, _r, index) => (
              <Space>
                <Button size="small" icon={<ArrowUpOutlined />} disabled={index === 0} onClick={() => move(index, -1)} />
                <Button size="small" icon={<ArrowDownOutlined />} disabled={index === list.length - 1} onClick={() => move(index, 1)} />
              </Space>
            ),
          },
        ]}
      />
      <div style={{ marginTop: 16 }}>
        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={save}>保存排序</Button>
      </div>
    </div>
  )
}
