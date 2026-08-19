# 天上宫阙官网 · 部署手册（DEPLOY.md）

> 覆盖：**本地开发一键启动** 与 **生产部署全流程**（Linux + Nginx + PostgreSQL + 可选 Docker）。
> 前置要求：Node.js ≥ 20、Python ≥ 3.11、pnpm/npm、Git（本机）；服务器另需 Nginx、PostgreSQL。
> 生产环境资源（域名/ICP 备案/服务器）由客户按本手册准备后执行。

---

## 一、本地开发（一键启动）

### 1.1 首次准备（一次性）

```bash
# 后端：创建虚拟环境并安装依赖
cd backend
python -m venv .venv
.venv/Scripts/activate          # Windows Git Bash: source .venv/Scripts/activate
pip install -e ".[dev]"

# 前端：仓库根目录安装依赖（npm workspaces）
cd ..
npm install

# 数据库初始化（建 11 表 + 基础种子 + 演示数据）
cd backend
.venv/Scripts/python.exe -m alembic upgrade head
.venv/Scripts/python.exe -m app.seed
.venv/Scripts/python.exe -m app.seed_demo     # 演示数据（可选）
```

### 1.2 启动三端（也可运行一键脚本 `scripts/start-dev.sh`）

```bash
# 终端 1：后端（8000，Swagger /docs）
cd backend && .venv/Scripts/python.exe -m uvicorn app.main:app --reload --port 8000
# 终端 2：前台（5173）
npm run dev:fe
# 终端 3：后台（5174）
npm run dev:admin
```

访问：前台 http://localhost:5173 ｜ 后台 http://localhost:5174/admin/login
演示账号：会员 `13800000001` / `123456`；超管 `admin` / `admin123456`

---

## 二、生产部署（Linux + Nginx + PostgreSQL）

### 2.1 服务器准备

| 项 | 要求 |
|----|------|
| 操作系统 | Ubuntu 22.04 / CentOS 7+（本手册以 Ubuntu 为例） |
| 运行时 | Python 3.11+、Node.js 20+（仅构建用，可本机构建后上传产物） |
| 中间件 | Nginx、PostgreSQL 15+（或云数据库 RDS） |
| 域名 | 已备案域名（国内服务器必须 ICP 备案，备案周期 1-2 周，请提前） |

### 2.2 目录规划

```
/var/www/tsgq/
├── frontend-dist/      # 前台构建产物（frontend/dist 上传至此）
├── admin-dist/         # 后台构建产物（admin/dist 上传至此）
├── uploads/            # 后端上传文件（与 UPLOAD_DIR 一致）
└── backend/            # 后端代码 + .venv + .env
```

### 2.3 步骤

**① 本机构建前后端产物**（或服务器上执行）

```bash
cd <项目根>
npm run build --workspace=tsgq-frontend   # 产物 frontend/dist
npm run build --workspace=tsgq-admin      # 产物 admin/dist
```

**② 上传代码与产物**（scp/git clone 均可），目录结构见 2.2。

**③ 后端环境**

```bash
cd /var/www/tsgq/backend
python3 -m venv .venv
source .venv/bin/activate
pip install .                          # 生产依赖（不含 dev）
cp ../../deploy/.env.production.example .env
# 编辑 .env：SECRET_KEY / DATABASE_URL / ADMIN_INITIAL_PASSWORD（见模板注释）
nano .env
```

**④ 数据库（PostgreSQL）**

```sql
CREATE DATABASE tsgq WITH ENCODING='UTF8' LC_COLLATE='C' LC_CTYPE='C' TEMPLATE=template0;
CREATE USER tsgq_user WITH PASSWORD '强密码';
GRANT ALL PRIVILEGES ON DATABASE tsgq TO tsgq_user;
```

```bash
# 迁移 + 种子（在 backend 目录）
.venv/bin/python -m alembic upgrade head
.venv/bin/python -m app.seed                    # 基础种子（超管等）
# .venv/bin/python -m app.seed_demo             # 演示数据（正式环境建议不执行）
```

**⑤ Nginx 配置**

```bash
sudo cp ../../deploy/nginx.conf /etc/nginx/conf.d/tsgq.conf
sudo nano /etc/nginx/conf.d/tsgq.conf   # 改 server_name 为实际域名；路径按 2.2 调整
sudo nginx -t && sudo nginx -s reload
```

**⑥ 后端服务（systemd，随开机自启）**

创建 `/etc/systemd/system/tsgq-backend.service`：

```ini
[Unit]
Description=TSGQ Backend (FastAPI)
After=network.target postgresql.service

[Service]
User=www-data
WorkingDirectory=/var/www/tsgq/backend
EnvironmentFile=/var/www/tsgq/backend/.env
ExecStart=/var/www/tsgq/backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 2
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now tsgq-backend
sudo systemctl status tsgq-backend
```

**⑦ 上传目录权限**

```bash
sudo mkdir -p /var/www/tsgq/uploads
sudo chown -R www-data:www-data /var/www/tsgq/uploads
```

**⑧ 验证上线**

```bash
curl http://127.0.0.1:8000/api/health     # 后端健康（db:ok）
curl -I https://你的域名/                  # 前台
curl -I https://你的域名/admin            # 后台
```

---

## 三、生产部署（Docker 可选方案）

```bash
# 构建后端镜像
docker build -t tsgq-backend ./backend
# 运行（环境变量用 .env，uploads 持久化）
docker run -d --name tsgq-backend \
  -p 127.0.0.1:8000:8000 \
  --env-file backend/.env \
  -v /var/www/tsgq/uploads:/app/uploads \
  --restart always tsgq-backend
```

前端产物由 Nginx 托管（同 2.3 ⑤，`/api` 反代指向容器端口 8000）。

---

## 四、上线前检查清单

- [ ] `.env` 的 `SECRET_KEY` 已替换为随机长串、`ADMIN_INITIAL_PASSWORD` 已改强密码
- [ ] 数据库已切 PostgreSQL（`DATABASE_URL` 生产连接串）
- [ ] 上线后立即用新密码登录后台，并修改初始超管密码
- [ ] 页脚合规信息（联系方式设置）：热线 / 邮箱 / 地址 / 微信二维码 / **ICP 备案号** / **SC 食品生产许可**
- [ ] 企业素材替换：产品图 / Hero 轮播图 / 新闻封面 / 二维码（见 UI/UX §8.2 替换清单）
- [ ] Nginx `client_max_body_size 110m`（视频上传 ≤100MB 必需）
- [ ] 备份策略：PostgreSQL 每日备份（pg_dump cron）；uploads 目录定期备份
- [ ] 安全：HTTPS（Let's Encrypt 免费证书）；限制后台登录失败次数（可选）

---

## 五、常见运维命令

```bash
# 后端日志
sudo journalctl -u tsgq-backend -f
# 数据库备份
pg_dump -U tsgq_user tsgq > tsgq_backup_$(date +%F).sql
# 迁移升级（代码更新后）
cd /var/www/tsgq/backend && .venv/bin/python -m alembic upgrade head
# 重启后端
sudo systemctl restart tsgq-backend
```
