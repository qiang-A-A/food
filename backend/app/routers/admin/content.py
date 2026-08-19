# =============================================================================
# app/routers/admin/content.py — 内容管理（品类/新闻/轮播/关于我们）
# -----------------------------------------------------------------------------
# 功能：实现开发技术文档 §6.3 内容类接口——品类（列表含产品数/增删改/排序）、
#       新闻（列表/增删改/状态/回收站）、轮播图（增删改/启停）、关于我们（读/写）。
# 规则：品类删除须其下无产品（409）；新闻富文本入库前净化。
# =============================================================================

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth.deps import get_current_admin
from app.database import get_db
from app.models import About, Admin, Banner, Category, News, Product
from app.schemas import (
    AboutIn, AboutOut, BannerIn, BannerOut, CategoryIn, CategoryOut,
    CategorySortIn, NewsIn, NewsOut,
)
from app.services.paginate import paginate
from app.services.soft_delete import count_trash, empty_trash, list_trash, restore, soft_delete
from app.security.sanitize_html import clean
from app.utils.errors import AppError
from app.utils.response import ok

router = APIRouter()


# ============================================================
# 品类管理
# ============================================================

@router.get("/categories")
def admin_list_categories(db: Session = Depends(get_db)):
    """品类列表（后台）：含产品数（未删除），按 sort_order 排序。"""
    # 子查询统计各品类未删除产品数（避免 N+1）
    count_subq = (
        select(Product.category_id, func.count(Product.id).label("cnt"))
        .where(Product.is_deleted.is_(False))
        .group_by(Product.category_id)
        .subquery()
    )
    rows = (
        db.query(Category, func.coalesce(count_subq.c.cnt, 0))
        .outerjoin(count_subq, Category.id == count_subq.c.category_id)
        .order_by(Category.sort_order.asc(), Category.id.asc())
        .all()
    )
    items = []
    for cat, cnt in rows:
        item = CategoryOut.model_validate(cat)
        item.product_count = cnt  # 填充冗余字段
        items.append(item)
    return ok(items)


