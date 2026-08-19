#!/usr/bin/env bash
# =============================================================================
# 天上宫阙 · 开发环境一键启动脚本
# 功能：同时启动 后端(8000) + 前台(5173) + 后台(5174) 三个开发服务
# 用法：在仓库根目录执行  bash scripts/start-dev.sh
# 说明：适用于 Git Bash（Windows）或任意类 Unix shell
#
# 审计修复（2026-08-19）：
#   1. 前端/后台改用 npm workspace 方式启动（与手动 npm run dev 等效）
#   2. 自动探测 npm：兼容 npm、npm.cmd、WorkBuddy 受管 Node 等多种环境
#      （此前 D:\Git 的 Git Bash 终端 PATH 中无 npm → "command not found"）
#   3. 探活 HTTP 000 时不再谎报"三端已启动"，明确指出失败端口与日志路径
# =============================================================================
set -e  # 任何命令失败即退出

# ---- 路径常量 ----
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND="$ROOT/backend"
PYTHON="$BACKEND/.venv/Scripts/python.exe"
[ -x "$PYTHON" ] || PYTHON="$BACKEND/.venv/bin/python"

echo "═══════════════════════════════════════════════"
echo "  天上宫阙 · 开发服务一键启动"
echo "═══════════════════════════════════════════════"
echo "  后端  → http://localhost:8000  (Swagger: /docs)"
echo "  前台  → http://localhost:5173"
echo "  后台  → http://localhost:5174  (登录: /admin/login)"
echo ""

# ---- 1. 前置检查：venv 与 node_modules ----
if [ ! -f "$PYTHON" ]; then
  echo "❌ 未找到后端虚拟环境：$PYTHON"
  echo "   请先执行：cd backend && python -m venv .venv && .venv/Scripts/python.exe -m pip install -e \".[dev]\""
  exit 1
fi
if [ ! -d "$ROOT/node_modules" ]; then
  echo "❌ 未找到 node_modules，请先执行：npm install"
  exit 1
fi

# ---- 2. 自动探测 npm ----
# 优先级：用户指定 → PATH 里的 npm → WorkBuddy 受管 Node → 系统 Node
# （用户 Git Bash 终端的 PATH 可能不含 Node，但受管 Node 通常存在）
detect_npm() {
  if [ -n "${NPM:-}" ] && command -v "$NPM" >/dev/null 2>&1; then
    command -v "$NPM"; return
  fi
  # PATH 中直接可用
  if command -v npm >/dev/null 2>&1; then command -v npm; return; fi
  if command -v npm.cmd >/dev/null 2>&1; then command -v npm.cmd; return; fi
  # WorkBuddy 受管 Node（与本项目构建/部署脚本一贯使用；Git Bash 下
  # $HOME 自动转为 /c/Users/林启扬 等形式，对中文用户名也可靠）
  local wb_npm
  wb_npm=$(ls -d "$HOME/.workbuddy/binaries/node"/versions/*/npm.cmd 2>/dev/null | head -1)
  if [ -n "$wb_npm" ]; then echo "$wb_npm"; return; fi
  # 系统 Node（Node 安装包通常带 npm.cmd）
  local sys_node
  sys_node=$(command -v node 2>/dev/null)
  if [ -n "$sys_node" ]; then
    local npm_candidate
    npm_candidate="$(dirname "$sys_node")/npm.cmd"
    [ -f "$npm_candidate" ] && echo "$npm_candidate" && return
  fi
  echo ""  # 未找到
}

NPM_PATH="$(detect_npm)"
if [ -z "$NPM_PATH" ]; then
  echo "❌ 未找到 npm 命令"
  echo "   解决方案（任选其一）："
  echo "   1) 用绝对路径调用本脚本：NPM=\"C:/Users/<你>/.workbuddy/binaries/node/versions/22.22.2/npm.cmd\" bash scripts/start-dev.sh"
  echo "   2) 安装 Node.js（https://nodejs.org/），确保 npm 在 PATH 中"
  echo "   3) 把受管 Node 临时加入 PATH：export PATH=\"\$HOME/.workbuddy/binaries/node/versions/22.22.2:\$PATH\""
  exit 1
fi
echo "  使用 npm: $NPM_PATH"

# ---- 3. 清理旧端口进程 ----
for port in 8000 5173 5174; do
  pid=$(netstat -ano 2>/dev/null | grep ":$port.*LISTENING" | awk '{print $NF}' | head -1)
  if [ -n "$pid" ]; then
    echo "  释放端口 $port（旧进程 PID $pid）"
    taskkill //F //PID "$pid" >/dev/null 2>&1 || kill "$pid" 2>/dev/null || true
  fi
done

# ---- 4. 启动后端 ----
echo "▶ 启动后端 (8000)…"
cd "$BACKEND"
PYTHONUTF8=1 "$PYTHON" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload \
  > /tmp/tsgq-backend.log 2>&1 &
BACKEND_PID=$!

# ---- 5. 启动前台/后台：npm workspace ----
echo "▶ 启动前台 (5173)…"
cd "$ROOT"
"$NPM_PATH" run dev:fe > /tmp/tsgq-frontend.log 2>&1 &
FRONTEND_PID=$!

echo "▶ 启动后台 (5174)…"
"$NPM_PATH" run dev:admin > /tmp/tsgq-admin.log 2>&1 &
ADMIN_PID=$!

# ---- 6. 探活（更宽松的等待 + 失败明确标记）----
sleep 10
FAILED=()
for entry in "8000:http://localhost:8000/api/health:后端" "5173:http://localhost:5173:前台" "5174:http://localhost:5174:后台"; do
  port="${entry%%:*}"
  rest="${entry#*:}"
  url="${rest%%:*}"
  name="${rest#*:}"
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "$url" 2>/dev/null || echo "000")
  echo "  $name $url → HTTP $code"
  if [ "$code" = "000" ]; then FAILED+=("$name(端口 $port，日志 /tmp/tsgq-${name// /-}.log)"); fi
done

echo ""
if [ ${#FAILED[@]} -eq 0 ]; then
  echo "✅ 三端已启动（日志：/tmp/tsgq-{backend,frontend,admin}.log）"
  echo "   停止全部服务：Ctrl+C 无效（后台运行），请分别结束 PIDs $BACKEND_PID $FRONTEND_PID $ADMIN_PID"
  echo "   演示账号：前台会员 13800000001 / 123456；后台超管 admin / admin123456"
else
  echo "⚠ 以下服务启动失败："
  for f in "${FAILED[@]}"; do echo "   - $f"; done
  echo ""
  echo "请查看对应日志排查（用 cat /tmp/tsgq-*.log）。"
  echo "常见原因：npm 不在 PATH（用 NPM=绝对路径 重跑）/ 端口被占用 / Node 版本过低。"
  exit 1
fi