# =============================================================================
# app/services/paginate.py — 通用分页工具
# -----------------------------------------------------------------------------
# 功能：统一分页查询与响应拼装（开发技术文档 §5.6），
#       输出 {items, total, page, page_size, pages} 供前端分页组件消费。
# =============================================================================

import math  # 总页数计算（向上取整）

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session


def paginate(
    db: Session,
    query: Select,
    page: int = 1,
    page_size: int = 10,
    order_by=None,  # 可选排序表达式（如 Product.created_at.desc()）
) -> dict:
    """对查询执行分页并返回统一结构。

    Args:
        db: 数据库会话（执行查询）
        query: SQLAlchemy Select 查询（已含筛选条件）
        page: 页码（≥1）
        page_size: 每页条数（1~50，超出收敛）
        order_by: 排序表达式（可选，作用于最终查询）
    """
    # 参数安全收敛：页码至少 1，每页 1~50（开发技术文档 §10.1 分页上限 50）
    page = max(1, page)
    page_size = min(50, max(1, page_size))

    # 可选排序
    if order_by is not None:
        query = query.order_by(order_by)

    # 总数：基于当前查询构建 count 子查询（order_by(None) 清除排序，避免无意义开销）
    count_query = select(func.count()).select_from(query.order_by(None).subquery())
    total = db.execute(count_query).scalar() or 0

    # 当前页数据（SQLAlchemy 2.x 风格：scalars().all() 取出实体）
    page_query = query.offset((page - 1) * page_size).limit(page_size)
    items = db.execute(page_query).scalars().all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": math.ceil(total / page_size) if total else 0,
    }
