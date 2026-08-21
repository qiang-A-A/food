// =============================================================================
// src/pages/AboutWorkshop.tsx — 工厂与工坊管理（B 关于我们扩展）
// -----------------------------------------------------------------------------
// 功能：编辑前台「关于我们 → 工厂与工坊」三张卡片（标题/描述/图片上传），
//       数据存 about 表 workshop JSON 数组 [{title, desc, image}]（2026-08-21
//       新增，此前前台该区块为静态占位不可编辑）。
// 数据：GET/PUT /api/admin/about。
// =============================================================================

import { useEffect, useState } from 'react'
import { Button, Input, message } from 'antd'
import { DeleteOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons'

import { http } from '@/api/http'
import { adminApi } from '@tsgq/api-client'
import { SingleImageUpload } from '@/components/SingleImageUpload'

// 默认占位三卡（与前台静态占位一致；后台保存真实数据后覆盖）
const DEFAULT_ITEMS = [
  { title: '中央工厂', desc: 'SC 认证洁净车间 · 全程品控', image: '' },
  { title: '非遗糕点工坊', desc: '古法起酥 · 匠人手作', image: '' },
  { title: '技艺传承', desc: '师徒相传 · 守护经典', image: '' },
]

export default function AboutWorkshop() {
  // 条目数组（每项含 title/desc/image）
  const [items, setItems] = useState<{ title: string; desc: string; image: string }[]>(DEFAULT_ITEMS)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)

  // 加载现有配置
  useEffect(() => {
    http.get(adminApi.about)
      .then((res: any) => {
        const arr = res.data.workshop
        setItems(Array.isArray(arr) && arr.length ? arr : DEFAULT_ITEMS)
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  // 更新单条字段
  const update = (index: number, key: string, value: string) => {
    setItems((arr) => arr.map((it, i) => (i === index ? { ...it, [key]: value } : it)))
  }

  // 新增空卡片
  const add = () => setItems((arr) => [...arr, { title: '', desc: '', image: '' }])

  // 删除卡片
  const remove = (index: number) => setItems((arr) => arr.filter((_, i) => i !== index))

  // 保存（整表 PUT，过滤空标题条目）
  const save = async () => {
    const valid = items.filter((it) => it.title.trim())
    setSaving(true)
    try {
      await http.put(adminApi.about, { workshop: valid })
      message.success('已保存')
    } catch (e: any) { message.error(e.message) } finally { setSaving(false) }
  }

  if (!loaded) return null

  return (
    <div>
      <div className="admin-page-title">工厂与工坊</div>
      <div style={{ marginBottom: 12, fontSize: 12, color: '#A8863F' }}>
        注：对应前台「关于我们 → 工厂与工坊」卡片；上传图片后前台实景展示，留空则显示占位插画
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 720 }}>
        {items.map((it, i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid #E8E8E8', borderRadius: 3, padding: 14, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            {/* 序号 */}
            <div style={{ width: 34, height: 34, flexShrink: 0, borderRadius: 2, border: '2px solid #C9A96A', color: '#8C1F28', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>
              {i + 1}
            </div>
            <div style={{ flex: 1 }}>
              <Input size="small" placeholder="卡片标题（如 中央工厂）" value={it.title} onChange={(e) => update(i, 'title', e.target.value)} style={{ marginBottom: 6 }} />
              <Input size="small" placeholder="卡片描述（如 SC 认证洁净车间 · 全程品控）" value={it.desc} onChange={(e) => update(i, 'desc', e.target.value)} style={{ marginBottom: 8 }} />
              {/* 图片上传（需求：可上传实景图） */}
              <SingleImageUpload value={it.image} onChange={(v) => update(i, 'image', v ?? '')} placeholder="上传实景图或粘贴图片 URL" />
            </div>
            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => remove(i)} style={{ flexShrink: 0 }} />
          </div>
        ))}

        <div style={{ display: 'flex', gap: 10 }}>
          <Button icon={<PlusOutlined />} onClick={add}>新增卡片</Button>
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={save}>保存</Button>
        </div>
      </div>
    </div>
  )
}
