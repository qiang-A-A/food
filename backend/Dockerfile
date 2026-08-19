# =============================================================================
# backend/Dockerfile — 后端生产镜像
# -----------------------------------------------------------------------------
# 功能：构建 FastAPI 后端生产镜像（Python 3.13-slim + 非 root 运行），
#       生产数据库建议外部 PostgreSQL（通过 DATABASE_URL 环境变量注入）。
# 构建：docker build -t tsgq-backend ./backend
# 运行：docker run -p 8000:8000 --env-file .env -v uploads:/app/uploads tsgq-backend
# =============================================================================

# ---- 构建阶段：安装依赖 ----
FROM python:3.13-slim AS builder

# 工作目录与编译依赖（部分包需 gcc 编译）
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends gcc libffi-dev && \
    rm -rf /var/lib/apt/lists/*

# 先拷贝依赖声明以利用 Docker 层缓存
COPY pyproject.toml ./
# 安装生产依赖（不含 dev 测试依赖）
RUN pip install --no-cache-dir .

# ---- 运行阶段：精简镜像 ----
FROM python:3.13-slim

# 非 root 用户（安全基线）
RUN useradd -m appuser
WORKDIR /app

# 从构建阶段复制已安装的依赖
COPY --from=builder /usr/local/lib/python3.13/site-packages /usr/local/lib/python3.13/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# 应用代码
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini ./

# 上传目录（运行时挂载卷持久化）
RUN mkdir -p /app/uploads && chown -R appuser:appuser /app
USER appuser

# 健康检查（对应 /api/health 接口）
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD python -c "import urllib.request;urllib.request.urlopen('http://127.0.0.1:8000/api/health')"

# 生产启动：uvicorn 多 worker（workers 数量按服务器核数调整）
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
