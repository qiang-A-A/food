// =============================================================================
// src/pages/Products.tsx — 产品管理（列表/新增/编辑/批量/状态）
// -----------------------------------------------------------------------------
// 功能：产品列表（搜索名称/编号/型号 + 品类/发布状态筛选 + 分页）→ 表格
//       （封面/名称/编号/品类/系列/最低价/精选/发布状态下拉/编辑/删除）→
//       新增/编辑弹窗（完整字段 + 食品合规必填 + 分区图片上传 + 富文本描述 +
//       规格参数 JSON）→ 批量操作栏（上架/下架/草稿/删除）。
// 数据：GET/POST /api/admin/products、PUT /{id}、PATCH status、DELETE、batch。
// =============================================================================

import { useCallback, useEffect, useState } from 'react'
import { Button, Form, Input, Modal, Select, Space, Switch, Table, message } from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

import { http } from '@/api/http'
import { adminApi } from '@tsgq/api-client'
import { ConfirmDanger } from '@/components/ConfirmDanger'
import { FeaturedTag } from '@/components/StatusTag'
import { ImageUploader } from '@/components/ImageUploader'
import { RichTextEditor } from '@/components/RichTextEditor'

// 产品行数据
interface ProductRow {
  id: number
  name: string
  product_no: string
  series: string | null
  model: string | null
  category_id: number
  category_name: string | null
  cover_image: string | null
  price: string | null
  is_featured: boolean
  publish_status: string
  spec: string | null
}

const PAGE_SIZE = 10

