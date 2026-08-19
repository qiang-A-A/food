# =============================================================================
# app/main.py — FastAPI 应用入口
# -----------------------------------------------------------------------------
# 功能：创建应用实例、配置 CORS/静态文件/健康检查、挂载全部业务路由
#       （public / user / auth / admin），并注册全局异常处理器——
#       统一响应信封 {code, message, data}（开发技术文档 §6 约定）。
# =============================================================================

import logging  # 标准库：异常日志（审计修复：全局异常处理器补充日志）
import os  # 标准库：文件系统（上传目录）
from datetime import datetime  # 标准库：健康检查时间戳

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.routers import admin, auth, public, user
from app.utils.errors import AppError, ErrorCode

# ---- 日志配置：全局异常处理器与业务关键路径共用 ----
logger = logging.getLogger("tsgq")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

# ---- 应用实例（生产环境关闭 Swagger/ReDoc 文档，避免暴露接口地图）----
app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    description="天上宫阙 宫廷糕点企业官网后端 API（PRD v2.1 对应实现）",
    docs_url="/docs" if settings.ENV != "production" else None,
    redoc_url="/redoc" if settings.ENV != "production" else None,
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


@app.exception_handler(HTTPException)
async def http_error_handler(request: Request, exc: HTTPException):
    """通用 HTTP 异常 → 统一信封。

    主要覆盖 OAuth2PasswordBearer 抛出的裸 401（{detail: Not authenticated}，
    此前与统一信封 {code,message,data} 契约不一致，前端需兼容两种格式）。
    现在统一转为信封 4010，前端只需处理一种格式。
    """
    if exc.status_code == 401:
        return JSONResponse(
            status_code=401,
            content={"code": ErrorCode.UNAUTHORIZED, "message": exc.detail or "未登录或登录已过期", "data": None},
        )
    # 其余 HTTP 异常（403/404 等）保持原样转发
    return JSONResponse(
        status_code=exc.status_code,
        content={"code": exc.status_code * 10, "message": str(exc.detail), "data": None},
    )


@app.exception_handler(Exception)
async def unhandled_error_handler(request: Request, exc: Exception):
    """未捕获异常 → 500 内部错误（不泄露堆栈细节，日志完整记录以便排障）。"""
    # 审计修复：此前零日志，线上异常（如富文本净化 TypeError）无法发现
    logger.exception("未捕获异常: %s %s", request.method, request.url.path)
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
