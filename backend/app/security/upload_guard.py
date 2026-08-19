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
        size: 文件大小（字节；0 表示未知——流式写入前只做扩展名校验）
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
    # 大小上限校验（失败 → 413 文件过大；流式场景 size=0 跳过，由写入端限长）
    max_bytes = rule["max_mb"] * 1024 * 1024
    if size > max_bytes:
        raise AppError(4130, f"文件过大，最大允许 {rule['max_mb']}MB", 413)
    return ext


# 图片魔数表：扩展名 → 文件头特征（magic bytes 嗅探，防内容伪装绕过扩展名校验）
_IMAGE_MAGIC = {
    ".jpg": (b"\xff\xd8\xff",),
    ".jpeg": (b"\xff\xd8\xff",),
    ".png": (b"\x89PNG\r\n\x1a\n",),
    ".webp": (b"RIFF",),  # WebP 以 RIFF 头 + 偏移 8 处 "WEBP" 标识
}


def guard_magic_bytes(kind: str, ext: str, head: bytes) -> None:
    """魔数嗅探：校验文件头与扩展名一致（审计修复 2026-08-19 新增）。

    此前上传仅校验扩展名，Content-Type 与文件内容完全不看——
    任意二进制/HTML 内容伪装成 .png 即可入库。现对图片类
    （image/avatar/qrcode）校验文件头；视频（mp4）不做深度嗅探
    （ffprobe 成本高，暂以扩展名 + 大小限制兜底）。
    """
    if kind == "video":
        return
    sample = head[:16]  # 取文件头 16 字节覆盖各格式特征长度
    if not sample:
        raise AppError(4150, "文件内容为空或无法识别", 415)
    if ext == ".webp":
        # WebP：RIFF 头 + 偏移 8 处必须为 "WEBP"（避免误判 WAV/AVI 等 RIFF 家族）
        if not sample.startswith(b"RIFF") or sample[8:12] != b"WEBP":
            raise AppError(4150, "文件内容与扩展名不符，请上传真实图片文件", 415)
        return
    signatures = _IMAGE_MAGIC.get(ext)
    if not signatures:
        return  # 未知扩展名类型：由 guard_upload 已拦截，理论不可达
    if not any(sample.startswith(sig) for sig in signatures):
        raise AppError(4150, "文件内容与扩展名不符，请上传真实图片文件", 415)
