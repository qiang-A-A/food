# =============================================================================
# app/models/department.py — 部门模型
# -----------------------------------------------------------------------------
# 功能：对应数据库文档 §3.10 departments 表。parent_id 自引用形成部门树，
#       顶级部门 parent_id=NULL；删除部门前需先迁移子部门与归属用户。
# =============================================================================

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import TimestampMixin
from app.database import Base


class Department(TimestampMixin, Base):
    """后台部门：自引用树形结构。"""

    __tablename__ = "departments"
    __table_args__ = ({"comment": "后台部门"},)

    # 部门名称
    dept_name: Mapped[str] = mapped_column(String(50), nullable=False)
    # 上级部门外键：自引用 departments.id（顶级为 NULL），索引 ix_departments_parent
    parent_id: Mapped[int | None] = mapped_column(
        ForeignKey("departments.id"), nullable=True, index=True
    )

    # ORM 关系：上级部门（remote_side 指向本表 id 形成自引用）
    parent: Mapped["Department | None"] = relationship(
        remote_side="Department.id", back_populates="children"
    )
    # ORM 关系：子部门集合（级联删除由业务层控制，勿依赖 DB 级联）
    children: Mapped[list["Department"]] = relationship(
        back_populates="parent", cascade="all, delete-orphan"
    )
