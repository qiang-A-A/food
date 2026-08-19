// =============================================================================
// src/pages/SettingsSite.tsx — 站点设置（P2 可延后）
// -----------------------------------------------------------------------------
// 功能：网站标题 / 品牌标语维护（PRD B-10 站点设置，P2）。
// 数据：GET/PUT /api/admin/settings/site。
// =============================================================================

import { useEffect, useState } from 'react'
import { Button, Form, Input, message } from 'antd'
import { SaveOutlined } from '@ant-design/icons'

import { http } from '@/api/http'
import { adminApi } from '@tsgq/api-client'

export default function SettingsSite() {
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    http.get(`${adminApi.settingsSite}`).then((res: any) => form.setFieldsValue(res.data)).catch(() => {})
  }, [form])

  const save = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      await http.put(`${adminApi.settingsSite}`, values)
      message.success('站点设置已保存')
    } catch (e: any) { message.error(e.message) } finally { setSaving(false) }
  }

  return (
    <div>
      <div className="admin-page-title">站点设置</div>
      <div style={{ background: '#fff', border: '1px solid #E8E8E8', borderRadius: 3, padding: 20, maxWidth: 560 }}>
        <Form form={form} layout="vertical">
          <Form.Item name="site_title" label="网站标题">
            <Input placeholder="如 天上宫阙 · 御礼天成" />
          </Form.Item>
          <Form.Item name="site_slogan" label="品牌标语">
            <Input placeholder="如 御礼天成，礼承宫廷" />
          </Form.Item>
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={save}>保存</Button>
        </Form>
      </div>
    </div>
  )
}
