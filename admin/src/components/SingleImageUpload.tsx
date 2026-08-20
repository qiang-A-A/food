// =============================================================================
// src/components/SingleImageUpload.tsx — 单图上传 + 手动 URL 双入口
// -----------------------------------------------------------------------------
// 功能：AntD Form 字段的图片输入统一组件——「选图上传回填 URL」+「手动粘贴
//       URL」双入口。桥接 Form 的字符串值与 ImageUploader（数组受控）的差异。
// 使用：轮播图 / 系列封面 / 新闻封面 / 微信二维码等单图场景。
// =============================================================================

import { Input } from 'antd'

import { ImageUploader } from '@/components/ImageUploader'

interface SingleImageUploadProps {
  value?: string | null            // 表单值：单个图片 URL
  onChange?: (v: string | null) => void  // 变更回调（null = 清空）
  placeholder?: string             // 手动输入框占位
}

export function SingleImageUpload({ value, onChange, placeholder = '或直接粘贴图片 URL' }: SingleImageUploadProps) {
  return (
    <div>
      {/* 上传按钮（max=1，上传后自动回填 URL） */}
      <ImageUploader
        value={value ? [value] : []}
        max={1}
        onChange={(urls) => onChange?.(urls[0] ?? null)}
      />
      {/* 手动 URL 输入（与上传值双向同步，保留占位图等特殊值能力） */}
      <Input
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value || null)}
        placeholder={placeholder}
        style={{ marginTop: 8 }}
        allowClear
      />
    </div>
  )
}
