# 天上宫阙 · 宫廷糕点企业官网

高端宫廷糕点品牌官网（高奢商务礼赠），FastAPI + React 全栈项目。

## 项目结构（Monorepo）

```
food/
├── backend/              # FastAPI 后端（SQLAlchemy 2.x + Alembic，SQLite/PG）
│   ├── app/              # 应用代码（config/database/models/schemas/routers/services...）
│   ├── uploads/          # 上传文件（图片/视频/头像）
│   └── .venv/            # Python 虚拟环境（不入库）
├── frontend/             # 前台展示系统（React18 + TS + Vite + Tailwind，宫廷红金风）
├── admin/                # 后台管理系统（React18 + TS + Vite + AntD5，商务简约风）
└── packages/api-client/  # 前后台共享 API 封装（Axios 实例/路径常量/TS 类型）
```

## 快速开始

### 1. 环境准备（首次）
```bash
# 后端：创建虚拟环境并安装依赖
cd backend
python -m venv .venv
.venv/Scripts/activate          # Git Bash 激活
pip install -e ".[dev]"

# 前端：仓库根目录执行（npm workspaces 自动安装 frontend/admin/packages 全部依赖）
cd .. && npm install
```

### 2. 启动开发服务（三个终端）
```bash
# 后端（端口 8000，Swagger 文档 /docs）
cd backend && .venv/Scripts/python.exe -m uvicorn app.main:app --reload --port 8000

# 前台（端口 5173，代理 /api → 8000）
npm run dev:fe

# 后台（端口 5174，代理 /api → 8000）
npm run dev:admin
```

## 文档索引

- PRD：`天上宫阙官网_PRD.md`（需求权威 v2.1）
- 设计：`天上宫阙UIUX设计文档.md`（视觉/交互 v2.0）
- 工程：`天上宫阙官网_开发技术文档.md`（工程落地 v1.0）
- 数据：`天上宫阙官网_数据库设计文档.md`（11 张表 v1.1）
- 方案：`天上宫阙官网_项目开发实施方案.md`（实施总纲 v1.1，需求已冻结）
