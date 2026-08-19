# =============================================================================
# app/config.py — 应用配置中心
# -----------------------------------------------------------------------------
# 功能：基于 pydantic-settings 统一加载环境变量 / .env 文件配置，
#       供全后端各模块引用（数据库、JWT、上传限制等）。
# 说明：对应方案 §5.2「配置」与数据库文档 §7 种子数据约定；
#       所有敏感项均从环境变量读取，禁止硬编码。
# =============================================================================

from functools import lru_cache  # 缓存配置实例，避免重复读取文件

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """应用配置模型：字段默认值与 .env 文件中的同名变量一一对应。"""

    # ---- 应用基础 ----
    APP_NAME: str = "天上宫阙官网后端服务"  # 应用名称（Swagger 标题使用）
    ENV: str = "development"                # 运行环境：development / production
    DEBUG: bool = True                      # 调试模式开关

    # ---- 安全：JWT ----
    SECRET_KEY: str = "change-me-to-a-random-64-hex-string"  # JWT 签名密钥（生产必须覆盖）
    ALGORITHM: str = "HS256"                # JWT 签名算法
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 访问令牌有效期（分钟），默认 24 小时

    # ---- 数据库 ----
    # 开发默认 SQLite（相对 backend 运行目录）；生产用 PostgreSQL 连接串
    DATABASE_URL: str = "sqlite:///./tsgq_dev.db"

    # ---- 文件上传限制 ----
    UPLOAD_DIR: str = "./uploads"  # 上传文件根目录
    MAX_IMAGE_MB: int = 10         # 图片大小上限（MB），对应 PRD §8
    MAX_VIDEO_MB: int = 100        # 视频大小上限（MB），对应 PRD §8（仅超管）
    ALLOWED_IMAGE_EXT: tuple = (".jpg", ".jpeg", ".png", ".webp")  # 图片类型白名单
    ALLOWED_VIDEO_EXT: tuple = (".mp4",)                          # 视频类型白名单

    # ---- 初始超级管理员（seed 脚本使用，首次部署后强制修改）----
    ADMIN_INITIAL_USERNAME: str = "admin"
    ADMIN_INITIAL_PASSWORD: str = "admin123456"

    # ---- CORS 白名单：前端开发端口（前台 5173 / 后台 5174）----
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ]

    model_config = SettingsConfigDict(
        env_file=".env",        # 自动读取 backend 运行目录下的 .env 文件
        env_file_encoding="utf-8",
        extra="ignore",         # 忽略未声明的环境变量，避免报错
    )


@lru_cache
def get_settings() -> Settings:
    """获取全局唯一配置实例（lru_cache 保证进程内只解析一次 .env）。"""
    return Settings()


# 模块级单例，供各模块直接 `from app.config import settings` 引用
settings = get_settings()

# ---- 生产环境安全门禁（代码审计 2026-08-19 新增）----
# 若生产环境未显式注入 SECRET_KEY（仍为默认值），直接拒绝启动：
# 默认密钥是公开常量，可离线伪造任意 admin JWT，属上线阻断项。
if settings.ENV == "production" and settings.SECRET_KEY == "change-me-to-a-random-64-hex-string":
    raise RuntimeError(
        "SECRET_KEY 未配置！生产环境禁止使用默认密钥，"
        "请在 .env 或环境变量中设置强随机密钥（可用：python -c \"import secrets;print(secrets.token_hex(32))\")"
    )
