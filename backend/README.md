# 天上宫阙后端服务

FastAPI + SQLAlchemy 2.x + Alembic，开发 SQLite / 生产 PostgreSQL。

```bash
python -m venv .venv
.venv/Scripts/activate  # Windows Git Bash: source .venv/Scripts/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000
```
