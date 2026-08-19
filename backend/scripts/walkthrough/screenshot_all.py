# =============================================================================
# scripts/walkthrough/screenshot_all.py — M6 浏览器走查：逐页截图 + 控制台错误
# -----------------------------------------------------------------------------
# 功能：用 Playwright（headless Chromium）遍历前台/后台关键页面，逐页截图
#       并捕获 console 错误（JS 异常/请求失败），输出走查结果 JSON。
# 前置：三端服务已启动（5173/5174/8000）。
# 用法：.venv/Scripts/python.exe scripts/walkthrough/screenshot_all.py
# =============================================================================

import json  # 结果序列化
import os  # 目录
import sys  # 退出码
from playwright.sync_api import sync_playwright

# 截图输出目录
OUT_DIR = os.path.join(os.path.dirname(__file__), "screenshots")
os.makedirs(OUT_DIR, exist_ok=True)

# 前台页面清单（路由 → 名称）
FRONT_PAGES = [
    ("/", "01-首页"),
    ("/products", "02-产品列表"),
    ("/products/1", "03-产品详情"),
    ("/news", "04-新闻列表"),
    ("/news/1", "05-新闻详情"),
    ("/about", "06-关于我们"),
    ("/customize", "07-礼盒定制"),
    ("/contact", "08-联系我们"),
    ("/login", "09-登录页"),
    ("/register", "10-注册页"),
]

# 后台页面（登录后访问）
ADMIN_PAGES = [
    ("/admin", "11-后台仪表盘"),
    ("/admin/products", "12-后台产品列表"),
    ("/admin/intents", "13-后台团购意向"),
]

results = []  # 每页：{name, ok, errors[]}


def check_page(page, url: str, name: str, need_login: bool = False) -> None:
    """访问页面 → 等待渲染 → 截图 → 记录 console 错误。"""
    errors: list[str] = []
    page.on("console", lambda msg: errors.append(f"[{msg.type}] {msg.text}") if msg.type == "error" else None)
    page.on("pageerror", lambda err: errors.append(f"[pageerror] {err}"))

    try:
        page.goto(url, timeout=20000)
        page.wait_for_load_state("networkidle", timeout=15000)
        page.wait_for_timeout(1200)  # 等待轮播/动画渲染
        # 截图（完整页）
        page.screenshot(path=os.path.join(OUT_DIR, f"{name}.png"), full_page=True)
        results.append({"name": name, "url": url, "ok": True, "errors": errors})
        print(f"  ✅ {name}（{url}）截图完成" + (f"，console 错误 {len(errors)} 条" if errors else ""))
    except Exception as exc:  # 页面加载失败
        results.append({"name": name, "url": url, "ok": False, "errors": [str(exc)]})
        print(f"  ❌ {name}（{url}）失败：{exc}")


def main() -> None:
    with sync_playwright() as p:
        # 使用已缓存的 Chromium（headless）
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})

        # ---- 前台页面 ----
        print("== 前台页面走查 ==")
        page = ctx.new_page()
        for path, name in FRONT_PAGES:
            check_page(page, f"http://localhost:5173{path}", name)
        page.close()

        # ---- 后台：先登录再访问 ----
        print("== 后台页面走查（先登录）==")
        page = ctx.new_page()
        # 登录页截图
        check_page(page, "http://localhost:5174/admin/login", "11a-后台登录页")
        # 执行超管登录
        page.goto("http://localhost:5174/admin/login", timeout=20000)
        page.wait_for_load_state("networkidle")
        page.get_by_placeholder("请输入用户名").fill("admin")
        page.get_by_placeholder("请输入密码").fill("admin123456")
        page.get_by_role("button", name="进入后台").click()
        page.wait_for_load_state("networkidle", timeout=15000)
        page.wait_for_timeout(1000)
        # 登录后逐页走查
        for path, name in ADMIN_PAGES:
            check_page(page, f"http://localhost:5174{path}", name)
        page.close()

        browser.close()

    # ---- 汇总输出 ----
    ok_count = sum(1 for r in results if r["ok"] and not r["errors"])
    print(f"\n==== 走查汇总：{len(results)} 页，正常 {ok_count} 页 ====")
    for r in results:
        status = "✅" if r["ok"] and not r["errors"] else ("⚠️" if r["ok"] else "❌")
        print(f"  {status} {r['name']}")
        for e in r["errors"][:5]:
            print(f"       ↳ {e[:120]}")
    # 结果落盘（供报告引用）
    with open(os.path.join(OUT_DIR, "walkthrough_result.json"), "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    # 有错误则退出码 1（提示需修复）
    sys.exit(1 if any(r["errors"] for r in results if r["ok"]) else 0)


if __name__ == "__main__":
    main()
