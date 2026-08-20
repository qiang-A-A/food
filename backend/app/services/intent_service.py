# =============================================================================
# app/services/intent_service.py — 团购意向状态机
# -----------------------------------------------------------------------------
# 功能：实现意向状态流转规则（开发技术文档 §9.3 + 2026-08-20 扩展）：
#       pending → contacted → deal/closed；pending → closed（直接关闭）；
#       用户撤销：pending/contacted → revoked（已撤销）；
#       revoked/deal 终态仅可删除（进回收站）；deleted 仅可恢复/永久删除。
#       非法流转（如 deal → pending）抛 422 状态流转非法。
# =============================================================================

from sqlalchemy.orm import Session

from app.models import PurchaseIntent
from app.utils.errors import AppError

# 状态机合法流转表：{当前状态: {允许的下一个状态集合}}
ALLOWED_TRANSITIONS = {
    "pending": {"contacted", "closed", "revoked"},  # 待跟进 → 已联系/直接关闭/用户撤销
    "contacted": {"deal", "closed", "revoked"},     # 已联系 → 已成交/已关闭/用户撤销
    "deal": set(),                                  # 终态：已成交（仅可删除）
    "closed": set(),                                # 终态：已关闭
    "revoked": set(),                               # 终态：已撤销（仅可删除）
    "deleted": set(),                               # 回收站内（仅可恢复/永久删除）
}

# 正常列表展示的状态（回收站外）；其余（deleted）在回收站展示
ACTIVE_STATUSES = {"pending", "contacted", "deal", "closed", "revoked"}


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
