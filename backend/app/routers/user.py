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
from sqlalchemy.orm import Session, joinedload

from app.auth.deps import get_current_user
from app.auth.jwt import create_token
from app.auth.password import hash_password, verify_password
from app.database import get_db
from app.models import ChatMessage, PurchaseIntent, User
from app.schemas import (
    AvatarKeyIn, IntentIn, IntentOut, MessageIn, MessageOut, PasswordChangeIn,
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

def intent_to_out(i: PurchaseIntent) -> IntentOut:
    """意向 ORM → 用户侧输出模型（含来源产品名）。"""
    return IntentOut.model_validate({
        "id": i.id, "name": i.name, "phone": i.phone,
        "company": i.company, "requirement": i.requirement,
        "quantity_range": i.quantity_range,
        "source": i.source,
        "product_id": i.product_id,
        "product_name": i.product.name if i.product else None,
        "status": i.status,
        "created_at": i.created_at,
    })


@router.get("/intents")
def my_intents(
    page: int = 1,
    page_size: int = 10,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """我的意向列表：仅返回当前登录用户的团购/定制意向（含来源产品名）。"""
    query = (
        select(PurchaseIntent)
        .options(joinedload(PurchaseIntent.product))
        .where(PurchaseIntent.user_id == user.id, PurchaseIntent.is_deleted.is_(False))
    )
    data = paginate(db, query, page, page_size, order_by=PurchaseIntent.created_at.desc())
    return ok({
        "items": [intent_to_out(i) for i in data["items"]],
        "total": data["total"], "page": data["page"],
        "page_size": data["page_size"], "pages": data["pages"],
    })


@router.post("/intents", status_code=201)
def create_intent(
    body: IntentIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """提交团购/定制意向（需登录）：user_id 强制取自 token（防越权）；
    product_id 记录来源产品（产品详情页「立即预约」携带）。"""
    intent = PurchaseIntent(
        user_id=user.id,          # 关键：来自登录态而非前端传参
        name=body.name,
        phone=body.phone,
        company=body.company,
        requirement=body.requirement,
        quantity_range=body.quantity_range,
        source=body.source,       # contact / customize / product
        product_id=body.product_id,  # 来源产品（source=product 时展示产品名）
        status="pending",         # 初始状态：待跟进
        created_by=str(user.id),
    )
    db.add(intent)
    db.commit()
    db.refresh(intent)
    return ok({"id": intent.id, "status": "pending"}, "提交成功，顾问将尽快与您联系")


@router.post("/intents/{intent_id}/revoke")
def revoke_intent(
    intent_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """撤销我的意向（仅本人，且状态为待跟进/已联系 → 已撤销）。"""
    intent = db.get(PurchaseIntent, intent_id)
    if not intent or intent.is_deleted or intent.user_id != user.id:
        raise AppError.not_found("意向不存在")
    # 状态机校验：仅 pending/contacted 可撤销
    if intent.status not in ("pending", "contacted"):
        raise AppError.invalid_transition(
            f"当前状态「{intent.status}」不可撤销（仅待跟进/已联系可撤销）"
        )
    intent.status = "revoked"
    intent.updated_by = str(user.id)
    db.commit()
    return ok({"id": intent_id, "status": "revoked"}, "意向已撤销")


@router.delete("/intents/{intent_id}")
def delete_my_intent(
    intent_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """删除我的意向（仅本人；已撤销/已成交的意向可删除 → 进回收站显示已删除）。

    幂等处理（Bug 修复 2026-08-20）：后台若已「永久删除」该意向（物理删除，
    记录不存在），前台列表仍可能展示它——此时删除直接视为成功返回，
    不再报「意向不存在」阻塞用户操作（记录已不存在，无需进回收站）。
    """
    intent = db.get(PurchaseIntent, intent_id)
    # 记录已被后台永久删除（物理删除）→ 幂等成功，无需进回收站
    if not intent:
        return ok(message="意向已删除")
    if intent.is_deleted or intent.user_id != user.id:
        raise AppError.not_found("意向不存在")
    # 需求：仅已撤销（revoked）与已成交（deal）可删除
    if intent.status not in ("revoked", "deal"):
        raise AppError.invalid_transition(
            f"当前状态「{intent.status}」不可删除（仅已撤销/已成交可删除）"
        )
    intent.status = "deleted"
    intent.is_deleted = True
    intent.updated_by = str(user.id)
    db.commit()
    return ok(message="意向已删除")


# ---------------- 咨询消息（需登录，与后台管理员聊天） ----------------

def msg_to_out(m: ChatMessage) -> MessageOut:
    """聊天消息 ORM → 输出模型（管理员姓名用于前台展示回复人）。"""
    return MessageOut.model_validate({
        "id": m.id, "user_id": m.user_id, "product_id": m.product_id,
        "sender": m.sender, "admin_id": m.admin_id,
        "admin_name": m.admin.name if m.admin else None,
        "content": m.content,
        "is_read_admin": m.is_read_admin, "is_read_user": m.is_read_user,
        "created_at": m.created_at,
    })


@router.get("/messages")
def my_messages(
    page: int = 1,
    page_size: int = 50,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """我的聊天记录（倒序分页）：返回当前用户全部消息，并把管理员回复
    标记为已读（用户打开聊天即视为已读，is_read_user → true）。"""
    # 先标记已读：管理员发来的未读消息
    db.query(ChatMessage).filter(
        ChatMessage.user_id == user.id,
        ChatMessage.sender == "admin",
        ChatMessage.is_read_user.is_(False),
    ).update({ChatMessage.is_read_user: True}, synchronize_session=False)
    db.commit()
    # 查询消息（倒序分页，前端反转展示为时间正序）
    query = select(ChatMessage).where(ChatMessage.user_id == user.id)
    data = paginate(db, query, page, page_size, order_by=ChatMessage.created_at.desc())
    return ok({
        "items": [msg_to_out(m) for m in data["items"]],
        "total": data["total"], "page": data["page"],
        "page_size": data["page_size"], "pages": data["pages"],
    })


@router.post("/messages", status_code=201)
def send_message(
    body: MessageIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """发送咨询消息（需登录）：方向为 user，管理员侧未读置 false 计入后台角标；
    product_id 记录来源产品（产品详情页「咨询顾问」入口携带）。"""
    msg = ChatMessage(
        user_id=user.id,
        product_id=body.product_id,
        sender="user",
        content=body.content.strip(),
        is_read_admin=False,   # 发给管理员 → 管理员侧未读
        created_by=str(user.id),
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return ok(msg_to_out(msg), "消息已发送")


@router.get("/messages/unread")
def my_unread_count(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """我的未读消息数（管理员回复未读，个人中心入口角标）。"""
    count = db.query(ChatMessage).filter(
        ChatMessage.user_id == user.id,
        ChatMessage.sender == "admin",
        ChatMessage.is_read_user.is_(False),
    ).count()
    return ok({"count": count})
