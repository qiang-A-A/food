# =============================================================================
# app/models/user.py — 注册会员模型（前台用户）
# -----------------------------------------------------------------------------
# 功能：对应数据库文档 §3.1 users 表。手机号为登录名（唯一），
#       密码仅存 bcrypt 哈希；avatar 存 URL 或默认头像 key（default-N）。
# =============================================================================

from sqlalchemy import Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import TimestampMixin
from app.database import Base


class User(TimestampMixin, Base):
    """注册会员（前台）：手机号+密码登录，JWT 认证。"""

    __tablename__ = "users"
    # 表级约束：手机号唯一索引（uk_users_phone，命名严格对齐数据库文档 §5）
    __table_args__ = (
        Index("uk_users_phone", "phone", unique=True),
        {"comment": "注册会员（前台）"},
    )

    # 手机号（登录名）：唯一，20 位以内
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    # bcrypt 密码哈希（128 位存储）
    password_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    # 昵称（可空，默认「宫阙会员」由应用层兜底）
    nickname: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # 头像：URL 或默认头像 key（default-1 ~ default-6，对应 PRD F-6 默认头像库）
    avatar: Mapped[str | None] = mapped_column(String(512), nullable=True)
