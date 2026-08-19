"""${message}

Revision ID: ${up_revision}
Revises: ${down_revision | comma,n}
Create Date: ${create_date}

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
${imports if imports else ""}

# revision identifiers, used by Alembic.
revision: str = ${repr(up_revision)}
down_revision: Union[str, None] = ${repr(down_revision)}
branch_labels: Union[str, Sequence[str], None] = ${repr(branch_labels)}
depends_on: Union[str, Sequence[str], None] = ${repr(depends_on)}


def upgrade() -> None:
    """升级：执行迁移变更（创建表/索引/字段）。"""
    ${upgrades if upgrades else "pass"}


def downgrade() -> None:
    """回滚：撤销升级变更（顺序与 upgrade 相反）。"""
    ${downgrades if downgrades else "pass"}
