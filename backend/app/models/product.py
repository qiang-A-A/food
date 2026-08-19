# =============================================================================
# app/models/product.py — 糕点礼盒模型（核心业务表）
# -----------------------------------------------------------------------------
# 功能：对应数据库文档 §3.4 products 表。字段覆盖食品合规（配料表/净含量/
#       保质期/储存/过敏原）与礼赠属性（系列/产品编号/规格参数 JSON/最低价）；
#       发布状态三态 on/off/draft；软删除进回收站。
# 说明：JSON 字段使用「JSONB(PG) / TEXT(SQLite)」方言自适应（数据库文档 §1.4）。
# =============================================================================

from sqlalchemy import JSON, Boolean, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import TimestampMixin
from app.database import Base

# JSON 字段类型：PostgreSQL 使用原生 JSONB，SQLite 退化为 TEXT（由 SQLAlchemy 序列化）
JSON_TYPE = JSON().with_variant(JSONB, "postgresql")


class Product(TimestampMixin, Base):
    """糕点礼盒：所属品类一对多；前台仅展示 publish_status='on' 且未删除。"""

    __tablename__ = "products"
    # 索引：产品编号唯一（uk_products_no）+ 前台可见产品热点查询复合索引
    __table_args__ = (
        Index("uk_products_no", "product_no", unique=True),
        Index("ix_products_publish_deleted", "publish_status", "is_deleted"),
        {"comment": "糕点礼盒"},
    )

    # ---- 归属与标识 ----
    # 所属品类外键（必填，索引 ix_products_category）
    category_id: Mapped[int] = mapped_column(
        ForeignKey("categories.id"), nullable=False, index=True
    )
    # 所属系列（如 胡桃禮，PRD v2.2 新增）
    series: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # 产品编号（唯一 uk_products_no，如 GDT-2026-001）
    product_no: Mapped[str] = mapped_column(String(50), nullable=False)
    # 产品名称
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    # 型号/规格标识（如 GDT-001）
    model: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # ---- 图片 ----
    # 封面图片 URL
    cover_image: Mapped[str | None] = mapped_column(String(512), nullable=True)
    # 其它图片 URL 数组（JSON，多图+拖拽排序，PRD v2.2 封面图+其它图）
    product_images: Mapped[list] = mapped_column(JSON_TYPE, default=list, server_default="[]")
    # 礼盒包装图 URL 数组（JSON）
    box_images: Mapped[list] = mapped_column(JSON_TYPE, default=list, server_default="[]")

    # ---- 描述与规格 ----
    # 产品描述（富文本 HTML，入库前经 nh3 净化）
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    # 规格参数 JSON 串：[{"key":"净含量","value":"480g"}, ...]（详情页表格渲染）
    spec_params: Mapped[list] = mapped_column(JSON_TYPE, default=list, server_default="[]")
    # 规格（简要，如 8 枚装）
    spec: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # 口味（如 枣泥/豆沙）
    flavor: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # ---- 食品合规（录入必填校验，PRD 风险项）----
    ingredients: Mapped[str | None] = mapped_column(Text, nullable=True)      # 配料表
    net_weight: Mapped[str | None] = mapped_column(String(50), nullable=True) # 净含量
    shelf_life: Mapped[str | None] = mapped_column(String(50), nullable=True) # 保质期
    storage: Mapped[str | None] = mapped_column(String(100), nullable=True)   # 储存条件
    allergen: Mapped[str | None] = mapped_column(String(200), nullable=True)  # 过敏原提示
    box_spec: Mapped[str | None] = mapped_column(String(200), nullable=True)  # 礼盒规格

    # ---- 价格与展示 ----
    # 最低价（字符串存储「¥388」，前台展示「¥xxx 起」，完整报价线下洽谈）
    price: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # 是否精选（首页/列表红 Tag）
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0")
    # 发布状态三态（on/off/draft），复合索引 ix_products_publish_deleted
    publish_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="draft", server_default="draft"
    )
    # 软删除（进回收站），复合索引 ix_products_publish_deleted 第二列
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0")
    # 排序
    sort_order: Mapped[int] = mapped_column(default=0, server_default="0")

    # ORM 关系：所属品类（懒加载）
    category: Mapped["Category"] = relationship("Category", back_populates="products")
