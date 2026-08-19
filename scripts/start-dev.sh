#!/usr/bin/env bash
# =============================================================================
# 天上宫阙 · 开发环境一键启动脚本
# 功能：同时启动 后端(8000) + 前台(5173) + 后台(5174) 三个开发服务
# 用法：在仓库根目录执行  bash scripts/start-dev.sh
# 说明：适用于 Git Bash（Windows）或任意类 Unix shell
#
# 审计修复（2026-08-19）：前端/后台改用 npm workspace 方式启动
# （与手动 `npm run dev --workspace=...` 完全等效）——此前直接用
# `node_modules/.bin/vite --config xxx` 从仓库根启动，vite 的 root 默认取
# cwd 而非配置文件所在目录，会找不到 index.html 导致启动失败。
# =============================================================================
set -e  # 任何命令失败即退出，避免"半启动"状态

# ---- 路径常量（以脚本所在目录定位仓库根，兼容任意工作目录调用）----
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND="$ROOT/backend"
PYTHON="$BACKEND/.venv/Scripts/python.exe"   # Windows venv 解释器
[ -x "$PYTHON" ] || PYTHON="$BACKEND/.venv/bin/python"  # 类 Unix venv 回退
NPM="${NPM:-npm}"   # npm 命令（可用环境变量覆盖，如指向受管 Node 的 npm.cmd）

echo "═══════════════════════════════════════════════"
echo "  天上宫阙 · 开发服务一键启动"
echo "═══════════════════════════════════════════════"
echo "  后端  → http://localhost:8000  (Swagger: /docs)"
echo "  前台  → http://localhost:5173"
echo "  后台  → http://localhost:5174  (登录: /admin/login)"
echo ""

# ---- 1. 检查虚拟环境与依赖（不存在则给出创建指引）----
if [ ! -f "$PYTHON" ]; then
  echo "❌ 未找到后端虚拟环境：$PYTHON"
  echo "   请先执行：cd backend && python -m venv .venv && .venv/Scripts/python.exe -m pip install -e \".[dev]\""
  exit 1
fi
if [ ! -d "$ROOT/node_modules" ]; then
  echo "❌ 未找到 node_modules，请先执行：npm install"
  exit 1
fi

# ---- 2. 清理可能残留的旧端口进程（避免 8000/5173/5174 被旧实例占用）----
for port in 8000 5173 5174; do
  pid=$(netstat -ano 2>/dev/null | grep ":$port.*LISTENING" | awk '{print $NF}' | head -1)
  if [ -n "$pid" ]; then
    echo "  释放端口 $port（旧进程 PID $pid）"
    taskkill //F //PID "$pid" >/dev/null 2>&1 || kill "$pid" 2>/dev/null || true
  fi
done

# ---- 3. 启动后端（后台运行，日志落盘 /tmp）----
echo "▶ 启动后端 (8000)…"
cd "$BACKEND"
PYTHONUTF8=1 "$PYTHON" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload \
  > /tmp/tsgq-backend.log 2>&1 &
BACKEND_PID=$!

# ---- 4. 启动前台 (5173) 与 后台 (5174)：npm workspace 方式（cwd 自动切换）----
echo "▶ 启动前台 (5173)…"
cd "$ROOT"
"$NPM" run dev:fe > /tmp/tsgq-frontend.log 2>&1 &
FRONTEND_PID=$!

echo "▶ 启动后台 (5174)…"
"$NPM" run dev:admin > /tmp/tsgq-admin.log 2>&1 &
ADMIN_PID=$!

# ---- 5. 等待就绪并探活 ----
sleep 8
for url in "http://localhost:8000/api/health" "http://localhost:5173" "http://localhost:5174"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
  echo "  $url → HTTP $code"
done

echo ""
echo "✅ 三端已启动（日志：/tmp/tsgq-{backend,frontend,admin}.log）"
echo "   停止全部服务：Ctrl+C 无效（后台运行），请分别结束 PIDs $BACKEND_PID $FRONTEND_PID $ADMIN_PID"
echo "   演示账号：前台会员 13800000001 / 123456；后台超管 admin / admin123456"
