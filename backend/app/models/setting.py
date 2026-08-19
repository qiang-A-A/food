# =============================================================================
# app/models/setting.py — 系统设置模型（键值对）
# -----------------------------------------------------------------------------
# 功能：对应数据库文档 §3.9 settings 表。key 唯一（uk_settings_key），
#       value 存 JSON 字符串。预置 key：site_title / site_slogan / contact_phone /
#       contact_email / contact_address / contact_wechat_qr / footer_icp /
#       footer_sc_license。不做删除仅更新。
# =============================================================================

from sqlalchemy import Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import TimestampMixin
from app.database import Base


class Setting(TimestampMixin, Base):
    """系统设置键值对：前台联系方式/页脚合规信息的数据源。"""

    __tablename__ = "settings"
    # 表级约束：key 唯一索引（uk_settings_key）
    __table_args__ = (
        Index("uk_settings_key", "key", unique=True),
        {"comment": "系统设置（键值对）"},
    )

    # 键名（唯一）
    key: Mapped[str] = mapped_column(String(50), nullable=False)
    # 值（JSON 字符串，如 "天上宫阙 · 御礼天成"）
    value: Mapped[str | None] = mapped_column(Text, nullable=True)
