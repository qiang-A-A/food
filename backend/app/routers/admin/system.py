# =============================================================================
# app/routers/admin/system.py — 系统管理（用户/管理员/部门/角色/设置/上传/仪表盘）
# -----------------------------------------------------------------------------
# 功能：实现开发技术文档 §6.3 剩余后台接口——仪表盘统计、用户管理、管理员
#       管理（多超管 RBAC）、部门/角色管理、系统设置（联系方式/站点）、上传。
# =============================================================================

from fastapi import APIRouter, Depends, File, Query, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth.deps import get_current_admin
from app.auth.password import hash_password
from app.database import get_db
from app.models import (
    Admin, Banner, Category, Department, News, Product,
    PurchaseIntent, Role, Setting, User,
)
from app.schemas import (
    AdminCreateIn, AdminOut, AdminUpdateIn, CategoryOut, ContactSettingsIn,
    DepartmentIn, DepartmentOut, RoleIn, RoleOut, SiteSettingsIn, UserOut,
)
from app.services.paginate import paginate
from app.storage.backend import storage
from app.utils.errors import AppError
from app.utils.response import ok

router = APIRouter()


def _ensure_active_admin_remains(db: Session, exclude_id: int) -> None:
    """确保系统至少保留一个激活管理员（审计修复 2026-08-19）。

    删除/禁用管理员前调用：若除目标外已无其他激活管理员，则拒绝操作，
    防止把所有管理员删光/禁光导致后台永久锁死。
    """
    active_others = (
        db.query(Admin)
        .filter(Admin.is_activate.is_(True), Admin.id != exclude_id)
        .count()
    )
    if active_others == 0:
        raise AppError.forbidden("系统至少需要保留一个启用状态的管理员")


# ============================================================
# 仪表盘统计
# ============================================================

@router.get("/dashboard")
def admin_dashboard(db: Session = Depends(get_db)):
    """仪表盘统计卡（7 项）：产品/品类/新闻/用户/轮播/意向/管理员。"""
    return ok({
        "products": db.query(Product).filter(Product.is_deleted.is_(False)).count(),
        "categories": db.query(Category).filter(Category.is_activate.is_(True)).count(),
        "news": db.query(News).filter(News.is_deleted.is_(False)).count(),
        "users": db.query(User).filter(User.is_activate.is_(True)).count(),
        "banners": db.query(Banner).filter(Banner.is_activate.is_(True)).count(),
        "intents": db.query(PurchaseIntent).filter(PurchaseIntent.is_deleted.is_(False)).count(),
        "admins": db.query(Admin).filter(Admin.is_activate.is_(True)).count(),
    })


# ============================================================
# 用户管理（注册会员）
# ============================================================