export default function Products() {
  const [list, setList] = useState<ProductRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [catFilter, setCatFilter] = useState<number | undefined>()
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [cats, setCats] = useState<{ id: number; name: string }[]>([])

  // 弹窗状态
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ProductRow | null>(null)
  const [delTarget, setDelTarget] = useState<ProductRow | null>(null)  // 删除确认
  const [batchIds, setBatchIds] = useState<number[]>([])
  const [batchDelOpen, setBatchDelOpen] = useState(false) // 审计修复：批量删除二次确认
  const [loading, setLoading] = useState(false)

  // 表单实例
  const [form] = Form.useForm()

  // 加载品类（筛选与表单下拉）
  useEffect(() => {
    http.get(adminApi.categories).then((res: any) => setCats(res.data)).catch(() => setCats([]))
  }, [])

  // 加载产品列表
  const load = useCallback(() => {
    setLoading(true)
    const params: any = { page, page_size: PAGE_SIZE }
    if (keyword) params.keyword = keyword
    if (catFilter) params.category_id = catFilter
    if (statusFilter) params.publish_status = statusFilter
    http.get(adminApi.products, { params })
      .then((res: any) => {
        setList(res.data.items)
        setTotal(res.data.total)
      })
      .catch((e: any) => message.error(e.message))
      .finally(() => setLoading(false))
  }, [page, keyword, catFilter, statusFilter])

  useEffect(load, [load])

  // 打开新增/编辑弹窗
  const openModal = (row?: ProductRow) => {
    setEditing(row ?? null)
    if (row) {
      // 编辑回填（拉详情填富文本等完整字段）
      http.get(`${adminApi.products}/${row.id}`).then((res: any) => {
        const d = res.data
        form.setFieldsValue({
          ...d,
          spec_params_text: JSON.stringify(d.spec_params ?? [], null, 1),
        })
      }).catch(() => {})
    } else {
      form.resetFields()
    }
    setModalOpen(true)
  }

  // 提交新增/编辑
  const handleSubmit = async () => {
    const values = await form.validateFields()
    // 规格参数 JSON 文本 → 数组
    let specParams: any[] = []
    try {
      specParams = values.spec_params_text ? JSON.parse(values.spec_params_text) : []
    } catch {
      message.error('规格参数不是合法 JSON')
      return
    }
    const payload: any = {
      ...values,
      spec_params: specParams,
      spec_params_text: undefined,
    }
    // 审计修复：封面仅在「创建」或「本次提交了实拍图」时同步为首图——
    // 此前编辑时 product_images 为空也会强制写 cover_image: null，
    // 把仅设了封面的老产品封面清空（后端 exclude_unset 下显式 null 同样覆盖）
    if (values.product_images?.length) {
      payload.cover_image = values.product_images[0]
    } else if (!editing) {
      payload.cover_image = null
    }
    try {
      if (editing) {
        await http.put(`${adminApi.products}/${editing.id}`, payload)
        message.success('产品已更新')
      } else {
        await http.post(adminApi.products, payload)
        message.success('产品创建成功')
      }
      setModalOpen(false)
      load()
    } catch (e: any) {
      message.error(e.message)
    }
  }

  // 切换发布状态（表格内下拉即时生效）
  const changeStatus = async (row: ProductRow, status: string) => {
    try {
      await http.patch(`${adminApi.products}/${row.id}/status`, { publish_status: status })
      message.success('状态已更新')
      load()
    } catch (e: any) { message.error(e.message) }
  }

  // 删除（软删除 → 回收站）
  const handleDelete = async () => {
    if (!delTarget) return
    try {
      await http.delete(`${adminApi.products}/${delTarget.id}`)
      message.success('已移入回收站')
      setDelTarget(null)
      load()
    } catch (e: any) { message.error(e.message) }
  }

  // 批量操作（审计修复：删除类操作需二次确认，与单删一致的危险操作规范）
  const batchAction = async (action: string) => {
    if (batchIds.length === 0) { message.warning('请先勾选产品'); return }
    if (action === 'delete') { setBatchDelOpen(true); return }  // 删除走确认弹窗
    try {
      await http.post(`${adminApi.products}/batch`, { ids: batchIds, action })
      message.success(`批量${action === 'delete' ? '删除' : action}完成`)
      setBatchIds([])
      load()
    } catch (e: any) { message.error(e.message) }
  }

  // 批量删除确认后执行
  const handleBatchDelete = async () => {
    try {
      await http.post(`${adminApi.products}/batch`, { ids: batchIds, action: 'delete' })
      message.success(`已批量移入回收站 ${batchIds.length} 项`)
      setBatchIds([])
      setBatchDelOpen(false)
      load()
    } catch (e: any) { message.error(e.message) }
  }

  // 表格列
  const columns: ColumnsType<ProductRow> = [
    {
      title: '产品', dataIndex: 'name',
      render: (_, r) => (
        <Space>
          {r.cover_image
            ? <img src={r.cover_image} alt="" style={{ width: 40, height: 30, objectFit: 'cover', borderRadius: 2, border: '1px solid #E8E8E8' }} />
            : <div style={{ width: 40, height: 30, background: '#8C1F28', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#F6ECD7' }}>宫阙</div>}
          <div>
            <div style={{ fontWeight: 500 }}>{r.name}</div>
            <div style={{ fontSize: 12, color: '#999' }}>{r.product_no}</div>
          </div>
        </Space>
      ),
    },
    { title: '系列', dataIndex: 'series', width: 90, render: (v) => v || '—' },
    { title: '品类', dataIndex: 'category_name', width: 100 },
    { title: '最低价', dataIndex: 'price', width: 90, render: (v) => (v ? `${v} 起` : '面议') },
    { title: '精选', dataIndex: 'is_featured', width: 70, render: (v) => <FeaturedTag featured={v} /> },
    {
      title: '发布状态', dataIndex: 'publish_status', width: 110,
      render: (v: string, r) => (
        <Select
          size="small"
          value={v}
          style={{ width: 90 }}
          onChange={(nv) => changeStatus(r, nv)}
          options={[
            { value: 'on', label: '上架' },
            { value: 'off', label: '下架' },
            { value: 'draft', label: '草稿' },
          ]}
        />
      ),
    },
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
      <div className="admin-page-title">产品列表</div>

      {/* 搜索与筛选栏 */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <Input.Search
          placeholder="搜索名称 / 编号 / 型号"
          allowClear
          style={{ width: 240 }}
          onSearch={(v) => { setPage(1); setKeyword(v) }}
        />
        <Select
          placeholder="全部品类"
          allowClear
          style={{ width: 140 }}
          value={catFilter}
          onChange={(v) => { setPage(1); setCatFilter(v) }}
          options={cats.map((c) => ({ value: c.id, label: c.name }))}
        />
        <Select
          placeholder="全部状态"
          allowClear
          style={{ width: 120 }}
          value={statusFilter}
          onChange={(v) => { setPage(1); setStatusFilter(v) }}
          options={[
            { value: 'on', label: '上架' },
            { value: 'off', label: '下架' },
            { value: 'draft', label: '草稿' },
          ]}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>新增产品</Button>
      </div>

      {/* 批量操作栏（勾选 ≥1 行出现，UI/UX §4.5） */}
      {batchIds.length > 0 && (
        <div style={{ background: 'rgba(201,169,106,.1)', padding: '8px 12px', borderRadius: 3, marginBottom: 12, fontSize: 13 }}>
          已选 {batchIds.length} 项：
          <Button size="small" style={{ marginLeft: 10 }} onClick={() => batchAction('on')}>批量上架</Button>
          <Button size="small" style={{ marginLeft: 8 }} onClick={() => batchAction('off')}>批量下架</Button>
          <Button size="small" style={{ marginLeft: 8 }} onClick={() => batchAction('draft')}>批量草稿</Button>
          <Button size="small" danger style={{ marginLeft: 8 }} onClick={() => batchAction('delete')}>批量删除</Button>
        </div>
      )}

      {/* 产品表格 */}
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={list}
        rowSelection={{ selectedRowKeys: batchIds, onChange: (keys: React.Key[]) => setBatchIds(keys as number[]) }}
        pagination={{
          current: page, pageSize: PAGE_SIZE, total,
          onChange: setPage, showSizeChanger: false,
        }}
        scroll={{ x: 900 }}
      />

      {/* 新增/编辑弹窗（大表单 640） */}
      <Modal
        title={editing ? `编辑产品：${editing.name}` : '新增产品'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={760}
        okText="保存"
        cancelText="取消"
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          {/* 基本信息 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="name" label="产品名称" rules={[{ required: true, message: '请输入名称' }]}>
              <Input placeholder="如 御品九宫酥礼盒" />
            </Form.Item>
            <Form.Item name="product_no" label="产品编号" rules={[{ required: true, message: '请输入编号' }]}>
              <Input placeholder="如 GQ-1001（唯一）" />
            </Form.Item>
            <Form.Item name="category_id" label="所属品类" rules={[{ required: true, message: '请选择品类' }]}>
              <Select placeholder="选择品类" options={cats.map((c) => ({ value: c.id, label: c.name }))} />
            </Form.Item>
            <Form.Item name="series" label="所属系列">
              <Input placeholder="如 胡桃禮（选填）" />
            </Form.Item>
            <Form.Item name="model" label="型号">
              <Input placeholder="如 GQ-001" />
            </Form.Item>
            <Form.Item name="spec" label="规格（简要）">
              <Input placeholder="如 8 枚装" />
            </Form.Item>
            <Form.Item name="flavor" label="口味">
              <Input placeholder="如 枣泥/豆沙" />
            </Form.Item>
            <Form.Item name="price" label="最低价（¥xxx 起）">
              <Input placeholder="如 ¥388（前台展示 ¥388 起）" />
            </Form.Item>
          </div>

          {/* 食品合规（必填，PRD 风险项） */}
          <div style={{ fontWeight: 600, color: '#8C1F28', margin: '4px 0 8px' }}>食品合规信息（必填）</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="ingredients" label="配料表" rules={[{ required: true, message: '必填' }]}>
              <Input placeholder="如 小麦粉、红枣…" />
            </Form.Item>
            <Form.Item name="net_weight" label="净含量" rules={[{ required: true, message: '必填' }]}>
              <Input placeholder="如 480g" />
            </Form.Item>
            <Form.Item name="shelf_life" label="保质期" rules={[{ required: true, message: '必填' }]}>
              <Input placeholder="如 60 天" />
            </Form.Item>
            <Form.Item name="storage" label="储存条件" rules={[{ required: true, message: '必填' }]}>
              <Input placeholder="如 阴凉干燥处" />
            </Form.Item>
            <Form.Item name="allergen" label="过敏原提示" rules={[{ required: true, message: '必填' }]}>
              <Input placeholder="如 含麸质、坚果" />
            </Form.Item>
            <Form.Item name="box_spec" label="礼盒规格">
              <Input placeholder="如 礼盒 28×22×8cm" />
            </Form.Item>
          </div>

          {/* 图片分区（PRD v2.2：产品实拍图 / 礼盒包装图） */}
          <Form.Item name="product_images" label="产品实拍图">
            <ImageUploader />
          </Form.Item>
          <Form.Item name="box_images" label="礼盒包装图">
            <ImageUploader />
          </Form.Item>

          {/* 发布状态与精选 */}
          <div style={{ display: 'flex', gap: 40, marginBottom: 12 }}>
            <Form.Item name="publish_status" label="发布状态" initialValue="draft" style={{ marginBottom: 8 }}>
              <Select style={{ width: 130 }} options={[
                { value: 'on', label: '上架' }, { value: 'off', label: '下架' }, { value: 'draft', label: '草稿' },
              ]} />
            </Form.Item>
            <Form.Item name="is_featured" label="精选（首页展示）" valuePropName="checked" style={{ marginBottom: 8 }}>
              <Switch />
            </Form.Item>
          </div>

          {/* 规格参数 JSON */}
          <Form.Item name="spec_params_text" label="规格参数（JSON，可选）" extra='格式：[{"key":"净含量","value":"480g"}]'>
            <Input.TextArea rows={3} placeholder='[{"key":"净含量","value":"480g"},{"key":"保质期","value":"60 天"}]' />
          </Form.Item>

          {/* 富文本描述 */}
          <Form.Item name="description" label="产品描述（富文本）" valuePropName="value" getValueFromEvent={(html) => html}>
            <RichTextEditor placeholder="输入产品设计说明、礼盒装帧等…" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 删除二次确认 */}
      <ConfirmDanger
        open={!!delTarget}
        title="删除产品"
        content={`确定将「${delTarget?.name}」移入回收站吗？可在回收站恢复。`}
        onOk={handleDelete}
        onCancel={() => setDelTarget(null)}
      />

      {/* 批量删除二次确认（审计修复：危险操作统一二次确认） */}
      <ConfirmDanger
        open={batchDelOpen}
        title="批量删除产品"
        content={`确定将选中的 ${batchIds.length} 个产品移入回收站吗？可在回收站恢复。`}
        onOk={handleBatchDelete}
        onCancel={() => setBatchDelOpen(false)}
      />
    </div>
  )
}
