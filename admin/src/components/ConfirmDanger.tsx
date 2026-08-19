// =============================================================================
// src/components/ConfirmDanger.tsx — 危险操作二次确认
// -----------------------------------------------------------------------------
// 功能：删除/清空/禁用等危险操作的二次确认弹窗（UI/UX §5.3 危险按钮 +
//       §6.1 危险操作一律二次确认）。红色确认按钮，防止误操作。
// =============================================================================

import { Modal } from 'antd'

interface ConfirmDangerProps {
  open: boolean
  title: string
  content?: string
  confirmText?: string
  onOk: () => void
  onCancel: () => void
  loading?: boolean
}

export function ConfirmDanger({
  open, title, content, confirmText = '确认删除', onOk, onCancel, loading,
}: ConfirmDangerProps) {
  return (
    <Modal
      open={open}
      title={title}
      onOk={onOk}
      onCancel={onCancel}
      confirmLoading={loading}
      okText={confirmText}
      cancelText="取消"
      // 危险操作红色确定按钮（UI/UX §5.3）
      okButtonProps={{ danger: true }}
    >
      <p style={{ fontSize: 13, color: '#333' }}>{content ?? '此操作不可撤销，请确认是否继续？'}</p>
    </Modal>
  )
}
