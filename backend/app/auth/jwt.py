# =============================================================================
# app/auth/jwt.py — JWT 签发与校验
# -----------------------------------------------------------------------------
# 功能：双角色 JWT（user/admin）签发与解析（开发技术文档 §5.2 / ADR-2）。
#       payload 含 sub（id）、role（user/admin）；admin 额外携带 role_id/dept_id。
# =============================================================================

from datetime import datetime, timedelta, timezone  # 时间计算
from typing import Any

from jose import JWTError, jwt  # python-jose：JWT 编解码

from app.config import settings
from app.utils.errors import AppError


def create_token(subject: int, role: str, extra: dict | None = None) -> str:
    """签发 JWT。

    Args:
        subject: 主体 ID（users.id 或 admins.id）
        role: 角色（user / admin）
        extra: 附加声明（admin 的 role_id/dept_id 等）
    """
    now = datetime.now(timezone.utc)  # UTC 基准时间（JWT 标准）
    payload: dict[str, Any] = {
        "sub": str(subject),          # 标准主体声明
        "role": role,                 # 自定义角色声明（user/admin 区分）
        "iat": now,                   # 签发时间
        "exp": now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),  # 过期时间
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def verify_token(token: str, expected_role: str) -> dict:
    """校验 JWT 签名与角色，返回 payload；无效则抛 4010。

    Args:
        token: 请求头中的 Bearer 令牌
        expected_role: 期望角色（user / admin），不符视为无权限
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        raise AppError.unauthorized("登录状态无效或已过期，请重新登录")
    # 角色校验：令牌中的 role 必须与接口要求一致（防止 user 令牌访问 admin 接口）
    if payload.get("role") != expected_role:
        raise AppError.unauthorized("登录状态无效或已过期，请重新登录")
    return payload
