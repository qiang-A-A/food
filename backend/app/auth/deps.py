# =============================================================================
# app/auth/deps.py — 认证依赖注入（双角色）
# -----------------------------------------------------------------------------
# 功能：为受保护接口提供当前用户/管理员对象（开发技术文档 §5.2）。
#       get_current_user 校验 user JWT 并查询 users 表；
#       get_current_admin 校验 admin JWT 并查询 admins 表（含禁用检查）。
# =============================================================================

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.auth.jwt import verify_token
from app.database import get_db
from app.models import Admin, User
from app.utils.errors import AppError

# OAuth2 密码流：从 Authorization: Bearer <token> 提取令牌
# tokenUrl 仅为 Swagger 交互提示（实际登录走 /api/user/login）
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/user/login")


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    """前台用户鉴权依赖：校验 user 角色令牌，返回 users 记录。

    使用：`def endpoint(user: User = Depends(get_current_user))`
    """
    payload = verify_token(token, expected_role="user")
    user = db.get(User, int(payload["sub"]))
    # 用户不存在或被禁用（后台禁用后不可登录）→ 4010
    if not user or not user.is_activate:
        raise AppError.unauthorized("用户不存在或已禁用")
    return user


def get_current_admin(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> Admin:
    """后台超管鉴权依赖：校验 admin 角色令牌，返回 admins 记录。

    所有 /api/admin/* 接口强制挂载本依赖（防越权，开发技术文档 §10.2）。
    """
    payload = verify_token(token, expected_role="admin")
    admin = db.get(Admin, int(payload["sub"]))
    if not admin or not admin.is_activate:
        raise AppError.unauthorized("管理员不存在或已禁用")
    return admin
