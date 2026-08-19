# =============================================================================
# app/models/__init__.py — 模型统一导出
# -----------------------------------------------------------------------------
# 功能：导入全部 11 张表的 ORM 模型，确保 Base.metadata 注册完整（Alembic
#       autogenerate 依赖此文件被导入才能识别所有表）。业务代码从本模块导入。
# =============================================================================

from app.models.user import User
from app.models.role import Role
from app.models.department import Department
from app.models.admin import Admin
from app.models.category import Category
from app.models.product import Product
from app.models.intent import PurchaseIntent
from app.models.news import News
from app.models.banner import Banner
from app.models.about import About
from app.models.setting import Setting

__all__ = [
    "User",
    "Role",
    "Department",
    "Admin",
    "Category",
    "Product",
    "PurchaseIntent",
    "News",
    "Banner",
    "About",
    "Setting",
]
