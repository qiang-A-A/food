// =============================================================================
// src/pages/SettingsContact.tsx — 联系方式设置（MVP 必做）
// -----------------------------------------------------------------------------
// 功能：电话/邮箱/地址/微信二维码/备案号/SC 许可统一维护
//       （前台联系我们页与页脚的数据源，PRD B-10）。
// 数据：GET/PUT /api/admin/settings/contact。
// =============================================================================

import { useEffect, useState } from 'react'
import { Button, Form, Input, message } from 'antd'
import { SaveOutlined } from '@ant-design/icons'

import { http } from '@/api/http'
import { adminApi } from '@tsgq/api-client'
import { SingleImageUpload } from '@/components/SingleImageUpload'

export default function SettingsContact() {
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)

  // 加载现有配置
  useEffect(() => {
    http.get(`${adminApi.settingsContact}`).then((res: any) => form.setFieldsValue(res.data)).catch(() => {})
  }, [form])

  // 保存
  const save = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      await http.put(`${adminApi.settingsContact}`, values)
      message.success('联系方式已保存')
    } catch (e: any) { message.error(e.message) } finally { setSaving(false) }
  }

  return (
    <div>
      <div className="admin-page-title">联系方式设置</div>
      <div style={{ background: '#fff', border: '1px solid #E8E8E8', borderRadius: 3, padding: 20, maxWidth: 640 }}>
        <Form form={form} layout="vertical">
          <Form.Item name="contact_phone" label="商务订购热线">
            <Input placeholder="如 400-000-0000" />
          </Form.Item>
          <Form.Item name="contact_email" label="电子邮箱">
            <Input placeholder="如 contact@tsgq.com" />
          </Form.Item>
          <Form.Item name="contact_address" label="公司地址">
            <Input placeholder="门店/公司地址" />
          </Form.Item>
          <Form.Item name="contact_wechat_qr" label="微信二维码">
            <SingleImageUpload placeholder="或直接粘贴二维码图片 URL（选填）" />
          </Form.Item>
          <Form.Item name="map_url" label="地图嵌入地址" extra="高德/腾讯地图「分享 → 嵌入地图 iframe」复制 src 链接，联系我们页渲染（需求 #5）">
            <Input placeholder="如 https://uri.amap.com/marker?... 或腾讯地图 embed 链接" />
          </Form.Item>
          <Form.Item name="footer_icp" label="ICP 备案号（页脚）">
            <Input placeholder="如 京ICP备xxxxxxxx号" />
          </Form.Item>
          <Form.Item name="footer_sc_license" label="SC 食品生产许可（页脚）" extra="食品类目合规必填（PRD §8）">
            <Input placeholder="如 SC00000000000000" />
          </Form.Item>
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={save}>保存</Button>
        </Form>
      </div>
    </div>
  )
}
