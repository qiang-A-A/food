// 公司简介编辑（富文本）——复用 AboutRichEditor
import { AboutRichEditor } from '@/components/AboutRichEditor'
export default function AboutIntro() {
  return <AboutRichEditor field="company_intro" title="公司简介" placeholder="输入公司简介（企业背景、规模、发展历程）…" />
}
