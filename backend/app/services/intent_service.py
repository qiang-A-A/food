# =============================================================================
# app/services/intent_service.py — 团购意向状态机
# -----------------------------------------------------------------------------
# 功能：实现意向状态流转规则（开发技术文档 §9.3）：
#       pending → contacted → deal/closed；pending → closed（直接关闭）。
#       非法流转（如 deal → pending）抛 422 状态流转非法。
# =============================================================================

from sqlalchemy.orm import Session

from app.models import PurchaseIntent
from app.utils.errors import AppError

# 状态机合法流转表：{当前状态: {允许的下一个状态集合}}
ALLOWED_TRANSITIONS = {
    "pending": {"contacted", "closed"},   # 待跟进 → 已联系 / 直接关闭
    "contacted": {"deal", "closed"},      # 已联系 → 已成交 / 已关闭
    "deal": set(),                        # 终态：已成交（不可再流转）
    "closed": set(),                      # 终态：已关闭
}


def transition(db: Session, intent_id: int, target_status: str) -> PurchaseIntent:
    """执行意向状态流转：校验合法性后更新并返回意向对象。"""
    intent = db.get(PurchaseIntent, intent_id)
    if not intent or intent.is_deleted:
        raise AppError.not_found("意向不存在")

    # 目标状态必须是已知枚举
    if target_status not in ALLOWED_TRANSITIONS:
        raise AppError.param("未知的意向状态")

    # 校验流转合法性（非法 → 422）
    if target_status not in ALLOWED_TRANSITIONS.get(intent.status, set()):
        raise AppError.invalid_transition(
            f"不允许从「{intent.status}」流转到「{target_status}」"
        )

    intent.status = target_status
    db.commit()
    db.refresh(intent)
    return intent
