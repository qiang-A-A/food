// =============================================================================
// src/components/RichTextEditor.tsx — TipTap 富文本编辑器（后台）
// -----------------------------------------------------------------------------
// 功能：新闻/关于内容的富文本编辑（开发技术文档 §5.5 + PRD B-5）——
//       工具栏（加粗/斜体/标题/列表/引用/图片 URL/视频嵌入/撤销重做）；
//       图片上传经 /api/admin/upload（kind=image）后以 URL 插入；
//       视频嵌入：支持 B站/腾讯分享链接自动转 iframe（视频插入仅超管，MVP
//       全部后台用户视为超管）。
// =============================================================================

import { useEffect, useRef, useState } from 'react'
import { Button, Input, Modal, Tooltip, message } from 'antd'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { Node, mergeAttributes } from '@tiptap/core'
import {
  BoldOutlined, ItalicOutlined, OrderedListOutlined, PictureOutlined,
  RedoOutlined, UndoOutlined, UnorderedListOutlined, VideoCameraOutlined,
} from '@ant-design/icons'

import { http } from '@/api/http'
import { adminApi } from '@tsgq/api-client'

// ---- 自定义 iframe 节点（支持视频 URL 嵌入渲染）----
const Iframe = Node.create({
  name: 'iframe',
  group: 'block',
  atom: true,
  selectable: false,
  addAttributes: () => ({
    src: { default: null },
    width: { default: '100%' },
    height: { default: '360' },
  }),
  parseHTML: () => [{ tag: 'iframe' }],
  renderHTML: ({ HTMLAttributes }) => [
    'iframe',
    mergeAttributes(HTMLAttributes, { frameborder: '0', allowfullscreen: 'true' }),
  ],
})

/**
 * 视频分享链接 → 可嵌入 iframe 地址（审计修复：与后端 sanitize_html 的
 * ALLOWED_VIDEO_HOSTS 白名单严格对齐；非白名单平台返回 null 拒绝插入——
 * 此前腾讯/优酷分享链接原样插入无法播放，且任意域名可入库）
 */
