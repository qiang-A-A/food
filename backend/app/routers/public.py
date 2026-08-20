# =============================================================================
# app/routers/public.py — 前台公开接口（无需登录，8 个）
# -----------------------------------------------------------------------------
# 功能：实现开发技术文档 §6.1 全部公开接口——首页聚合 / 产品列表与详情 /
#       品类 / 新闻列表与详情 / 关于我们 / 联系方式。
# 规则：产品仅返回 publish_status='on' 且未删除；新闻仅上架且未删除。
# =============================================================================

import re  # 标准库：摘要纯文本化（审计修复）

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import About, Banner, Category, News, Product, Setting
from app.schemas import (
    AboutOut, BannerOut, CategoryOut, NewsOut, ProductOut,
)
from app.services.paginate import paginate
from app.utils.errors import AppError
from app.utils.response import ok

router = APIRouter()


def product_to_out(p: Product) -> ProductOut:
    """产品 ORM → 输出模型（填充 category_name，避免 N+1）。"""
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


# ---------------- 首页聚合 ----------------

@router.get("/home")
def get_home(db: Session = Depends(get_db)):
    """首页聚合数据：轮播/卖点/精选礼盒/最新新闻/关于摘要（开发技术文档 §6.1）。"""
    # 1) 轮播图：启用且按 sort_order 升序
    banners = db.query(Banner).filter(Banner.is_activate.is_(True)).order_by(Banner.sort_order).all()
    # 2) 核心卖点：来自 about 单行配置的 selling_points
    about = db.get(About, 1)
    # 3) 精选礼盒：上架 + 未删除 + 精选，最多 8 个
    featured = (
        db.query(Product)
        .options(joinedload(Product.category))
        .filter(
            Product.publish_status == "on",
            Product.is_deleted.is_(False),
            Product.is_featured.is_(True),
        )
        .order_by(Product.sort_order.asc(), Product.created_at.desc())
        .limit(8)
        .all()
    )
    # 4) 最新新闻：上架 + 未删除，最多 3 条
    latest_news = (
        db.query(News)
        .filter(News.is_activate.is_(True), News.is_deleted.is_(False))
        .order_by(News.is_top.desc(), News.publish_date.desc())
        .limit(3)
        .all()
    )
    # 5) 品牌故事摘要（首页"关于我们预览"数据源）
    # 审计修复：富文本直接切片会截断 HTML 标签（如 <p> 截成 <p>），
    # 先用 nh3 转纯文本（仅去标签，不做净化）再截断，保证首页展示干净摘要。
    story_text = re.sub(r"<[^>]+>", "", about.brand_story or about.company_intro or "")
    about_brief = (story_text.strip() or "")[:100]

    return ok({
        "banners": [BannerOut.model_validate(b) for b in banners],
        "selling_points": about.selling_points if about else [],
        "featured_products": [product_to_out(p) for p in featured],
        "latest_news": [NewsOut.model_validate(n) for n in latest_news],
        "about_brief": about_brief,
    })


# ---------------- 产品列表 / 详情 ----------------

@router.get("/products")
def list_products(
    category_id: int | None = None,
    category_slug: str | None = None,
    keyword: str | None = None,
    is_featured: bool | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(8, ge=1, le=50),
    sort: str = Query("-created_at", description="排序：field 升序 / -field 降序"),
    db: Session = Depends(get_db),
):
    """产品列表（前台）：仅上架未删除，支持品类/关键词/精选筛选与分页排序。"""
    query = (
        select(Product)
        .options(joinedload(Product.category))
        .where(Product.publish_status == "on", Product.is_deleted.is_(False))
    )
    # 品类筛选：按 id 或 slug（slug 需 join categories）
    if category_id is not None:
        query = query.where(Product.category_id == category_id)
    if category_slug:
        query = query.join(Category).where(Category.slug == category_slug)
    # 关键词搜索：名称 / 产品编号 / 型号
    if keyword:
        like = f"%{keyword}%"
        query = query.where(
            or_(Product.name.like(like), Product.product_no.like(like), Product.model.like(like))
        )
    # 精选筛选
    if is_featured is not None:
        query = query.where(Product.is_featured.is_(is_featured))

    # 排序映射（白名单，防注入）
    sort_map = {
        "created_at": Product.created_at,
        "-created_at": Product.created_at.desc(),
        "sort_order": Product.sort_order,
        "-sort_order": Product.sort_order.desc(),
        "price": Product.price,
        "-price": Product.price.desc(),
    }
    order = sort_map.get(sort, Product.created_at.desc())

    data = paginate(db, query, page, page_size, order_by=order)
    return ok({
        "items": [product_to_out(p) for p in data["items"]],
        "total": data["total"], "page": data["page"],
        "page_size": data["page_size"], "pages": data["pages"],
    })


