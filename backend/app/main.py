# =============================================================================
# app/main.py — FastAPI 应用入口
# -----------------------------------------------------------------------------
# 功能：创建 FastAPI 实例，配置 CORS、静态文件服务与基础路由，
#       并挂载后续各业务路由（public / user / auth / admin，M3 阶段填充）。
# 说明：对应方案 §3.1 总体架构；/api/health 用于冒烟与健康检查；
#       响应统一信封 {code, message, data} 约定在 M3 由工具函数落地。
# =============================================================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware  # 跨域中间件
from fastapi.staticfiles import StaticFiles  # 静态文件（上传图片/视频访问）

from app.config import settings

# ---- 应用实例：Swagger 文档标题使用配置中的应用名 ----
app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    description="天上宫阙 宫廷糕点企业官网后端 API（PRD v2.1 对应实现）",
    docs_url="/docs",   # Swagger UI 地址
    redoc_url="/redoc", # ReDoc 文档地址
)

# ---- CORS：允许前台(5173)/后台(5174)开发端口跨域访问 ----
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,  # 白名单来自配置
    allow_credentials=True,               # 允许携带 Cookie（登录态备用）
    allow_methods=["*"],                  # 允许所有 HTTP 方法
    allow_headers=["*"],                  # 允许所有请求头
)

# ---- 静态文件：挂载上传目录，图片/视频通过 /uploads/... 访问 ----
# 目录不存在时自动创建（存储实现细节在 M3 storage 模块完善）
import os  # 标准库：文件系统操作

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


# ---- 健康检查接口：验证服务与数据库可用性 ----
@app.get("/api/health", tags=["系统"])
def health_check():
    """冒烟测试与负载均衡健康检查：返回服务状态与时间戳。"""
    from datetime import datetime  # 标准库：时间

    # 简单探测数据库连通性（执行 SELECT 1），失败时返回 503 语义的响应
    try:
        from sqlalchemy import text  # 原生 SQL 文本（仅用于探测，业务一律走 ORM）
        from app.database import engine
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_status = "ok"
    except Exception:  # 数据库不可用时仍返回服务存活，但标注 db 异常
        db_status = "error"

    return {"code": 0, "message": "服务正常", "data": {
        "app": settings.APP_NAME,
        "status": "running",
        "db": db_status,
        "time": datetime.now().isoformat(),
    }}


# ---- 根路径提示（避免访问 / 时 404 迷惑）----
@app.get("/", tags=["系统"])
def root():
    """根路径：提示前往 /docs 查看接口文档。"""
    return {"message": "天上宫阙后端服务已启动，接口文档请访问 /docs"}


# ---- 业务路由挂载（M3 阶段启用）----
# 预留：from app.routers import public, user, auth, admin
# app.include_router(public.router, prefix="/api/public", tags=["前台公开"])
# app.include_router(user.router, prefix="/api/user", tags=["用户"])
# app.include_router(auth.router, prefix="/api/auth", tags=["超管认证"])
# app.include_router(admin.router, prefix="/api/admin", tags=["后台管理"])