@router.post("/categories", status_code=201)
def admin_create_category(
    body: CategoryIn,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """新增品类：slug 唯一（409）。"""
    if db.query(Category).filter(Category.slug == body.slug).first():
        raise AppError.conflict("slug 已存在")
    cat = Category(**body.model_dump(), created_by=admin.username)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return ok(CategoryOut.model_validate(cat), "品类创建成功")


@router.put("/categories/sort")
def admin_sort_categories(
    body: CategorySortIn,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """品类批量排序：orders=[{id, sort_order}]（品类排序页）。"""
    for order in body.orders:
        cat = db.get(Category, order["id"])
        if cat:
            cat.sort_order = order["sort_order"]
            cat.updated_by = admin.username
    db.commit()
    return ok(message="排序已保存")


@router.put("/categories/{category_id}")
def admin_update_category(
    category_id: int,
    body: CategoryIn,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """编辑品类（slug 修改时查重）。"""
    cat = db.get(Category, category_id)
    if not cat:
        raise AppError.not_found("品类不存在")
    if body.slug != cat.slug:
        exists = db.query(Category).filter(Category.slug == body.slug, Category.id != category_id).first()
        if exists:
            raise AppError.conflict("slug 已存在")
    for key, value in body.model_dump().items():
        setattr(cat, key, value)
    cat.updated_by = admin.username
    db.commit()
    return ok(CategoryOut.model_validate(cat), "品类已更新")


@router.delete("/categories/{category_id}")
def admin_delete_category(
    category_id: int,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """删除品类：其下存在未删除产品则 409（需先迁移产品）。"""
    cat = db.get(Category, category_id)
    if not cat:
        raise AppError.not_found("品类不存在")
    has_products = db.query(Product).filter(
        Product.category_id == category_id, Product.is_deleted.is_(False)
    ).first()
    if has_products:
        raise AppError.conflict("该品类下仍有产品，请先迁移或删除后再操作")
    db.delete(cat)
    db.commit()
    return ok(message="品类已删除")


# ============================================================
# 新闻管理
# ============================================================

@router.get("/news")
def admin_list_news(
    keyword: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """新闻列表（后台）：可见全部状态（含下架），置顶优先。"""
    query = select(News).where(News.is_deleted.is_(False))
    if keyword:
        like = f"%{keyword}%"
        query = query.where(News.title.like(like))
    data = paginate(db, query, page, page_size, order_by=News.is_top.desc())
    return ok({
        "items": [NewsOut.model_validate(n) for n in data["items"]],
        "total": data["total"], "page": data["page"],
        "page_size": data["page_size"], "pages": data["pages"],
    })


@router.post("/news", status_code=201)
def admin_create_news(
    body: NewsIn,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """新增新闻：content 富文本入库前净化（视频 iframe 域名白名单）。"""
    news = News(
        **body.model_dump(),
        content=clean(body.content),
        created_by=admin.username,
    )
    db.add(news)
    db.commit()
    db.refresh(news)
    return ok(NewsOut.model_validate(news), "新闻创建成功")


@router.get("/news/trash")
def admin_list_news_trash(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """新闻回收站列表。"""
    items = list_trash(db, News, page, page_size)
    total = count_trash(db, News)
    from math import ceil
    return ok({
        "items": [NewsOut.model_validate(n) for n in items],
        "total": total, "page": page, "page_size": page_size,
        "pages": ceil(total / page_size) if total else 0,
    })


@router.delete("/news/trash")
def admin_empty_news_trash(
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """新闻回收站彻底清空（危险操作，前端二次确认）。"""
    count = empty_trash(db, News, admin.username)
    return ok({"deleted": count}, f"已清空 {count} 条新闻")


@router.get("/news/{news_id}")
def admin_get_news(news_id: int, db: Session = Depends(get_db)):
    """新闻详情（后台）。"""
    news = db.get(News, news_id)
    if not news or news.is_deleted:
        raise AppError.not_found("新闻不存在")
    return ok(NewsOut.model_validate(news))


@router.put("/news/{news_id}")
def admin_update_news(
    news_id: int,
    body: NewsIn,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """编辑新闻：部分更新 + 富文本净化。"""
    news = db.get(News, news_id)
    if not news or news.is_deleted:
        raise AppError.not_found("新闻不存在")
    data = body.model_dump()
    if data.get("content") is not None:
        data["content"] = clean(data["content"])
    for key, value in data.items():
        setattr(news, key, value)
    news.updated_by = admin.username
    db.commit()
    return ok(NewsOut.model_validate(news), "新闻已更新")


@router.patch("/news/{news_id}/status")
def admin_update_news_status(
    news_id: int,
    body: dict,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """新闻上架/下架：{"is_activate": bool}。"""
    news = db.get(News, news_id)
    if not news or news.is_deleted:
        raise AppError.not_found("新闻不存在")
    is_activate = body.get("is_activate")
    if not isinstance(is_activate, bool):
        raise AppError.param("is_activate 必须为布尔值")
    news.is_activate = is_activate
    news.updated_by = admin.username
    db.commit()
    return ok({"id": news_id, "is_activate": is_activate}, "状态已更新")


@router.delete("/news/{news_id}")
def admin_delete_news(
    news_id: int,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """新闻软删除（进回收站）。"""
    soft_delete(db, News, news_id, admin.username)
    return ok(message="已移入回收站")


@router.post("/news/{news_id}/restore")
def admin_restore_news(
    news_id: int,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """新闻回收站恢复。"""
    restore(db, News, news_id, admin.username)
    return ok(message="新闻已恢复")


# ============================================================
# 轮播图管理
# ============================================================

@router.get("/banners")
def admin_list_banners(db: Session = Depends(get_db)):
    """轮播图列表：按 sort_order 排序。"""
    banners = db.query(Banner).order_by(Banner.sort_order.asc(), Banner.id.asc()).all()
    return ok([BannerOut.model_validate(b) for b in banners])


@router.post("/banners", status_code=201)
def admin_create_banner(
    body: BannerIn,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """新增轮播图。"""
    banner = Banner(**body.model_dump(), created_by=admin.username)
    db.add(banner)
    db.commit()
    db.refresh(banner)
    return ok(BannerOut.model_validate(banner), "轮播图创建成功")


@router.put("/banners/{banner_id}")
def admin_update_banner(
    banner_id: int,
    body: BannerIn,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """编辑轮播图。"""
    banner = db.get(Banner, banner_id)
    if not banner:
        raise AppError.not_found("轮播图不存在")
    for key, value in body.model_dump().items():
        setattr(banner, key, value)
    banner.updated_by = admin.username
    db.commit()
    return ok(BannerOut.model_validate(banner), "轮播图已更新")


@router.patch("/banners/{banner_id}/status")
def admin_update_banner_status(
    banner_id: int,
    body: dict,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """轮播图启停：{"is_activate": bool}。"""
    banner = db.get(Banner, banner_id)
    if not banner:
        raise AppError.not_found("轮播图不存在")
    is_activate = body.get("is_activate")
    if not isinstance(is_activate, bool):
        raise AppError.param("is_activate 必须为布尔值")
    banner.is_activate = is_activate
    banner.updated_by = admin.username
    db.commit()
    return ok({"id": banner_id, "is_activate": is_activate}, "状态已更新")


@router.delete("/banners/{banner_id}")
def admin_delete_banner(
    banner_id: int,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """删除轮播图（物理删除，非软删除——轮播无回收站概念）。"""
    banner = db.get(Banner, banner_id)
    if not banner:
        raise AppError.not_found("轮播图不存在")
    db.delete(banner)
    db.commit()
    return ok(message="轮播图已删除")


# ============================================================
# 关于我们（单行配置 id=1）
# ============================================================

@router.get("/about")
def admin_get_about(db: Session = Depends(get_db)):
    """关于我们配置读取（同 public，含完整编辑态）。"""
    about = db.get(About, 1)
    if not about:
        return ok({"id": 1, "company_intro": None, "brand_story": None, "honors": [], "selling_points": []})
    return ok(AboutOut.model_validate(about))


@router.put("/about")
def admin_update_about(
    body: AboutIn,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """更新关于我们：公司简介/品牌故事（富文本净化）+ 荣誉/卖点（JSON 数组）。"""
    about = db.get(About, 1)
    if not about:
        about = About(id=1, created_by=admin.username)
        db.add(about)
    data = body.model_dump(exclude_unset=True)
    # 富文本字段净化
    if data.get("company_intro") is not None:
        data["company_intro"] = clean(data["company_intro"])
    if data.get("brand_story") is not None:
        data["brand_story"] = clean(data["brand_story"])
    for key, value in data.items():
        setattr(about, key, value)
    about.updated_by = admin.username
    db.commit()
    db.refresh(about)
    return ok(AboutOut.model_validate(about), "关于我们已更新")
