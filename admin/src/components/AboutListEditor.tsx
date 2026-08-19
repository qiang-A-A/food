// =============================================================================
// src/components/AboutListEditor.tsx — 关于我们 JSON 数组管理（通用）
// -----------------------------------------------------------------------------
// 功能：荣誉资质 / 核心卖点的卡片式增删改（对应 about 表 honors/selling_points
//       JSON 数组，元素 {title, desc, icon}）→ PUT /api/admin/about 保存。
// =============================================================================

import { useEffect, useState } from 'react'
import { Button, Input, message } from 'antd'
import { DeleteOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons'

import { http } from '@/api/http'
import { adminApi } from '@tsgq/api-client'

interface AboutListEditorProps {
  field: 'honors' | 'selling_points'
  title: string
  defaultItems: { title: string; desc: string; icon: string }[]
}

export function AboutListEditor({ field, title, defaultItems }: AboutListEditorProps) {
  // 条目数组（每项含 title/desc/icon）
  const [items, setItems] = useState<{ title: string; desc: string; icon: string }[]>(defaultItems)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)

  // 加载现有配置
  useEffect(() => {
    http.get(adminApi.about)
      .then((res: any) => {
        const arr = res.data[field]
        setItems(Array.isArray(arr) && arr.length ? arr : defaultItems)
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [field])

  // 更新单条字段
  const update = (index: number, key: string, value: string) => {
    setItems((arr) => arr.map((it, i) => (i === index ? { ...it, [key]: value } : it)))
  }

  // 新增空条目
  const add = () => setItems((arr) => [...arr, { title: '', desc: '', icon: '' }])

  // 删除条目
  const remove = (index: number) => setItems((arr) => arr.filter((_, i) => i !== index))

  // 保存（整表 PUT）
  const save = async () => {
    // 过滤空条目
    const valid = items.filter((it) => it.title.trim())
    setSaving(true)
    try {
      await http.put(adminApi.about, { [field]: valid })
      message.success('已保存')
    } catch (e: any) { message.error(e.message) } finally { setSaving(false) }
  }

  if (!loaded) return null

  return (
    <div>
      <div className="admin-page-title">{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 720 }}>
        {items.map((it, i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid #E8E8E8', borderRadius: 3, padding: 14, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            {/* 序号印章 */}
            <div style={{ width: 34, height: 34, flexShrink: 0, borderRadius: 2, border: '2px solid #C9A96A', color: '#8C1F28', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>
              {i + 1}
            </div>
            <div style={{ flex: 1 }}>
              <Input size="small" placeholder={field === 'honors' ? '荣誉名称（如 中国礼赠食品创意金奖）' : '卖点标题（如 宫廷御膳传承）'} value={it.title} onChange={(e) => update(i, 'title', e.target.value)} style={{ marginBottom: 6 }} />
              <Input size="small" placeholder={field === 'honors' ? '荣誉说明（如 中国食品礼品大赛 · 2025）' : '卖点描述'} value={it.desc} onChange={(e) => update(i, 'desc', e.target.value)} style={{ marginBottom: 6 }} />
              <Input size="small" placeholder={field === 'honors' ? '印章文字（如 金奖）' : '图标标识（如 heritage）'} value={it.icon} onChange={(e) => update(i, 'icon', e.target.value)} />
            </div>
            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => remove(i)} style={{ flexShrink: 0 }} />
          </div>
        ))}

        <Button icon={<PlusOutlined />} onClick={add} style={{ alignSelf: 'flex-start' }}>
          添加一项
        </Button>
        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={save} style={{ alignSelf: 'flex-start' }}>
          保存
        </Button>
      </div>
    </div>
  )
}
