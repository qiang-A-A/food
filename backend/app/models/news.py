# =============================================================================
# app/models/news.py — 新闻资讯模型
# -----------------------------------------------------------------------------
# 功能：对应数据库文档 §3.6 news 表。content 富文本（支持图片/视频，仅超管
#       可插入视频）；is_top 置顶；is_activate 上架控制；软删除进回收站。
# =============================================================================

from sqlalchemy import Boolean, DateTime, Index, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime  # 标准库：时间类型

from app.models.base import TimestampMixin
from app.database import Base


class News(TimestampMixin, Base):
    """新闻资讯：前台列表按 (is_activate, is_deleted) 过滤。"""

    __tablename__ = "news"
    # 复合索引：前台新闻列表热点查询（发布日期倒序 + 上架 + 未删除）
    __table_args__ = (
        Index("ix_news_publish", "publish_date", "is_activate", "is_deleted"),
        {"comment": "新闻资讯"},
    )

    # 标题（必填）
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    # 摘要（列表页展示）
    summary: Mapped[str | None] = mapped_column(String(300), nullable=True)
    # 封面 URL
    cover_image: Mapped[str | None] = mapped_column(String(512), nullable=True)
    # 富文本正文（HTML，含图片/视频；入库前 nh3 净化）
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    # 发布日期（列表/详情展示，索引 ix_news_publish 首列）
    publish_date: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.now, server_default=func.now()
    )
    # 置顶（列表优先展示）
    is_top: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0")
    # 上架/下架（false 前台不可见）
    is_activate: Mapped[bool] = mapped_column(Boolean, default=True, server_default="1")
    # 软删除（回收站）
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0")
