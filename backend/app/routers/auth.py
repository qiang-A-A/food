# =============================================================================
# app/routers/auth.py — 超管认证接口
# -----------------------------------------------------------------------------
# 功能：实现开发技术文档 §6.3 超管认证（2 个）——
#       POST /api/auth/login（角落入口登录）、PUT /api/auth/password（改密）。
# =============================================================================

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.deps import get_current_admin
from app.auth.jwt import create_token
from app.auth.password import hash_password, verify_password
from app.database import get_db
from app.models import Admin
from app.schemas import AdminLoginIn, AdminLoginOut, AdminOut, PasswordChangeIn
from app.utils.errors import AppError
from app.utils.response import ok

router = APIRouter()


@router.post("/login")
def admin_login(body: AdminLoginIn, db: Session = Depends(get_db)):
    """超管登录（登录页角落低调入口，同页跳转）。"""
    admin = db.query(Admin).filter(Admin.username == body.username).first()
    # 账号不存在或密码错误 → 401（不区分，防枚举）
    if not admin or not verify_password(body.password, admin.password_hash):
        raise AppError.login_failed("用户名或密码错误")
    # 禁用 → 403
    if not admin.is_activate:
        raise AppError.disabled("账号已禁用，请联系管理员")
    # 签发 admin 角色 JWT，携带 role_id/dept_id（多超管 RBAC 声明）
    token = create_token(admin.id, role="admin", extra={
        "role_id": admin.role_id, "dept_id": admin.dept_id,
    })
    return ok({"token": token, "admin": AdminOut.model_validate(admin)})


@router.put("/password")
def admin_change_password(
    body: PasswordChangeIn,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """超管修改自身密码：校验原密码后更新。"""
    if not verify_password(body.old_password, admin.password_hash):
        raise AppError.login_failed("原密码错误")
    admin.password_hash = hash_password(body.new_password)
    admin.updated_by = admin.username
    db.commit()
    return ok(message="密码修改成功")