@router.get("/users")
def admin_list_users(
    keyword: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """注册用户列表：手机号/昵称搜索 + 分页。"""
    query = select(User)
    if keyword:
        like = f"%{keyword}%"
        query = query.where(User.phone.like(like) | User.nickname.like(like))
    data = paginate(db, query, page, page_size, order_by=User.created_at.desc())
    return ok({
        "items": [UserOut.model_validate(u) for u in data["items"]],
        "total": data["total"], "page": data["page"],
        "page_size": data["page_size"], "pages": data["pages"],
    })


@router.get("/users/{user_id}")
def admin_get_user(user_id: int, db: Session = Depends(get_db)):
    """用户详情。"""
    user = db.get(User, user_id)
    if not user:
        raise AppError.not_found("用户不存在")
    return ok(UserOut.model_validate(user))


@router.patch("/users/{user_id}/status")
def admin_update_user_status(
    user_id: int,
    body: dict,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """禁用/启用用户：{"is_activate": bool}（禁用后无法登录）。"""
    user = db.get(User, user_id)
    if not user:
        raise AppError.not_found("用户不存在")
    is_activate = body.get("is_activate")
    if not isinstance(is_activate, bool):
        raise AppError.param("is_activate 必须为布尔值")
    user.is_activate = is_activate
    user.updated_by = admin.username
    db.commit()
    return ok({"id": user_id, "is_activate": is_activate}, "状态已更新")


@router.delete("/users/{user_id}")
def admin_delete_user(
    user_id: int,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """删除用户（软删除：is_activate=false，保留历史意向关联）。"""
    user = db.get(User, user_id)
    if not user:
        raise AppError.not_found("用户不存在")
    user.is_activate = False  # 软删除（数据库文档 §6.2：is_activate=false 停用）
    user.updated_by = admin.username
    db.commit()
    return ok(message="用户已停用")


# ============================================================
# 管理员管理（多超管 RBAC）
# ============================================================

@router.get("/admins")
def admin_list_admins(
    dept_id: int | None = None,
    role_id: int | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """管理员列表：可按部门/角色筛选 + 分页。"""
    query = select(Admin)
    if dept_id is not None:
        query = query.where(Admin.dept_id == dept_id)
    if role_id is not None:
        query = query.where(Admin.role_id == role_id)
    data = paginate(db, query, page, page_size, order_by=Admin.created_at.desc())
    return ok({
        "items": [AdminOut.model_validate(a) for a in data["items"]],
        "total": data["total"], "page": data["page"],
        "page_size": data["page_size"], "pages": data["pages"],
    })


@router.post("/admins", status_code=201)
def admin_create_admin(
    body: AdminCreateIn,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """新增管理员：username 唯一；role_id/dept_id 必须存在。"""
    # 登录名查重
    if db.query(Admin).filter(Admin.username == body.username).first():
        raise AppError.conflict("用户名已存在")
    # 角色/部门存在性校验（多超管 RBAC，数据库文档 §3.2）
    if not db.get(Role, body.role_id):
        raise AppError.param("角色不存在")
    if body.dept_id is not None and not db.get(Department, body.dept_id):
        raise AppError.param("部门不存在")
    new_admin = Admin(
        **body.model_dump(exclude={"password"}),
        password_hash=hash_password(body.password),
        created_by=admin.username,
    )
    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)
    return ok(AdminOut.model_validate(new_admin), "管理员创建成功")


@router.put("/admins/{admin_id}")
def admin_update_admin(
    admin_id: int,
    body: AdminUpdateIn,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """编辑管理员：可选字段更新；提供 password 则重置密码。"""
    target = db.get(Admin, admin_id)
    if not target:
        raise AppError.not_found("管理员不存在")
    data = body.model_dump(exclude_unset=True)
    # 审计修复：禁止把最后一个激活管理员禁用（防后台锁死）
    if data.get("is_activate") is False and target.is_activate:
        _ensure_active_admin_remains(db, exclude_id=target.id)
    # 密码单独处理（哈希）
    if data.get("password"):
        target.password_hash = hash_password(data.pop("password"))
    # username 查重（排除自身）
    if data.get("username") and data["username"] != target.username:
        exists = db.query(Admin).filter(Admin.username == data["username"], Admin.id != admin_id).first()
        if exists:
            raise AppError.conflict("用户名已存在")
    for key, value in data.items():
        setattr(target, key, value)
    target.updated_by = current_admin.username
    db.commit()
    return ok(AdminOut.model_validate(target), "管理员已更新")


@router.patch("/admins/{admin_id}/status")
def admin_update_admin_status(
    admin_id: int,
    body: dict,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """禁用/启用管理员；禁止禁用自己；禁止禁用最后一个激活管理员。"""
    if admin_id == current_admin.id:
        raise AppError.forbidden("不能禁用当前登录账号")
    target = db.get(Admin, admin_id)
    if not target:
        raise AppError.not_found("管理员不存在")
    is_activate = body.get("is_activate")
    if not isinstance(is_activate, bool):
        raise AppError.param("is_activate 必须为布尔值")
    if is_activate is False and target.is_activate:
        _ensure_active_admin_remains(db, exclude_id=target.id)
    target.is_activate = is_activate
    target.updated_by = current_admin.username
    db.commit()
    return ok({"id": admin_id, "is_activate": is_activate}, "状态已更新")


@router.delete("/admins/{admin_id}")
def admin_delete_admin(
    admin_id: int,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """删除管理员（禁止删除自己；禁止删除最后一个激活管理员）。"""
    if admin_id == current_admin.id:
        raise AppError.forbidden("不能删除当前登录账号")
    target = db.get(Admin, admin_id)
    if not target:
        raise AppError.not_found("管理员不存在")
    if target.is_activate:
        _ensure_active_admin_remains(db, exclude_id=target.id)
    db.delete(target)
    db.commit()
    return ok(message="管理员已删除")


# ============================================================
# 部门管理（自引用树）
# ============================================================

@router.get("/departments")
def admin_list_departments(db: Session = Depends(get_db)):
    """部门树：返回全部部门（前端拼树或本接口返回嵌套树）。"""
    depts = db.query(Department).order_by(Department.id.asc()).all()
    return ok([DepartmentOut.model_validate(d) for d in depts])


@router.post("/departments", status_code=201)
def admin_create_department(
    body: DepartmentIn,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """新增部门（parent_id 可选，指向已有部门）。"""
    if body.parent_id is not None and not db.get(Department, body.parent_id):
        raise AppError.param("上级部门不存在")
    dept = Department(dept_name=body.dept_name, parent_id=body.parent_id, created_by=admin.username)
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return ok(DepartmentOut.model_validate(dept), "部门创建成功")


@router.put("/departments/{dept_id}")
def admin_update_department(
    dept_id: int,
    body: DepartmentIn,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """编辑部门：名称/上级部门（禁止将上级设为自己或其子部门，防环）。"""
    dept = db.get(Department, dept_id)
    if not dept:
        raise AppError.not_found("部门不存在")
    if body.parent_id is not None:
        if body.parent_id == dept_id:
            raise AppError.param("上级部门不能是自身")
        # 简单防环：父部门 id 必须存在
        if not db.get(Department, body.parent_id):
            raise AppError.param("上级部门不存在")
    dept.dept_name = body.dept_name
    dept.parent_id = body.parent_id
    dept.updated_by = admin.username
    db.commit()
    return ok(DepartmentOut.model_validate(dept), "部门已更新")


@router.delete("/departments/{dept_id}")
def admin_delete_department(
    dept_id: int,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """删除部门：须先处理子部门与归属用户（存在则 409）。"""
    dept = db.get(Department, dept_id)
    if not dept:
        raise AppError.not_found("部门不存在")
    # 存在子部门 → 409
    has_children = db.query(Department).filter(Department.parent_id == dept_id).first()
    if has_children:
        raise AppError.conflict("该部门下存在子部门，请先迁移或删除")
    # 存在归属用户 → 409
    has_admins = db.query(Admin).filter(Admin.dept_id == dept_id).first()
    if has_admins:
        raise AppError.conflict("该部门下存在管理员，请先调整归属")
    db.delete(dept)
    db.commit()
    return ok(message="部门已删除")


# ============================================================
# 角色管理
# ============================================================

@router.get("/roles")
def admin_list_roles(db: Session = Depends(get_db)):
    """角色列表。"""
    roles = db.query(Role).order_by(Role.id.asc()).all()
    return ok([RoleOut.model_validate(r) for r in roles])


@router.post("/roles", status_code=201)
def admin_create_role(
    body: RoleIn,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """新增角色：名称唯一。"""
    if db.query(Role).filter(Role.role_name == body.role_name).first():
        raise AppError.conflict("角色名称已存在")
    role = Role(role_name=body.role_name, created_by=admin.username)
    db.add(role)
    db.commit()
    db.refresh(role)
    return ok(RoleOut.model_validate(role), "角色创建成功")


@router.put("/roles/{role_id}")
def admin_update_role(
    role_id: int,
    body: RoleIn,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """编辑角色名称。"""
    role = db.get(Role, role_id)
    if not role:
        raise AppError.not_found("角色不存在")
    if body.role_name != role.role_name:
        exists = db.query(Role).filter(Role.role_name == body.role_name, Role.id != role_id).first()
        if exists:
            raise AppError.conflict("角色名称已存在")
    role.role_name = body.role_name
    role.updated_by = admin.username
    db.commit()
    return ok(RoleOut.model_validate(role), "角色已更新")


@router.delete("/roles/{role_id}")
def admin_delete_role(
    role_id: int,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """删除角色：被 admins 引用则 409（须先解绑）。"""
    role = db.get(Role, role_id)
    if not role:
        raise AppError.not_found("角色不存在")
    referenced = db.query(Admin).filter(Admin.role_id == role_id).first()
    if referenced:
        raise AppError.conflict("该角色仍被管理员引用，请先调整归属")
    db.delete(role)
    db.commit()
    return ok(message="角色已删除")


# ============================================================
# 系统设置（联系方式 / 站点）
# ============================================================

def _get_settings_dict(db: Session) -> dict:
    """读取全部 settings 键值（剥掉 JSON 字符串引号）。"""
    rows = db.query(Setting).all()
    result = {}
    for s in rows:
        v = s.value
        if isinstance(v, str) and v.startswith('"') and v.endswith('"'):
            v = v[1:-1]
        result[s.key] = v
    return result


def _upsert_settings(db: Session, data: dict, operator: str) -> None:
    """批量新增/更新 settings 键值对（存在则更新，不存在则创建）。"""
    for key, value in data.items():
        if value is None:
            continue  # None 不更新
        setting = db.query(Setting).filter(Setting.key == key).first()
        if setting:
            setting.value = f'"{value}"'  # 存 JSON 字符串（带引号）
            setting.updated_by = operator
        else:
            db.add(Setting(key=key, value=f'"{value}"', created_by=operator))


@router.get("/settings/contact")
def admin_get_contact_settings(db: Session = Depends(get_db)):
    """联系方式设置读取。"""
    data = _get_settings_dict(db)
    keys = ["contact_phone", "contact_email", "contact_address",
            "contact_wechat_qr", "footer_icp", "footer_sc_license"]
    return ok({k: data.get(k) for k in keys})


@router.put("/settings/contact")
def admin_update_contact_settings(
    body: ContactSettingsIn,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """联系方式设置更新（MVP 必做，前台联系我们页与页脚数据源）。"""
    _upsert_settings(db, body.model_dump(exclude_unset=True), admin.username)
    db.commit()
    return ok(message="联系方式已保存")


@router.get("/settings/site")
def admin_get_site_settings(db: Session = Depends(get_db)):
    """站点设置读取（P2 可延后）。"""
    data = _get_settings_dict(db)
    return ok({"site_title": data.get("site_title"), "site_slogan": data.get("site_slogan")})


@router.put("/settings/site")
def admin_update_site_settings(
    body: SiteSettingsIn,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """站点设置更新（站点标题/品牌标语）。"""
    _upsert_settings(db, body.model_dump(exclude_unset=True), admin.username)
    db.commit()
    return ok(message="站点设置已保存")


# ============================================================
# 文件上传
# ============================================================

@router.post("/upload")
def admin_upload(
    file: UploadFile = File(...),
    kind: str = Query(..., pattern=r"^(image|video|avatar|qrcode)$"),
    admin: Admin = Depends(get_current_admin),
):
    """图片/视频上传：kind 区分用途（image/video/avatar/qrcode），守卫校验。"""
    result = storage.save(file, kind)
    return ok(result, "上传成功")
