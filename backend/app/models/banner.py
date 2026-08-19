# =============================================================================
# app/models/banner.py — 轮播图模型
# -----------------------------------------------------------------------------
# 功能：对应数据库文档 §3.7 banners 表。首页 Hero 轮播（后台配置 3-5 张），
#       sort_order 排序、is_activate 启停控制。
# =============================================================================

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import TimestampMixin
from app.database import Base


class Banner(TimestampMixin, Base):
    """首页轮播图：启用且按 sort_order 升序展示。"""

    __tablename__ = "banners"
    __table_args__ = ({"comment": "轮播图"},)

    # 标题（可空，如 中秋主视觉）
    title: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # 图片 URL（必填）
    image: Mapped[str] = mapped_column(String(512), nullable=False)
    # 跳转链接（可选，如 /products）
    link_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    # 排序（越小越前）
    sort_order: Mapped[int] = mapped_column(default=0, server_default="0")
    # 启用/停用
    is_activate: Mapped[bool] = mapped_column(default=True, server_default="1")
