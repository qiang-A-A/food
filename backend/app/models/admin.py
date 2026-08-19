# =============================================================================
# app/models/admin.py — 后台用户（超管）模型
# -----------------------------------------------------------------------------
# 功能：对应数据库文档 §3.2 admins 表。多超管 + 部门 + 角色（RBAC）：
#       dept_id → departments.id（可空，顶级用户无部门）、role_id → roles.id（必填）。
# =============================================================================

from sqlalchemy import ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import TimestampMixin
from app.database import Base


class Admin(TimestampMixin, Base):
    """后台用户/超管：username 唯一，关联部门与角色。"""

    __tablename__ = "admins"
    # 表级约束：登录名唯一索引（uk_admins_username）
    __table_args__ = (
        Index("uk_admins_username", "username", unique=True),
        {"comment": "后台用户（超管）"},
    )

    # 登录名（账号）：唯一
    username: Mapped[str] = mapped_column(String(50), nullable=False)
    # bcrypt 密码哈希
    password_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    # 姓名（必填）
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    # 昵称（可空）
    nickname: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # 手机号（可空）
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # 邮箱（可空）
    email: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # 性别（男/女/未知，可扩展）
    gender: Mapped[str | None] = mapped_column(String(10), nullable=True)
    # 岗位（如 运营总监）
    post: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # 所属部门外键（可空，索引 ix_admins_dept）
    dept_id: Mapped[int | None] = mapped_column(
        ForeignKey("departments.id"), nullable=True, index=True
    )
    # 角色外键（必填，索引 ix_admins_role）
    role_id: Mapped[int] = mapped_column(
        ForeignKey("roles.id"), nullable=False, index=True
    )

    # ORM 关系：部门（懒加载）
    department: Mapped["Department | None"] = relationship("Department", lazy="joined")
    # ORM 关系：角色
    role: Mapped["Role"] = relationship("Role", lazy="joined")
