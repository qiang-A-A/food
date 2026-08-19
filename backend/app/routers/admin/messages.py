# =============================================================================
# app/routers/admin/messages.py — 消息管理（后台，咨询聊天）
# -----------------------------------------------------------------------------
# 功能：实现消息管理模块——会话列表（每用户一条，含来源产品/最近消息/未读数）、
#       聊天记录（打开即读，管理员侧未读清零）、管理员回复、未读总数（角标）。
# 安全：全部挂 get_current_admin（防越权，开发技术文档 §10.2）。
# 注意：/conversations 与 /unread-count 必须声明在 /{user_id} 之前
#       （FastAPI 按声明顺序匹配路由，避免被 int 转换器误拦截）。
# =============================================================================

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.auth.deps import get_current_admin
from app.database import get_db
from app.models import Admin, ChatMessage, User
from app.schemas import ConversationOut, MessageIn, MessageOut, UnreadOut
from app.utils.errors import AppError
from app.utils.response import ok

router = APIRouter()


def msg_to_out(m: ChatMessage) -> MessageOut:
    """聊天消息 ORM → 输出模型（管理员姓名用于后台展示回复人）。"""
    return MessageOut.model_validate({
        "id": m.id, "user_id": m.user_id, "product_id": m.product_id,
        "sender": m.sender, "admin_id": m.admin_id,
        "admin_name": m.admin.name if m.admin else None,
        "content": m.content,
        "is_read_admin": m.is_read_admin, "is_read_user": m.is_read_user,
        "created_at": m.created_at,
    })


@router.get("/unread-count")
def admin_unread_count(
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """未读消息总数（角标）：会员发来且管理员未读的消息数。"""
    count = db.query(ChatMessage).filter(
        ChatMessage.sender == "user",
        ChatMessage.is_read_admin.is_(False),
    ).count()
    return ok(UnreadOut(count=count))


@router.get("/conversations")
def admin_conversations(
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """会话列表：按会员聚合，每用户一条——
       含会员信息（昵称/手机号/头像）、最近消息（方向/内容/时间）、
       管理员侧未读数、最近消息来源产品（满足「显示从哪款产品发起」）。"""
    # 全量消息（官网客服场景量级小，内存分组足够；懒加载会员与产品信息）
    messages = (
        db.query(ChatMessage)
        .options(joinedload(ChatMessage.user), joinedload(ChatMessage.product))
        .order_by(ChatMessage.created_at.desc())
        .all()
    )
    # 按 user_id 聚合：保留最新一条作为会话预览，统计未读数
    conv_map: dict[int, dict] = {}
    for m in messages:
        if m.user_id not in conv_map:
            conv_map[m.user_id] = {
                "user_id": m.user_id,
                "user_nickname": m.user.nickname if m.user else None,
                "user_phone": m.user.phone if m.user else None,
                "user_avatar": m.user.avatar if m.user else None,
                "last_message": m.content,
                "last_sender": m.sender,
                "last_time": m.created_at,
                "unread": 0,
                "product_id": m.product_id,
                "product_name": m.product.name if m.product else None,
            }
        if m.sender == "user" and not m.is_read_admin:
            conv_map[m.user_id]["unread"] += 1
    # 按最近消息时间倒序（有消息的会话先显示）
    items = sorted(conv_map.values(), key=lambda c: c["last_time"] or "", reverse=True)
    return ok({"items": [ConversationOut.model_validate(c) for c in items]})


@router.get("/{user_id}")
def admin_chat_history(
    user_id: int,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """某会员的聊天记录（时间正序）：打开即读——该会员发来的未读消息
       标记已读，并返回最新未读总数（供前端即时刷新角标）。"""
    # 前置校验：会员存在（404 避免悬空会话）
    user = db.get(User, user_id)
    if not user:
        raise AppError.not_found("会员不存在")
    # 打开即读：会员发来的未读消息 → 已读
    db.query(ChatMessage).filter(
        ChatMessage.user_id == user_id,
        ChatMessage.sender == "user",
        ChatMessage.is_read_admin.is_(False),
    ).update({ChatMessage.is_read_admin: True}, synchronize_session=False)
    db.commit()
    # 聊天记录（时间正序展示）
    messages = (
        db.query(ChatMessage)
        .options(joinedload(ChatMessage.admin), joinedload(ChatMessage.product))
        .where(ChatMessage.user_id == user_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )
    # 角标刷新值：剩余未读总数
    unread_total = db.query(ChatMessage).filter(
        ChatMessage.sender == "user",
        ChatMessage.is_read_admin.is_(False),
    ).count()
    return ok({
        "user": {
            "id": user.id,
            "nickname": user.nickname,
            "phone": user.phone,
            "avatar": user.avatar,
        },
        "items": [msg_to_out(m) for m in messages],
        "unread_total": unread_total,
    })


@router.post("/{user_id}", status_code=201)
def admin_reply(
    user_id: int,
    body: MessageIn,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """管理员回复：方向 admin，记录操作管理员（审计），会员侧未读置 false。"""
    user = db.get(User, user_id)
    if not user:
        raise AppError.not_found("会员不存在")
    msg = ChatMessage(
        user_id=user_id,
        product_id=body.product_id,
        sender="admin",
        admin_id=admin.id,          # 记录回复人（审计追溯）
        content=body.content.strip(),
        is_read_user=False,         # 发给会员 → 会员侧未读
        created_by=admin.username,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return ok(msg_to_out(msg), "回复已发送")
