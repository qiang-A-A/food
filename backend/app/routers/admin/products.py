# =============================================================================
# app/routers/admin/products.py — 产品管理（后台）
# -----------------------------------------------------------------------------
# 功能：实现开发技术文档 §6.3 产品管理全部接口——列表（可见全部状态）/
#       新增/详情/编辑/发布状态切换/软删除/批量操作/回收站（恢复+清空+列表）。
# 规则：product_no 唯一；食品合规字段必填（Pydantic 校验）；软删除进回收站。
# =============================================================================

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

from app.auth.deps import get_current_admin
from app.database import get_db
from app.models import Admin, Category, Product
from app.schemas import (
    BatchActionIn, ProductCreateIn, ProductOut, ProductStatusIn, ProductUpdateIn,
)
from app.services.paginate import paginate
from app.services.soft_delete import count_trash, empty_trash, list_trash, restore, soft_delete
from app.security.sanitize_html import clean
from app.utils.errors import AppError
from app.utils.response import ok

router = APIRouter()


def product_to_out(p: Product) -> ProductOut:
    """产品 ORM → 输出模型（后台列表同样填充 category_name）。"""
    data = {
        "id": p.id, "category_id": p.category_id,
        "category_name": p.category.name if p.category else None,
        "series": p.series, "product_no": p.product_no, "name": p.name,
        "model": p.model, "cover_image": p.cover_image,
        "product_images": p.product_images or [],
        "box_images": p.box_images or [],
        "description": p.description,
        "spec_params": p.spec_params or [],
        "spec": p.spec, "flavor": p.flavor,
        "ingredients": p.ingredients, "net_weight": p.net_weight,
        "shelf_life": p.shelf_life, "storage": p.storage,
        "allergen": p.allergen, "box_spec": p.box_spec,
        "price": p.price, "is_featured": p.is_featured,
        "publish_status": p.publish_status, "sort_order": p.sort_order,
        "created_at": p.created_at,
    }
    return ProductOut.model_validate(data)


def get_product_or_404(db: Session, product_id: int) -> Product:
    """按 id 取产品（未删除），不存在则 404。"""
    product = db.get(Product, product_id)
    if not product or product.is_deleted:
        raise AppError.not_found("产品不存在")
    return product


@router.get("")
def admin_list_products(
    keyword: str | None = None,
    category_id: int | None = None,
    series: str | None = None,
    publish_status: str | None = Query(None, pattern=r"^(on|off|draft)$"),
    is_featured: bool | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """产品列表（后台）：可见全部状态（含草稿/下架），支持搜索/筛选/分页。"""
    query = (
        select(Product)
        .options(joinedload(Product.category))
        .where(Product.is_deleted.is_(False))
    )
    # 关键词：名称 / 产品编号 / 型号
    if keyword:
        like = f"%{keyword}%"
        query = query.where(or_(Product.name.like(like), Product.product_no.like(like), Product.model.like(like)))
    # 筛选
    if category_id is not None:
        query = query.where(Product.category_id == category_id)
    if series:
        query = query.where(Product.series == series)
    if publish_status:
        query = query.where(Product.publish_status == publish_status)
    if is_featured is not None:
        query = query.where(Product.is_featured.is_(is_featured))

    data = paginate(db, query, page, page_size, order_by=Product.created_at.desc())
    return ok({
        "items": [product_to_out(p) for p in data["items"]],
        "total": data["total"], "page": data["page"],
        "page_size": data["page_size"], "pages": data["pages"],
    })


@router.post("", status_code=201)
def admin_create_product(
    body: ProductCreateIn,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """新增产品：编号唯一校验；富文本净化；合规字段由 schema 强制必填。"""
    # 品类必须存在
    if not db.get(Category, body.category_id):
        raise AppError.param("所选品类不存在")
    # 产品编号唯一（409）
    if db.query(Product).filter(Product.product_no == body.product_no).first():
        raise AppError.conflict("产品编号已存在")
    product = Product(
        **body.model_dump(),
        description=clean(body.description),  # 富文本入库前净化（防 XSS）
        created_by=admin.username,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return ok(product_to_out(product), "产品创建成功")


@router.get("/trash")
def admin_list_product_trash(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """回收站列表：分页展示已删除产品。"""
    items = list_trash(db, Product, page, page_size)
    total = count_trash(db, Product)
    from math import ceil
    return ok({
        "items": [product_to_out(p) for p in items],
        "total": total, "page": page, "page_size": page_size,
        "pages": ceil(total / page_size) if total else 0,
    })


@router.delete("/trash")
def admin_empty_product_trash(
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """彻底清空回收站：物理删除（危险操作，前端二次确认）。"""
    count = empty_trash(db, Product, admin.username)
    return ok({"deleted": count}, f"已清空 {count} 条产品")


@router.get("/{product_id}")
def admin_get_product(product_id: int, db: Session = Depends(get_db)):
    """产品详情（后台）：可见全部状态。"""
    product = (
        db.query(Product)
        .options(joinedload(Product.category))
        .filter(Product.id == product_id, Product.is_deleted.is_(False))
        .first()
    )
    if not product:
        raise AppError.not_found("产品不存在")
    return ok(product_to_out(product))


@router.put("/{product_id}")
def admin_update_product(
    product_id: int,
    body: ProductUpdateIn,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """编辑产品：部分更新（None 字段不更新）；富文本净化；编号唯一校验。"""
    product = get_product_or_404(db, product_id)
    # 编号修改时查重（排除自身）
    if body.product_no and body.product_no != product.product_no:
        exists = db.query(Product).filter(
            Product.product_no == body.product_no, Product.id != product_id
        ).first()
        if exists:
            raise AppError.conflict("产品编号已存在")
    # 应用变更（排除 None 字段）
    data = body.model_dump(exclude_unset=True)
    if "description" in data and data["description"] is not None:
        data["description"] = clean(data["description"])  # 净化富文本
    for key, value in data.items():
        setattr(product, key, value)
    product.updated_by = admin.username
    db.commit()
    db.refresh(product)
    return ok(product_to_out(product), "产品已更新")


@router.patch("/{product_id}/status")
def admin_update_product_status(
    product_id: int,
    body: ProductStatusIn,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """发布状态切换：上架/下架/草稿（三态，PRD v2.2）。"""
    product = get_product_or_404(db, product_id)
    product.publish_status = body.publish_status
    product.updated_by = admin.username
    db.commit()
    return ok({"id": product_id, "publish_status": body.publish_status}, "状态已更新")


@router.delete("/{product_id}")
def admin_delete_product(
    product_id: int,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """软删除：进回收站（可恢复）。"""
    soft_delete(db, Product, product_id, admin.username)
    return ok(message="已移入回收站")


@router.post("/batch")
def admin_batch_products(
    body: BatchActionIn,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """批量操作：ids + action（on/off/draft/delete），对未删除产品生效。"""
    products = db.query(Product).filter(Product.id.in_(body.ids), Product.is_deleted.is_(False)).all()
    if body.action == "delete":
        # 批量软删除（进回收站）
        for p in products:
            p.is_deleted = True
            p.updated_by = admin.username
    else:
        # 批量切换发布状态
        for p in products:
            p.publish_status = body.action
            p.updated_by = admin.username
    db.commit()
    return ok({"affected": len(products)}, f"批量{body.action}完成")


@router.post("/{product_id}/restore")
def admin_restore_product(
    product_id: int,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """回收站恢复。"""
    restore(db, Product, product_id, admin.username)
    return ok(message="产品已恢复")
