# =============================================================================
# app/routers/user.py — 前台用户接口（注册登录 + 个人中心 + 意向）
# -----------------------------------------------------------------------------
# 功能：实现开发技术文档 §6.2 全部用户接口（8 个）——
#       register / login / profile(GET/PUT) / password / avatar / intents(GET/POST)。
# 安全：intents 提交的 user_id 取自 token（防越权，开发技术文档 §10.2）；
#       密码一律 bcrypt 哈希，绝不返回 password_hash。
# =============================================================================

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.auth.jwt import create_token
from app.auth.password import hash_password, verify_password
from app.database import get_db
from app.models import PurchaseIntent, User
from app.schemas import (
    AvatarKeyIn, IntentIn, IntentOut, PasswordChangeIn,
    UserLoginIn, UserLoginOut, UserOut, UserRegisterIn, UserUpdateIn,
)
from app.services.paginate import paginate
from app.storage.backend import storage
from app.utils.errors import AppError
from app.utils.response import ok

router = APIRouter()


# ---------------- 注册 / 登录（公开） ----------------

@router.post("/register", status_code=201)
def register(body: UserRegisterIn, db: Session = Depends(get_db)):
    """用户注册：手机号唯一校验 → bcrypt 哈希 → 注册即登录（返回 user JWT）。"""
    # 手机号查重（409 手机号已注册）
    exists = db.query(User).filter(User.phone == body.phone).first()
    if exists:
        raise AppError.conflict("手机号已注册")
    # 创建用户（昵称缺省为「宫阙会员」）
    user = User(
        phone=body.phone,
        password_hash=hash_password(body.password),
        nickname=body.nickname or "宫阙会员",
        avatar="default-1",  # 默认头像
        created_by="user",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    # 签发 user 角色 JWT（注册即登录，PRD F-6）
    token = create_token(user.id, role="user")
    return ok({"token": token, "user": UserOut.model_validate(user)}, "注册成功")


@router.post("/login")
def login(body: UserLoginIn, db: Session = Depends(get_db)):
    """用户登录（主入口）：手机号+密码校验，签发 user JWT。"""
    user = db.query(User).filter(User.phone == body.phone).first()
    # 用户不存在或密码错误 → 401 手机号或密码错误（不区分，防账号枚举）
    if not user or not verify_password(body.password, user.password_hash):
        raise AppError.login_failed()
    # 账号被禁用 → 403（后台可禁用用户）
    if not user.is_activate:
        raise AppError.disabled("账号已禁用，请联系客服")
    token = create_token(user.id, role="user")
    return ok({"token": token, "user": UserOut.model_validate(user)})


# ---------------- 个人中心（需登录） ----------------

@router.get("/profile")
def get_profile(user: User = Depends(get_current_user)):
    """个人资料：返回当前登录用户信息。"""
    return ok(UserOut.model_validate(user))


@router.put("/profile")
def update_profile(
    body: UserUpdateIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """修改资料：昵称/手机号（手机号改号需查重）。"""
    if body.nickname is not None:
        user.nickname = body.nickname
    if body.phone is not None and body.phone != user.phone:
        # 新手机号查重（409）
        exists = db.query(User).filter(User.phone == body.phone).first()
        if exists:
            raise AppError.conflict("手机号已注册")
        user.phone = body.phone
    user.updated_by = "user"
    db.commit()
    db.refresh(user)
    return ok(UserOut.model_validate(user))


@router.put("/password")
def change_password(
    body: PasswordChangeIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """修改密码：校验原密码 → 更新为新密码哈希。"""
    if not verify_password(body.old_password, user.password_hash):
        raise AppError.login_failed("原密码错误")
    user.password_hash = hash_password(body.new_password)
    db.commit()
    return ok(message="密码修改成功")


@router.post("/avatar")
def update_avatar(
    file: UploadFile | None = File(None, description="本地图片（≤2MB jpg/png）"),
    avatar_key: str | None = Form(None, description="默认头像库 key（default-1~6）"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """修改头像：二选一——上传本地图片 或 选择默认头像库（PRD F-6）。"""
    if file is not None:
        # 上传本地图片（kind=avatar，守卫限制 ≤2MB）
        result = storage.save(file, kind="avatar")
        user.avatar = result["url"]
    elif avatar_key:
        # 默认头像库选择（格式 default-1 ~ default-6，由 schema 校验）
        if not avatar_key.startswith("default-") or not avatar_key[8:].isdigit():
            raise AppError.param("默认头像 key 格式错误")
        user.avatar = avatar_key
    else:
        raise AppError.param("请上传图片或选择默认头像")
    db.commit()
    return ok({"avatar": user.avatar})


# ---------------- 我的意向（需登录） ----------------

@router.get("/intents")
def my_intents(
    page: int = 1,
    page_size: int = 10,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """我的意向列表：仅返回当前登录用户的团购/定制意向。"""
    query = (
        select(PurchaseIntent)
        .where(PurchaseIntent.user_id == user.id, PurchaseIntent.is_deleted.is_(False))
    )
    data = paginate(db, query, page, page_size, order_by=PurchaseIntent.created_at.desc())
    return ok({
        "items": [IntentOut.model_validate(i) for i in data["items"]],
        "total": data["total"], "page": data["page"],
        "page_size": data["page_size"], "pages": data["pages"],
    })


@router.post("/intents", status_code=201)
def create_intent(
    body: IntentIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """提交团购/定制意向（需登录）：user_id 强制取自 token（防越权）。"""
    intent = PurchaseIntent(
        user_id=user.id,          # 关键：来自登录态而非前端传参
        name=body.name,
        phone=body.phone,
        company=body.company,
        requirement=body.requirement,
        quantity_range=body.quantity_range,
        source=body.source,       # contact / customize / product
        status="pending",         # 初始状态：待跟进
        created_by=str(user.id),
    )
    db.add(intent)
    db.commit()
    db.refresh(intent)
    return ok({"id": intent.id, "status": "pending"}, "提交成功，顾问将尽快与您联系")
