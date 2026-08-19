# =============================================================================
# app/auth/password.py — 密码哈希工具
# -----------------------------------------------------------------------------
# 功能：bcrypt 密码哈希生成与校验（开发技术文档 §5.2）。
# 说明：直接使用 bcrypt 库（passlib 1.7.4 与 bcrypt 5.x 存在 72 字节兼容问题，
#       已实测弃用 passlib，改用 bcrypt 原生 API）。
# =============================================================================

import bcrypt


def hash_password(plain: str) -> str:
    """生成 bcrypt 哈希（输入明文，返回可存储的哈希字符串）。"""
    # bcrypt 5.x：hashpw 接收 bytes + salt，返回 bytes；解码为 str 存储
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """校验明文与哈希是否匹配（返回布尔值，供登录/改密使用）。"""
    try:
        # checkpw 返回 bool；捕获格式异常避免错误哈希导致 500
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False
