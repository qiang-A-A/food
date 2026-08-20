# =============================================================================
# app/models/intent.py — 团购/定制意向模型
# -----------------------------------------------------------------------------
# 功能：对应数据库文档 §3.5 purchase_intents 表。仅登录会员可提交（user_id
#       外键，PRD v2.1 权限分水岭）；source 标识来源页（contact/customize/
#       product，product 为已确认扩展）；status 状态机流转；软删除。
# =============================================================================

from sqlalchemy import Boolean, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import TimestampMixin
from app.database import Base


class PurchaseIntent(TimestampMixin, Base):
    """团购/定制意向：登录会员提交，后台跟进状态流转。"""

    __tablename__ = "purchase_intents"
    # 索引：后台按状态筛选（ix_purchase_status）+ 按提交时间倒序（ix_purchase_created）
    __table_args__ = (
        Index("ix_purchase_status", "status"),
        Index("ix_purchase_created", "created_at"),
        {"comment": "团购/定制意向"},
    )

    # 提交会员外键（v2.1 起必为登录会员；可空兼容历史数据）
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    # 来源产品外键（可空）：source=product 时记录从哪款产品页提交（后台展示产品名）
    product_id: Mapped[int | None] = mapped_column(
        ForeignKey("products.id"), nullable=True, index=True
    )
    # 姓名（必填）
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    # 电话（必填）
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    # 公司名称（企业团购/定制场景）
    company: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # 采购/定制需求描述
    requirement: Mapped[str | None] = mapped_column(Text, nullable=True)
    # 数量区间（如 50-100 盒）
    quantity_range: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # 来源页：contact（联系我们）/ customize（礼盒定制）/ product（产品详情，已确认扩展）
    source: Mapped[str] = mapped_column(String(20), nullable=False, default="contact")
    # 状态机：pending 待跟进 / contacted 已联系 / deal 已成交 / closed 已关闭 /
    #         revoked 已撤销（用户撤销）/ deleted 已删除（回收站内）
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    # 软删除（进回收站：用户/管理员删除时 is_deleted=true 且 status=deleted）
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0")

    # ORM 关系：提交会员（懒加载，用于后台表格展示手机号/昵称）
    user: Mapped["User | None"] = relationship("User", lazy="joined")
    # ORM 关系：来源产品（懒加载，后台详情展示「产品详情（产品名）」）
    product: Mapped["Product | None"] = relationship("Product", lazy="joined")
