// =============================================================================
// src/components/ImageUploader.tsx — 分区图片上传（多图/封面/删除）
// -----------------------------------------------------------------------------
// 功能：产品图片上传组件（UI/UX §5.3 图片上传规范）——支持多图、设置封面、
//       删除；分区使用（产品实拍图 product_images / 礼盒包装图 box_images）。
// 流程：选择文件 → POST /api/admin/upload（kind=image）→ 回填 URL 到列表；
//       首个自动设为封面（或手动指定）。
// =============================================================================

import { useRef } from 'react'
import { Button } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'

import { http } from '@/api/http'
import { adminApi } from '@tsgq/api-client'

interface ImageUploaderProps {
  value?: string[]                 // 图片 URL 数组（受控）
  onChange?: (urls: string[]) => void  // 变更回调
  max?: number                     // 最大张数（默认 5）
}

export function ImageUploader({ value = [], onChange, max = 5 }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  // 选择文件后逐个上传
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const list = [...value]
    for (const file of Array.from(files)) {
      if (list.length >= max) {
        alert(`最多上传 ${max} 张`)
        break
      }
      // 类型/大小前端预检（后端也会守卫）
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        alert('仅支持 jpg/png/webp 图片')
        continue
      }
      if (file.size > 10 * 1024 * 1024) {
        alert('单张图片不能超过 10MB')
        continue
      }
      // 上传并回填 URL
      const fd = new FormData()
      fd.append('file', file)
      try {
        const res: any = await http.post(adminApi.upload, fd, { params: { kind: 'image' }, headers: { 'Content-Type': 'multipart/form-data' } })
        list.push(res.data.url)
      } catch (e: any) {
        alert(e.message || '上传失败')
      }
    }
    onChange?.(list)
    if (inputRef.current) inputRef.current.value = ''
  }

  // 删除某张图
  const remove = (url: string) => onChange?.(value.filter((u) => u !== url))

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {/* 已上传图片缩略图（含删除钮） */}
        {value.map((url, i) => (
          <div key={url} style={{ position: 'relative', width: 76, height: 76, border: '1px solid #D9D9D9', borderRadius: 3, overflow: 'hidden' }}>
            <img src={url} alt={`图片 ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <button
              onClick={() => remove(url)}
              aria-label="删除图片"
              style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,.55)', border: 'none', color: '#fff', width: 18, height: 18, borderRadius: '50%', cursor: 'pointer', fontSize: 11, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <DeleteOutlined style={{ fontSize: 10 }} />
            </button>
            {/* 首图标记为封面（后台产品封面取数组首项） */}
            {i === 0 && (
              <span style={{ position: 'absolute', left: 0, bottom: 0, background: '#C9A96A', color: '#3A2B16', fontSize: 9, padding: '1px 5px' }}>
                封面
              </span>
            )}
          </div>
        ))}
        {/* 上传按钮 */}
        {value.length < max && (
          <Button
            icon={<PlusOutlined />}
            onClick={() => inputRef.current?.click()}
            style={{ width: 76, height: 76 }}
          >
            上传
          </Button>
        )}
      </div>
      {/* 隐藏的文件输入 */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div style={{ marginTop: 4, fontSize: 12, color: '#999' }}>支持 jpg/png/webp，单张 ≤10MB，首张为封面</div>
    </div>
  )
}
