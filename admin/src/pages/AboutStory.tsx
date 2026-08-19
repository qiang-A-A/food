// 品牌故事编辑（富文本，御膳渊源）——复用 AboutRichEditor（PRD B-7 新增）
import { AboutRichEditor } from '@/components/AboutRichEditor'
export default function AboutStory() {
  return <AboutRichEditor field="brand_story" title="品牌故事" placeholder="输入品牌故事（御膳房渊源/宫廷糕点传承）…" />
}
