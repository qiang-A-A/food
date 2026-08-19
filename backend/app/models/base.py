# =============================================================================
# app/models/base.py — ORM 公共字段基类（Mixin）
# -----------------------------------------------------------------------------
# 功能：封装数据库文档 §1.3「公共字段约定」——id / is_activate / created_by /
#       created_at / updated_by / updated_at，全部 11 张表统一继承，
#       保证字段语义与命名一致（避免逐表重复定义导致漂移）。
# =============================================================================

from datetime import datetime  # 标准库：时间类型标注

from sqlalchemy import BigInteger, Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

# 主键类型：PG 用 BIGINT（BIGSERIAL），SQLite 需 INTEGER 才支持自增（数据库文档 §1.4）
PK_TYPE = BigInteger().with_variant(Integer, "sqlite")


class TimestampMixin:
    """公共字段 Mixin：所有表统一具备的审计与状态字段。"""

    # 主键：统一 BIGINT 自增（SQLite 下自动映射为 INTEGER AUTOINCREMENT）
    id: Mapped[int] = mapped_column(PK_TYPE, primary_key=True, autoincrement=True)

    # 状态：激活/禁用（products 表不使用本字段，见数据库文档 §6.2）
    is_activate: Mapped[bool] = mapped_column(Boolean, default=True, server_default="1")

    # 审计：创建人（存操作人登录账号，非外键，便于审计追溯）
    created_by: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # 审计：创建时间（数据库默认当前时间，应用层也可显式赋值）
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.now, server_default=func.now()
    )

    # 审计：修改人
    updated_by: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # 审计：修改时间（onupdate 由 SQLAlchemy 在 UPDATE 时自动刷新，
    # 修复审计缺陷：此前缺 onupdate 导致 updated_at 恒等于 created_at）
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.now, server_default=func.now(),
        onupdate=func.now(),
    )
