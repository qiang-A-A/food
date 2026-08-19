# =============================================================================
# app/routers/admin/__init__.py — 后台路由聚合
# -----------------------------------------------------------------------------
# 功能：聚合后台各子模块路由（产品/内容/意向/系统）为一个 APIRouter，
#       由 main.py 统一挂载到 /api/admin 前缀，并全局附加管理员鉴权依赖。
# =============================================================================

from fastapi import APIRouter, Depends

from app.auth.deps import get_current_admin
from app.routers.admin import content, intents, products, system

# 后台路由：全部子路由默认挂载管理员鉴权（防越权，开发技术文档 §10.2）
router = APIRouter(dependencies=[Depends(get_current_admin)])
router.include_router(products.router, prefix="/products", tags=["后台-产品管理"])
router.include_router(content.router, tags=["后台-内容管理"])   # categories/news/banners/about 直接挂在 /api/admin 下
router.include_router(intents.router, prefix="/intents", tags=["后台-团购意向"])
router.include_router(system.router, tags=["后台-系统管理"])     # dashboard/users/admins/departments/roles/settings/upload
