# =============================================================================
# app/models/chat.py — 前台用户与后台管理员聊天消息模型
# -----------------------------------------------------------------------------
# 功能：对应数据库设计文档 §3.12 chat_messages 表（本次新增）。承载「咨询顾问」
#       聊天场景：前台会员从产品详情页发起咨询 → 后台管理员在消息管理模块回复。
#       设计要点：
#        · 单表会话：按 user_id 维度聚合会话（每用户一个会话，无独立会话表）
#        · product_id：记录消息从哪款产品页面发起（产品删除后由外键约束保护，
#          后台列表展示来源产品名）
#        · sender 方向标记：user（前台会员发） / admin（管理员回复）
#        · 双侧未读：is_read_admin 给后台角标，is_read_user 给前台未读提示
# =============================================================================

from sqlalchemy import Boolean, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import TimestampMixin
from app.database import Base


class ChatMessage(TimestampMixin, Base):
    """聊天消息：会员发消息 / 管理员回复，同一张表按方向区分。"""

    __tablename__ = "chat_messages"
    # 索引：会话聚合（user_id + 时间倒序）+ 后台未读统计（方向 + 已读标记）
    __table_args__ = (
        Index("ix_chat_user_created", "user_id", "created_at"),
        Index("ix_chat_admin_unread", "sender", "is_read_admin"),
        {"comment": "前台用户与后台管理员聊天消息"},
    )

    # 会员外键（必填）：会话按用户聚合，后台按 user_id 查聊天记录
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    # 来源产品（可空）：从哪款产品页面发起咨询（历史/直接入口消息可为空）
    product_id: Mapped[int | None] = mapped_column(
        ForeignKey("products.id"), nullable=True
    )
    # 消息方向：user（会员发） / admin（管理员回复）
    sender: Mapped[str] = mapped_column(String(10), nullable=False)
    # 回复管理员（可空）：sender=admin 时记录操作人，便于后台审计
    admin_id: Mapped[int | None] = mapped_column(ForeignKey("admins.id"), nullable=True)
    # 消息内容（纯文本，仅文本消息第一期）
    content: Mapped[str] = mapped_column(Text, nullable=False)
    # 管理员侧未读：sender=user 且 is_read_admin=false → 计入后台角标
    is_read_admin: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="0"
    )
    # 会员侧未读：sender=admin 且 is_read_user=false → 会员打开聊天即读
    is_read_user: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="0"
    )

    # ORM 关系：发起会员（懒加载，后台会话列表展示昵称/手机号）
    user: Mapped["User | None"] = relationship("User", lazy="joined")
    # ORM 关系：来源产品（懒加载，后台会话列表展示产品名）
    product: Mapped["Product | None"] = relationship("Product", lazy="joined")
    # ORM 关系：回复管理员（懒加载，前台/后台展示回复人姓名）
    admin: Mapped["Admin | None"] = relationship("Admin", lazy="joined")