@router.get("/products/{product_id}")
def get_product(product_id: int, db: Session = Depends(get_db)):
    """产品详情（前台）：仅上架未删除，否则 404（开发技术文档 §6.1）。"""
    product = (
        db.query(Product)
        .options(joinedload(Product.category))
        .filter(
            Product.id == product_id,
            Product.publish_status == "on",
            Product.is_deleted.is_(False),
        )
        .first()
    )
    if not product:
        raise AppError.not_found("产品不存在或已下架")
    return ok(product_to_out(product))


# ---------------- 品类列表 ----------------

@router.get("/categories")
def list_categories(db: Session = Depends(get_db)):
    """品类列表：仅启用项，按 sort_order 升序（前台筛选 Tab 数据源）。"""
    cats = db.query(Category).filter(Category.is_activate.is_(True)).order_by(Category.sort_order).all()
    return ok([CategoryOut.model_validate(c) for c in cats])


# ---------------- 新闻列表 / 详情 ----------------

@router.get("/news")
def list_news(
    keyword: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """新闻列表（前台）：仅上架未删除，置顶优先 + 发布日期倒序。"""
    query = select(News).where(News.is_activate.is_(True), News.is_deleted.is_(False))
    if keyword:
        like = f"%{keyword}%"
        query = query.where(News.title.like(like))
    data = paginate(db, query, page, page_size, order_by=News.is_top.desc())
    return ok({
        "items": [NewsOut.model_validate(n) for n in data["items"]],
        "total": data["total"], "page": data["page"],
        "page_size": data["page_size"], "pages": data["pages"],
    })


@router.get("/news/{news_id}")
def get_news(news_id: int, db: Session = Depends(get_db)):
    """新闻详情（前台）：仅上架未删除。"""
    news = (
        db.query(News)
        .filter(News.id == news_id, News.is_activate.is_(True), News.is_deleted.is_(False))
        .first()
    )
    if not news:
        raise AppError.not_found("新闻不存在")
    return ok(NewsOut.model_validate(news))


# ---------------- 关于我们 / 联系方式 ----------------

@router.get("/about")
def get_about(db: Session = Depends(get_db)):
    """关于我们内容（含品牌故事）：about 单行配置（id=1）。"""
    about = db.get(About, 1)
    if not about:
        return ok({"company_intro": None, "brand_story": None, "honors": [], "selling_points": []})
    return ok(AboutOut.model_validate(about))


@router.get("/contact")
def get_contact(db: Session = Depends(get_db)):
    """联系方式（来自 settings 表）：前台联系我们页与页脚数据源。"""
    settings_rows = db.query(Setting).all()
    data = {s.key: s.value for s in settings_rows}
    # 去除 JSON 字符串的引号（settings.value 存 JSON 字符串，如 "400-000-0000"）
    clean = {}
    for k, v in data.items():
        if isinstance(v, str) and v.startswith('"') and v.endswith('"'):
            clean[k] = v[1:-1]  # 剥掉首尾引号
        else:
            clean[k] = v
    # 固定字段映射（缺失时返回 None）
    keys = ["contact_phone", "contact_email", "contact_address",
            "contact_wechat_qr", "map_url", "footer_icp", "footer_sc_license"]
    return ok({k: clean.get(k) for k in keys})
