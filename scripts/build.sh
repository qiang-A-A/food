#!/usr/bin/env bash
# =============================================================================
# 天上宫阙 · 生产构建脚本
# 功能：构建 前台 + 后台 静态产物（dist/），供 Nginx 托管
# 用法：在仓库根目录执行  bash scripts/build.sh
# 产物：frontend/dist（前台）、admin/dist（后台）
# =============================================================================
set -e  # 任何步骤失败即退出

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NPM="${NPM:-npm}"   # 可用环境变量覆盖 npm 命令（如指向受管 Node 的 npm.cmd）

echo "═══════════════════════════════════════════════"
echo "  天上宫阙 · 生产构建（前台 + 后台）"
echo "═══════════════════════════════════════════════"

# ---- 1. 前置检查：依赖是否已安装（node_modules 存在与否）----
if [ ! -d "$ROOT/node_modules" ]; then
  echo "❌ 未找到 node_modules，请先执行：npm install"
  exit 1
fi

# ---- 2. 清理旧产物（尽力而为；部分安全软件会拦截删除，失败不阻断——
#       Vite 构建时默认 emptyOutDir=true 会自动清空 dist 目录）----
echo "▶ 清理旧构建产物…"
rm -rf "$ROOT/frontend/dist" "$ROOT/admin/dist" 2>/dev/null \
  || echo "  ⚠ 旧产物清理被系统拦截（可忽略，构建会自动覆盖）"

# ---- 3. 并行构建前后台（后台含 AntD 体积较大，耗时更久）----
echo "▶ 构建前台…"
( cd "$ROOT/frontend" && "$NPM" run build ) &
FE_PID=$!

echo "▶ 构建后台…"
( cd "$ROOT/admin" && "$NPM" run build ) &
ADMIN_PID=$!

# 等待两个构建都完成；任一失败则整体失败（set -e 配合 wait 返回值）
wait "$FE_PID"
wait "$ADMIN_PID"

# ---- 4. 输出产物摘要 ----
echo ""
echo "✅ 构建完成，产物清单："
du -sh "$ROOT/frontend/dist" 2>/dev/null | sed 's/^/  前台: /'
du -sh "$ROOT/admin/dist" 2>/dev/null | sed 's/^/  后台: /'
echo ""
echo "  部署方式：将 frontend/dist 与 admin/dist 内容复制到服务器，"
echo "  按 deploy/nginx.conf 配置 Nginx（前端 → 静态托管，/api → 后端反代）。"
echo "  详见 DEPLOY.md。"
