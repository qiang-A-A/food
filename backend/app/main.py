# =============================================================================
# app/main.py — FastAPI 应用入口
# -----------------------------------------------------------------------------
# 功能：创建应用实例、配置 CORS/静态文件/健康检查、挂载全部业务路由
#       （public / user / auth / admin），并注册全局异常处理器——
#       统一响应信封 {code, message, data}（开发技术文档 §6 约定）。
# =============================================================================

import os  # 标准库：文件系统（上传目录）
from datetime import datetime  # 标准库：健康检查时间戳

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.routers import admin, auth, public, user
from app.utils.errors import AppError, ErrorCode

# ---- 应用实例 ----
app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    description="天上宫阙 宫廷糕点企业官网后端 API（PRD v2.1 对应实现）",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---- CORS：前台(5173)/后台(5174)开发端口 ----
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- 静态文件：上传目录（图片/视频经 /uploads 访问）----
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


# ============================================================
# 全局异常处理器（统一信封）
# ============================================================

@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    """业务异常 → 信封响应：{code, message, data:null} + 对应 HTTP 状态。"""
    return JSONResponse(
        status_code=exc.http_status,
        content={"code": exc.code, "message": exc.message, "data": None},
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    """Pydantic 参数校验失败 → 4000 参数错误（提取首个错误信息便于前端展示）。"""
    first = exc.errors()[0] if exc.errors() else {}
    msg = first.get("msg", "参数校验失败")
    return JSONResponse(
        status_code=400,
        content={"code": ErrorCode.PARAM_ERROR, "message": f"参数错误：{msg}", "data": None},
    )


@app.exception_handler(Exception)
async def unhandled_error_handler(request: Request, exc: Exception):
    """未捕获异常 → 500 内部错误（不泄露堆栈细节，开发环境可在日志查看）。"""
    # TODO 生产环境接入日志系统（如 structlog / sentry）
    return JSONResponse(
        status_code=500,
        content={"code": ErrorCode.INTERNAL_ERROR, "message": "服务器内部错误", "data": None},
    )


# ============================================================
# 基础接口
# ============================================================

@app.get("/api/health", tags=["系统"])
def health_check():
    """健康检查：验证服务与数据库连通性（冒烟/负载均衡探活）。"""
    try:
        from sqlalchemy import text  # 原生 SQL 探测（仅健康检查，业务一律 ORM）
        from app.database import engine
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_status = "ok"
    except Exception:
        db_status = "error"
    return {"code": 0, "message": "服务正常", "data": {
        "app": settings.APP_NAME,
        "status": "running",
        "db": db_status,
        "time": datetime.now().isoformat(),
    }}


@app.get("/", tags=["系统"])
def root():
    """根路径提示（避免访问 / 时 404 迷惑）。"""
    return {"message": "天上宫阙后端服务已启动，接口文档请访问 /docs"}


# ============================================================
# 业务路由挂载（对应开发技术文档 §6 接口分组）
# ============================================================

app.include_router(public.router, prefix="/api/public", tags=["前台公开"])
app.include_router(user.router, prefix="/api/user", tags=["用户"])
app.include_router(auth.router, prefix="/api/auth", tags=["超管认证"])
app.include_router(admin.router, prefix="/api/admin", tags=["后台管理"])