function toEmbedUrl(url: string): string | null {
  const u = url.trim()
  // 已是白名单嵌入域（player.bilibili.com / v.qq.com / player.youku.com）：原样放行
  if (/^(?:https?:)?\/\/(?:player\.bilibili\.com|v\.qq\.com|player\.youku\.com)\//.test(u)) return u
  // B站：https://www.bilibili.com/video/BVxxxx → player 嵌入
  const bili = u.match(/(?:bilibili\.com\/video\/)(BV[\w]+)/)
  if (bili) return `//player.bilibili.com/player.html?bvid=${bili[1]}&page=1`
  // 腾讯视频：https://v.qq.com/x/page/xxxx.html → 播放器嵌入（vid 提取）
  const qq = u.match(/(?:v\.qq\.com\/x\/page\/)([\w]+)(?:\.html)?/)
  if (qq) return `//v.qq.com/txp/iframe/player.html?vid=${qq[1]}`
  // 优酷：https://v.youku.com/v_show/id_xxxx.html → 播放器嵌入
  const yk = u.match(/(?:v\.youku\.com\/v_show\/id_)([\w=]+)(?:\.html)?/)
  if (yk) return `//player.youku.com/embed/${yk[1]}`
  return null // 其他平台：拒绝（与后端白名单一致，防止任意域名 iframe 入库）
}

interface RichTextEditorProps {
  value?: string   // HTML 内容（受控）
  onChange?: (html: string) => void
  placeholder?: string
}

export function RichTextEditor({ value, onChange, placeholder = '请输入内容…' }: RichTextEditorProps) {
  // 视频 URL 输入弹窗状态
  const [videoOpen, setVideoOpen] = useState(false)
  const videoUrlRef = useRef('')

  // TipTap 编辑器实例（v3 API）
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false }),
      Placeholder.configure({ placeholder }),
      Iframe,
    ],
    content: value ?? '',
    onUpdate: ({ editor: ed }) => onChange?.(ed.getHTML()),
  })

  // 外部 value 变化时同步（如编辑回填）
  const prevValue = useRef(value)
  useEffect(() => {
    if (editor && value !== undefined && value !== prevValue.current) {
      prevValue.current = value
      if (editor.getHTML() !== value) editor.commands.setContent(value ?? '')
    }
  }, [value, editor])

  // 图片插入：选本地文件上传 → URL 插入
  const insertImage = async (file: File | undefined) => {
    if (!file || !editor) return
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res: any = await http.post(adminApi.upload, fd, { params: { kind: 'image' }, headers: { 'Content-Type': 'multipart/form-data' } })
      editor.chain().focus().setImage({ src: res.data.url }).run()
    } catch (e: any) {
      message.error(e.message || '图片上传失败')
    }
  }

  // 视频 URL 嵌入（分享链接自动转 iframe）
  const insertVideo = () => {
    const raw = videoUrlRef.current.trim()
    if (!raw) { message.warning('请输入视频链接'); return }
    const embed = toEmbedUrl(raw)
    // 审计修复：非白名单平台拒绝插入（防止任意域名 iframe 入库并渲染到官网）
    if (!embed) { message.error('仅支持 B站 / 腾讯视频 / 优酷 的分享链接'); return }
    editor?.chain().focus().insertContent(`<iframe src="${embed}"></iframe>`).run()
    setVideoOpen(false)
    videoUrlRef.current = ''
  }

  // 工具栏按钮（disabled 时不执行）
  const btn = (label: string, icon: React.ReactNode, action: () => void, active = false) => (
    <Tooltip title={label}>
      <Button size="small" type={active ? 'primary' : 'text'} icon={icon} onMouseDown={(e) => e.preventDefault()} onClick={action} />
    </Tooltip>
  )

  return (
    <div style={{ border: '1px solid #D9D9D9', borderRadius: 3, background: '#fff' }}>
      {/* 工具栏 */}
      <div style={{ display: 'flex', gap: 2, padding: 6, borderBottom: '1px solid #F0F0F0', flexWrap: 'wrap', alignItems: 'center' }}>
        {btn('加粗', <BoldOutlined />, () => editor?.chain().focus().toggleBold().run(), editor?.isActive('bold') ?? false)}
        {btn('斜体', <ItalicOutlined />, () => editor?.chain().focus().toggleItalic().run(), editor?.isActive('italic') ?? false)}
        {btn('标题', <b style={{ fontSize: 12 }}>H2</b>, () => editor?.chain().focus().toggleHeading({ level: 2 }).run())}
        {btn('无序列表', <UnorderedListOutlined />, () => editor?.chain().focus().toggleBulletList().run())}
        {btn('有序列表', <OrderedListOutlined />, () => editor?.chain().focus().toggleOrderedList().run())}
        {btn('引用', <span style={{ fontSize: 14 }}>❝</span>, () => editor?.chain().focus().toggleBlockquote().run())}
        {/* 图片：隐藏文件选择触发上传 */}
        <label style={{ display: 'inline-flex' }}>
          <Tooltip title="插入图片"><span style={{ display: 'inline-flex' }}><Button size="small" type="text" icon={<PictureOutlined />} onMouseDown={(e) => e.preventDefault()} onClick={() => document.getElementById('rt-image-input')?.click()} /></span></Tooltip>
          <input id="rt-image-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { insertImage(e.target.files?.[0]); e.target.value = '' }} />
        </label>
        {btn('插入视频', <VideoCameraOutlined />, () => setVideoOpen(true))}
        <span style={{ flex: 1 }} />
        {btn('撤销', <UndoOutlined />, () => editor?.chain().focus().undo().run())}
        {btn('重做', <RedoOutlined />, () => editor?.chain().focus().redo().run())}
      </div>

      {/* 编辑区 */}
      <div style={{ padding: '0 12px', minHeight: 200 }} className="tiptap-editor">
        <EditorContent editor={editor} />
      </div>

      {/* 视频 URL 弹窗 */}
      <Modal title="插入视频" open={videoOpen} onOk={insertVideo} onCancel={() => setVideoOpen(false)} okText="插入" cancelText="取消" width={440}>
        <Input
          placeholder="粘贴视频分享链接（B站/腾讯视频等）"
          onChange={(e) => (videoUrlRef.current = e.target.value)}
          onPressEnter={insertVideo}
        />
        <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
          支持 B站/腾讯/优酷分享链接自动转嵌入；mp4 视频文件请先上传后填写直链
        </div>
      </Modal>

      {/* TipTap 编辑区样式 */}
      <style>{`
        .tiptap-editor .tiptap { outline: none; min-height: 180px; padding: 12px 0; font-size: 14px; line-height: 1.8; }
        .tiptap-editor .tiptap p { margin: 0 0 8px; }
        .tiptap-editor .tiptap h2 { font-size: 18px; margin: 12px 0 6px; }
        .tiptap-editor .tiptap img { max-width: 100%; }
        .tiptap-editor .tiptap iframe { max-width: 100%; border: none; }
        .tiptap-editor .tiptap p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: #bbb; float: left; height: 0; pointer-events: none; }
      `}</style>
    </div>
  )
}
