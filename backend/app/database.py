# =============================================================================
# app/database.py — 数据库连接与会话管理
# -----------------------------------------------------------------------------
# 功能：创建 SQLAlchemy 2.x 引擎、声明基类 Base 与请求级会话依赖 get_db。
# 说明：开发环境 SQLite（需 check_same_thread=False 以支持 FastAPI 线程池），
#       生产环境 PostgreSQL 通过 DATABASE_URL 无缝切换（ORM 不写方言特性，
#       对应开发技术文档 §1.2 与数据库文档 §1.2「SQLite→PG 迁移风险」规避）。
# =============================================================================

from collections.abc import Generator  # 类型标注：生成器

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings

# ---- 引擎创建：根据连接串自动适配方言 ----
# SQLite 场景下 check_same_thread=False 允许跨线程使用连接（FastAPI 异步线程池必需）
_connect_args = (
    {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}
)

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=_connect_args,
    pool_pre_ping=True,  # 取出连接前先 ping，避免失效连接（生产环境友好）
)

# ---- 会话工厂：autocommit=False + 显式 commit 的事务模式 ----
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    """ORM 声明基类：所有模型继承此类（对应数据库文档 §1.3 公共字段约定）。"""


def get_db() -> Generator[Session, None, None]:
    """FastAPI 依赖：为每个请求提供独立数据库会话，请求结束自动关闭。

    使用方式：`def endpoint(db: Session = Depends(get_db))`
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
