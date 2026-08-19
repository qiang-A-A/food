// 核心卖点管理（5 项，前台卖点数据源）——复用 AboutListEditor
import { AboutListEditor } from '@/components/AboutListEditor'
export default function AboutPoints() {
  return (
    <AboutListEditor
      field="selling_points"
      title="核心卖点"
      defaultItems={[
        { title: '宫廷御膳传承', desc: '源自宫廷御膳技艺，传承千年礼制', icon: 'heritage' },
        { title: '非遗手工技艺', desc: '非遗匠人手作，古法烘焙', icon: 'craft' },
        { title: '甄选天然食材', desc: '严选天然原料，零添加承诺', icon: 'natural' },
        { title: '高端礼盒定制', desc: '企业团购与私人高端定制', icon: 'custom' },
        { title: '食品安全品质', desc: 'SC 认证工厂，全程品控', icon: 'safety' },
      ]}
    />
  )
}
