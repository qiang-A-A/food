# =============================================================================
# app/models/about.py — 关于我们配置模型（单行）
# -----------------------------------------------------------------------------
# 功能：对应数据库文档 §3.8 about 表。全站唯一单行配置（固定 id=1），
#       company_intro（公司简介）/ brand_story（品牌故事）/ honors（荣誉数组）/
#       selling_points（卖点数组，5 项）。不做删除仅更新。
# =============================================================================

from sqlalchemy import JSON, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import TimestampMixin
from app.database import Base

# JSON 字段类型：PG 用 JSONB，SQLite 用 TEXT（数据库文档 §1.4 类型映射）
JSON_TYPE = JSON().with_variant(JSONB, "postgresql")


class About(TimestampMixin, Base):
    """关于我们配置：固定单行（id=1），后台「关于我们」模块的数据源。"""

    __tablename__ = "about"
    __table_args__ = ({"comment": "关于我们配置（单行）"},)

    # 公司简介（富文本 HTML）
    company_intro: Mapped[str | None] = mapped_column(Text, nullable=True)
    # 品牌故事/御膳渊源（富文本 HTML，PRD F-2 新增板块）
    brand_story: Mapped[str | None] = mapped_column(Text, nullable=True)
    # 荣誉数组：[{title, desc, icon}, ...]（后台荣誉资质管理）
    honors: Mapped[list] = mapped_column(JSON_TYPE, default=list, server_default="[]")
    # 卖点数组：[{title, desc, icon}, ...]（5 项，对应前台核心卖点区）
    selling_points: Mapped[list] = mapped_column(JSON_TYPE, default=list, server_default="[]")
    # 工厂与工坊数组：[{title, desc, image}, ...]（2026-08-21 新增：
    # 前台「工厂与工坊」卡片数据源，image 为后台上传的实景图 URL）
    workshop: Mapped[list] = mapped_column(JSON_TYPE, default=list, server_default="[]")
