# =============================================================================
# app/services/soft_delete.py — 软删除 / 回收站通用逻辑
# -----------------------------------------------------------------------------
# 功能：统一软删除、恢复、回收站列表与彻底清空（开发技术文档 §5.7 / §9.4）。
# 说明：products / news / purchase_intents 用 is_deleted 进回收站；
#       产品可见性由 publish_status 控制（is_deleted 仅表示回收站状态）。
# =============================================================================

from sqlalchemy.orm import Session

from app.utils.errors import AppError


def soft_delete(db: Session, model, obj_id: int, admin_name: str = None) -> None:
    """软删除：将记录标记 is_deleted=true（进回收站），不存在则 404。"""
    obj = db.get(model, obj_id)
    if not obj or getattr(obj, "is_deleted", False):
        raise AppError.not_found(f"{model.__name__} 不存在或已在回收站")
    obj.is_deleted = True
    obj.updated_by = admin_name  # 审计：记录操作人
    db.commit()


def restore(db: Session, model, obj_id: int, admin_name: str = None) -> None:
    """回收站恢复：将记录 is_deleted 置回 false。"""
    obj = db.get(model, obj_id)
    if not obj or not getattr(obj, "is_deleted", False):
        raise AppError.not_found(f"{model.__name__} 不存在或不在回收站")
    obj.is_deleted = False
    obj.updated_by = admin_name
    db.commit()


def list_trash(db: Session, model, page: int = 1, page_size: int = 10) -> list:
    """回收站列表：返回 is_deleted=true 的记录（调用方再分页）。"""
    return (
        db.query(model)
        .filter(model.is_deleted.is_(True))
        .order_by(model.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )


def count_trash(db: Session, model) -> int:
    """回收站总条数（供分页 total 使用）。"""
    return db.query(model).filter(model.is_deleted.is_(True)).count()


def empty_trash(db: Session, model, admin_name: str = None) -> int:
    """彻底清空回收站：物理删除全部 is_deleted=true 的记录，返回删除条数。

    危险操作：调用方（前端）必须二次确认后请求。
    """
    result = (
        db.query(model)
        .filter(model.is_deleted.is_(True))
        .delete(synchronize_session=False)
    )
    db.commit()
    return result
