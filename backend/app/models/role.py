# =============================================================================
# app/models/role.py — 角色模型
# -----------------------------------------------------------------------------
# 功能：对应数据库文档 §3.11 roles 表。驱动后台 RBAC，
#       MVP 预置「超级管理员」与「运营编辑」；后台用户经 admins.role_id 关联。
# =============================================================================

from sqlalchemy import Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import TimestampMixin
from app.database import Base


class Role(TimestampMixin, Base):
    """后台角色：role_name 唯一（uk_roles_name）。"""

    __tablename__ = "roles"
    # 表级约束：角色名唯一索引（uk_roles_name）
    __table_args__ = (
        Index("uk_roles_name", "role_name", unique=True),
        {"comment": "后台角色"},
    )

    # 角色名称：唯一（如 超级管理员 / 运营编辑）
    role_name: Mapped[str] = mapped_column(String(50), nullable=False)
