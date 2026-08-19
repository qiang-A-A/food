# =============================================================================
# alembic/env.py — Alembic 运行环境配置
# -----------------------------------------------------------------------------
# 功能：连接数据库（从应用配置读取 DATABASE_URL）、注册全部 ORM 模型到
#       metadata（供 autogenerate 对比生成迁移），并配置离线/在线两种模式。
# 说明：必须 import app.models 触发模型注册，否则 autogenerate 会漏表。
# =============================================================================

from logging.config import fileConfig  # 标准库：日志配置

from alembic import context  # Alembic 迁移上下文
from sqlalchemy import engine_from_config, pool  # SQLAlchemy 引擎工厂

from app.config import settings      # 应用配置（DATABASE_URL 来源）
from app.database import Base        # ORM 声明基类
import app.models  # noqa: F401 —— 关键：导入全部模型，注册到 Base.metadata

# Alembic 配置对象（读取 alembic.ini）
config = context.config

# 用应用配置覆盖 alembic.ini 中的 sqlalchemy.url（保证与运行环境一致）
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

# 若存在日志配置文件则加载（alembic.ini 已含 [loggers] 段）
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# 目标 metadata：全部模型的表结构元数据
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """离线模式：不连接数据库，仅根据 URL 生成 SQL 脚本（用于评审/CI）。"""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,          # 将参数直接内联进 SQL（便于查看）
        dialect_opts={"paramstyle": "named"},
        render_as_batch=True,        # SQLite 批量迁移兼容（改表结构必需）
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """在线模式：连接真实数据库执行迁移（开发/生产实际路径）。"""
    # 使用引擎工厂创建连接（支持连接池与方言自动适配）
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,     # 迁移场景不使用连接池，避免句柄残留
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=True,    # SQLite 批量模式：修改表结构时自动重建表
        )
        with context.begin_transaction():
            context.run_migrations()


# 依据配置选择执行模式
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
