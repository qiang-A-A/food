# =============================================================================
# app/security/upload_guard.py — 上传文件守卫（类型/大小校验）
# -----------------------------------------------------------------------------
# 功能：校验上传文件的扩展名与大小（开发技术文档 §5.4），
#       防止恶意文件上传（类型白名单 + 大小上限）。
# =============================================================================

import os  # 文件扩展名提取

from app.config import settings
from app.utils.errors import AppError

# 各 kind 允许的扩展名与大小上限（MB）
# kind ∈ {image, video, avatar, qrcode}（开发技术文档 §5.4 目录隔离）
KIND_RULES = {
    "image": {
        "exts": (".jpg", ".jpeg", ".png", ".webp"),
        "max_mb": settings.MAX_IMAGE_MB,   # 10MB
    },
    "video": {
        "exts": (".mp4",),
        "max_mb": settings.MAX_VIDEO_MB,   # 100MB
    },
    "avatar": {
        "exts": (".jpg", ".jpeg", ".png"),
        "max_mb": 2,                       # 头像 ≤2MB（PRD F-6 / UI/UX §6.5）
    },
    "qrcode": {
        "exts": (".jpg", ".jpeg", ".png", ".webp"),
        "max_mb": 5,
    },
}


def guard_upload(filename: str, size: int, kind: str) -> str:
    """校验上传文件，返回规范化的扩展名（含点）；不合法抛对应错误码。

    Args:
        filename: 原始文件名（用于取扩展名）
        size: 文件大小（字节）
        kind: 用途类型（image/video/avatar/qrcode）
    """
    # kind 必须是已知类型
    if kind not in KIND_RULES:
        raise AppError.param("未知的上传类型")

    rule = KIND_RULES[kind]
    # 扩展名白名单校验（失败 → 415 不支持的文件类型）
    ext = os.path.splitext(filename)[1].lower()
    if ext not in rule["exts"]:
        raise AppError(
            4150, f"不支持的文件类型，仅允许：{'/'.join(rule['exts'])}", 415
        )
    # 大小上限校验（失败 → 413 文件过大）
    max_bytes = rule["max_mb"] * 1024 * 1024
    if size > max_bytes:
        raise AppError(4130, f"文件过大，最大允许 {rule['max_mb']}MB", 413)
    return ext
