# =============================================================================
# app/models/category.py — 品类（系列）模型
# -----------------------------------------------------------------------------
# 功能：对应数据库文档 §3.3 categories 表。种子 5 个默认品类（御点珍馐/节令
#       礼盒/宫廷茶点/商务套装/高端定制），slug 唯一供前台筛选路由使用。
# =============================================================================

from sqlalchemy import Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import TimestampMixin
from app.database import Base


class Category(TimestampMixin, Base):
    """品类（系列）：一个品类下多个礼盒（一对多）。"""

    __tablename__ = "categories"
    # 表级约束：slug 唯一索引（uk_categories_slug，前台筛选路由）
    __table_args__ = (
        Index("uk_categories_slug", "slug", unique=True),
        {"comment": "品类（系列）"},
    )

    # 品类名（如 御点珍馐）
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    # URL 标识（唯一：/products?category_slug=yudian）
    slug: Mapped[str] = mapped_column(String(50), nullable=False)
    # 品类封面（可空，后台可上传）
    cover_image: Mapped[str | None] = mapped_column(String(512), nullable=True)
    # 排序（越小越前，对应品类排序功能）
    sort_order: Mapped[int] = mapped_column(default=0, server_default="0")

    # ORM 关系：该品类下的产品集合（backref 供 product 侧使用）
    products: Mapped[list["Product"]] = relationship(
        "Product", back_populates="category"
    )
