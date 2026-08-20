# =============================================================================
# app/routers/admin/intents.py — 团购意向管理（后台）
# -----------------------------------------------------------------------------
# 功能：意向列表（筛选/搜索/时间排序）/详情（含提交用户手机号/昵称、来源
#       产品名）/状态流转（状态机校验）/删除（进回收站，status=deleted）/
#       回收站（列表/恢复→pending/永久删除）。
# 2026-08-20 扩展：source=product 显示「产品详情（产品名）」；用户撤销的
#       意向状态显示 revoked（已撤销）；删除统一进回收站。
# 注意：/trash 必须在 /{intent_id} 之前声明（int 转换器误拦截）。
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
from app.utils.errors import AppError
from app.utils.response import ok

router = APIRouter()

# 正常列表（回收站外）的状态筛选项；deleted 在回收站展示
LIST_STATUS_PATTERN = r"^(pending|contacted|deal|closed|revoked)$"


def intent_to_out(i: PurchaseIntent) -> IntentAdminOut:
    """意向 ORM → 后台输出模型（含提交用户信息 + 来源产品名）。"""
    data = {
        "id": i.id, "name": i.name, "phone": i.phone,
        "company": i.company, "requirement": i.requirement,
        "quantity_range": i.quantity_range,
        "source": i.source,
        "product_id": i.product_id,
        "product_name": i.product.name if i.product else None,
        "status": i.status,
        "created_at": i.created_at,
        "user_id": i.user_id,
        "user_phone": i.user.phone if i.user else None,
        "user_nickname": i.user.nickname if i.user else None,
    }
    return IntentAdminOut.model_validate(data)


@router.get("")
def admin_list_intents(
    status: str | None = Query(None, pattern=LIST_STATUS_PATTERN),
    keyword: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """意向列表（回收站外）：按状态筛选 + 关键词（姓名/电话/公司）搜索 + 时间倒序。"""
    query = (
        select(PurchaseIntent)
        .options(joinedload(PurchaseIntent.user), joinedload(PurchaseIntent.product))
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


@router.get("/trash")
def admin_intent_trash(
    keyword: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """意向回收站：用户/管理员删除的意向（is_deleted=true，状态显示已删除）。"""
    query = (
        select(PurchaseIntent)
        .options(joinedload(PurchaseIntent.user), joinedload(PurchaseIntent.product))
        .where(PurchaseIntent.is_deleted.is_(True))
    )
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
    """意向详情（含提交会员信息、来源产品名）。"""
    intent = (
        db.query(PurchaseIntent)
        .options(joinedload(PurchaseIntent.user), joinedload(PurchaseIntent.product))
        .filter(PurchaseIntent.id == intent_id)
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
    """状态流转：pending→contacted→deal/closed/revoked（状态机校验，非法 422）。"""
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
    """删除意向（任意状态）：标记已删除并进回收站（status=deleted + is_deleted=true）。"""
    intent = db.get(PurchaseIntent, intent_id)
    if not intent:
        raise AppError.not_found("意向不存在")
    if intent.is_deleted:
        raise AppError.conflict("意向已在回收站")
    intent.status = "deleted"
    intent.is_deleted = True
    intent.updated_by = admin.username
    db.commit()
    return ok(message="意向已删除，可在回收站恢复")


@router.post("/{intent_id}/restore")
def admin_restore_intent(
    intent_id: int,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """恢复意向：出回收站并重置为「待跟进」（详情字段保持不变，未人工更改则原样）。"""
    intent = db.get(PurchaseIntent, intent_id)
    if not intent or not intent.is_deleted:
        raise AppError.not_found("回收站中不存在该意向")
    intent.is_deleted = False
    intent.status = "pending"  # 需求：恢复后个人中心与后台均显示待跟进
    intent.updated_by = admin.username
    db.commit()
    return ok({"id": intent_id, "status": "pending"}, "意向已恢复，状态为待跟进")


@router.delete("/{intent_id}/permanent")
def admin_permanent_delete_intent(
    intent_id: int,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """永久删除意向（物理删除，仅回收站内可执行）。"""
    intent = db.get(PurchaseIntent, intent_id)
    if not intent or not intent.is_deleted:
        raise AppError.not_found("回收站中不存在该意向")
    db.delete(intent)
    db.commit()
    return ok(message="意向已永久删除")
