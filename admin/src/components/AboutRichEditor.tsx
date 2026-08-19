// =============================================================================
// src/components/AboutRichEditor.tsx — 关于我们富文本编辑（通用）
// -----------------------------------------------------------------------------
// 功能：公司简介/品牌故事共用编辑页——加载单行配置 → TipTap 编辑对应字段 →
//       PUT /api/admin/about 保存（honors/selling_points 原样保留）。
// =============================================================================

import { useEffect, useState } from 'react'
import { Button, Spin, message } from 'antd'
import { SaveOutlined } from '@ant-design/icons'

import { http } from '@/api/http'
import { adminApi } from '@tsgq/api-client'
import { RichTextEditor } from '@/components/RichTextEditor'

interface AboutRichEditorProps {
  field: 'company_intro' | 'brand_story'   // 编辑的字段
  placeholder: string
  title: string
}

export function AboutRichEditor({ field, placeholder, title }: AboutRichEditorProps) {
  const [content, setContent] = useState<string>('')
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)

  // 加载当前配置
  useEffect(() => {
    http.get(adminApi.about)
      .then((res: any) => setContent(res.data[field] ?? ''))
      .catch((e: any) => message.error(e.message))
      .finally(() => setLoaded(true))
  }, [field])

  // 保存（整表 PUT，未修改字段原样保留）
  const save = async () => {
    setSaving(true)
    try {
      await http.put(adminApi.about, { [field]: content })
      message.success('已保存')
    } catch (e: any) { message.error(e.message) } finally { setSaving(false) }
  }

  if (!loaded) return <div style={{ textAlign: 'center', padding: 60 }}><Spin /></div>

  return (
    <div>
      <div className="admin-page-title">{title}</div>
      <div style={{ background: '#fff', border: '1px solid #E8E8E8', borderRadius: 3, padding: 16 }}>
        <RichTextEditor value={content} onChange={setContent} placeholder={placeholder} />
        <div style={{ marginTop: 12 }}>
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={save}>保存</Button>
        </div>
      </div>
    </div>
  )
}
