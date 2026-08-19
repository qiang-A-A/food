// 荣誉资质管理（卡片增删改，JSON 数组）——复用 AboutListEditor
import { AboutListEditor } from '@/components/AboutListEditor'
export default function AboutHonors() {
  return (
    <AboutListEditor
      field="honors"
      title="荣誉资质"
      defaultItems={[
        { title: '中国礼赠食品创意金奖', desc: '中国食品礼品大赛 · 2025', icon: '金奖' },
        { title: 'SC 食品生产许可认证', desc: '食品级洁净车间 · 权威认证', icon: '认证' },
        { title: '国家级非遗糕点技艺合作单位', desc: '宫廷糕点传承保护 · 2023', icon: '非遗' },
      ]}
    />
  )
}
