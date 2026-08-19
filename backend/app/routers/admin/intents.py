# =============================================================================
# app/routers/admin/intents.py — 团购意向管理（后台）
# -----------------------------------------------------------------------------
# 功能：实现开发技术文档 §6.3 意向管理——列表（筛选/搜索/时间排序）/详情
#       （含提交用户手机号/昵称）/状态流转（状态机校验）/软删除。
# =============================================================================

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

from app.auth.deps import get_current_admin
from app.database import get_db
from app.models import Admin, PurchaseIntent, User
from app.schemas import IntentAdminOut, IntentStatusIn
from app.services.intent_service import transition
from app.services.paginate import paginate
from app.services.soft_delete import soft_delete
from app.utils.errors import AppError
from app.utils.response import ok

router = APIRouter()


def intent_to_out(i: PurchaseIntent) -> IntentAdminOut:
    """意向 ORM → 后台输出模型（含提交用户手机号/昵称）。"""
    data = {
        "id": i.id, "name": i.name, "phone": i.phone,
        "company": i.company, "requirement": i.requirement,
        "quantity_range": i.quantity_range,
        "source": i.source, "status": i.status,
        "created_at": i.created_at,
        "user_id": i.user_id,
        "user_phone": i.user.phone if i.user else None,
        "user_nickname": i.user.nickname if i.user else None,
    }
    return IntentAdminOut.model_validate(data)


@router.get("")
def admin_list_intents(
    status: str | None = Query(None, pattern=r"^(pending|contacted|deal|closed)$"),
    keyword: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """意向列表：按状态筛选 + 关键词（姓名/电话/公司）搜索 + 时间倒序。"""
    query = (
        select(PurchaseIntent)
        .options(joinedload(PurchaseIntent.user))
        .where(PurchaseIntent.is_deleted.is_(False))
    )
    if status:
        query = query.where(PurchaseIntent.status == status)
    if keyword:
        like = f"%{keyword}%"
        query = query.where(
            or_(
                PurchaseIntent.name.like(like),
                PurchaseIntent.phone.like(like),
                PurchaseIntent.company.like(like),
            )
        )
    data = paginate(db, query, page, page_size, order_by=PurchaseIntent.created_at.desc())
    return ok({
        "items": [intent_to_out(i) for i in data["items"]],
        "total": data["total"], "page": data["page"],
        "page_size": data["page_size"], "pages": data["pages"],
    })


@router.get("/{intent_id}")
def admin_get_intent(intent_id: int, db: Session = Depends(get_db)):
    """意向详情（含提交会员信息）。"""
    intent = (
        db.query(PurchaseIntent)
        .options(joinedload(PurchaseIntent.user))
        .filter(PurchaseIntent.id == intent_id, PurchaseIntent.is_deleted.is_(False))
        .first()
    )
    if not intent:
        raise AppError.not_found("意向不存在")
    return ok(intent_to_out(intent))


@router.put("/{intent_id}")
def admin_update_intent_status(
    intent_id: int,
    body: IntentStatusIn,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """状态流转：pending→contacted→deal/closed；pending→closed（状态机校验，非法 422）。"""
    intent = transition(db, intent_id, body.status)
    intent.updated_by = admin.username
    db.commit()
    return ok({"id": intent_id, "status": body.status}, "状态已更新")


@router.delete("/{intent_id}")
def admin_delete_intent(
    intent_id: int,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """删除意向（软删除，无效意向清理）。"""
    soft_delete(db, PurchaseIntent, intent_id, admin.username)
    return ok(message="意向已删除")
