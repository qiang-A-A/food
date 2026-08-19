# =============================================================================
# app/storage/backend.py — 文件存储抽象层
# -----------------------------------------------------------------------------
# 功能：封装本地文件存储（LocalBackend），提供 save/delete 能力
#       （开发技术文档 §5.4 / ADR-3 StorageBackend 抽象）。
# 说明：MVP 使用本地 uploads 目录（已挂载 /uploads 静态访问）；
#       生产可扩展 OssBackend（接对象存储）而不改动业务调用方。
# =============================================================================

import os  # 文件系统操作
import uuid  # 随机文件名（防覆盖/遍历）
from datetime import datetime  # 年月目录

from fastapi import UploadFile  # FastAPI 上传文件类型

from app.config import settings
from app.security.upload_guard import guard_magic_bytes, guard_upload  # 上传守卫（扩展名 + 魔数）
from app.utils.errors import AppError  # 业务异常（413 超限）

# 用途子目录（与守卫 kind 对齐，目录隔离便于清理与权限）
KIND_DIR = {"image": "images", "video": "videos", "avatar": "avatars", "qrcode": "images"}


class LocalBackend:
    """本地文件存储：保存到 UPLOAD_DIR/{kind}/{yyyyMM}/{uuid}{ext}。"""

    def save(self, file: UploadFile, kind: str) -> dict:
        """保存上传文件，返回 {url, kind, size}。

        随机文件名规则：uuid4 十六进制 + 校验后的扩展名（防路径遍历/覆盖）。

        审计修复（2026-08-19）：此前先 file.read() 全量读入内存再做大小校验，
        大文件（如 100MB 视频）会吃满内存且无 Content-Length 前置拦截，存在
        OOM DoS。改为流式分块写入 + 边写边限长：超限立即中断并抛 413。
        """
        # 先做扩展名白名单校验（不依赖文件内容，前置拦截 415）
        ext = guard_upload(file.filename or "", 0, kind)

        # 目录：uploads/{kind目录}/{年-月}/
        sub_dir = KIND_DIR[kind]
        month_dir = datetime.now().strftime("%Y%m")
        target_dir = os.path.join(settings.UPLOAD_DIR, sub_dir, month_dir)
        os.makedirs(target_dir, exist_ok=True)  # 目录不存在则创建

        # 随机文件名 + 扩展名
        filename = f"{uuid.uuid4().hex}{ext}"
        full_path = os.path.join(target_dir, filename)

        # 流式写入：分块读取，累计大小超限即中断（防内存耗尽 DoS）
        max_bytes = {"image": settings.MAX_IMAGE_MB, "video": settings.MAX_VIDEO_MB,
                     "avatar": 2, "qrcode": 5}[kind] * 1024 * 1024
        chunk_size = 1024 * 1024  # 1MB 分块
        total = 0
        first_chunk = True  # 首块需做魔数嗅探（内容与扩展名一致性校验）
        try:
            with open(full_path, "wb") as f:
                while True:
                    chunk = file.file.read(chunk_size)
                    if not chunk:
                        break
                    total += len(chunk)
                    if total > max_bytes:
                        raise AppError(4130, f"文件过大，最大允许 {max_bytes // (1024*1024)}MB", 413)
                    if first_chunk:
                        # 首块：校验文件头与扩展名一致（防任意内容伪装图片）
                        guard_magic_bytes(kind, ext, chunk)
                        first_chunk = False
                    f.write(chunk)
        except Exception:
            # 写入中断（超限/IO 异常）：清理已写入的残缺文件
            if os.path.exists(full_path):
                os.remove(full_path)
            raise

        # 可访问 URL：/uploads/{kind}/{yyyyMM}/{filename}（前端经 Vite 代理访问）
        url = f"/uploads/{sub_dir}/{month_dir}/{filename}"
        return {"url": url, "kind": kind, "size": total}

    def delete(self, url: str) -> None:
        """删除已上传文件（回收站清理时调用；本地实现，失败静默）。"""
        # 仅允许删除 /uploads/ 前缀的本地资源，防任意路径删除
        if url.startswith("/uploads/"):
            rel = url[len("/uploads/"):]
            full = os.path.join(settings.UPLOAD_DIR, rel)
            if os.path.exists(full) and os.path.isfile(full):
                os.remove(full)


# 模块级单例：供路由层直接引用
storage = LocalBackend()
