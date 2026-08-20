# -*- coding: utf-8 -*-
"""复验三问题：新闻翻页可见/产品排序即时生效/轮播图整屏可点跳转"""
import json
import sys
import urllib.request

from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8000"


def req(method, path, token=None, body=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(BASE + path, data=data, method=method)
    if token:
        r.add_header("Authorization", f"Bearer {token}")
    if data:
        r.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(r, timeout=5) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())


s, r = req("POST", "/api/auth/login", body={"username": "admin", "password": "admin123456"})
assert s == 200
at = r["data"]["token"]
admin_ls = json.dumps({"state": {"adminToken": at, "admin": {"id": 1, "username": "admin", "name": "超管", "role_id": 1, "dept_id": None}, "isLogin": True}, "version": 0})

results = {}

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # ---------- ① 新闻翻页 UI 出现并可翻页 ----------
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    page.goto("http://localhost:5173/news", wait_until="networkidle")
    page.wait_for_timeout(2000)
    page_btns = page.locator("button").filter(has_text="2").count()
    items_p1 = page.locator("a[href^='/news/']").count()
    # 点第 2 页
    page.locator("button").filter(has_text="2").first.click()
    page.wait_for_timeout(1500)
    items_p2 = page.locator("a[href^='/news/']").count()
    url_p2 = page.url
    results["news_paging"] = page_btns > 0 and items_p1 <= 10 and items_p2 <= 10 and "page=2" in url_p2
    print(f"① 新闻翻页: 页码按钮={page_btns>0} 第1页{items_p1}条 第2页{items_p2}条 url={url_p2.split('/')[-1]}")
    ctx.close()

    # ---------- ② 产品排序链路（API 验证：保存 → 后台列表按序 → 前台按序） ----------
    # 后台列表应按 sort_order 升序（产品 1 sort=1 应在列表前部）
    s, r = req("GET", "/api/admin/products?page=1&page_size=50", at)
    admin_order = [i["id"] for i in r["data"]["items"]]
    # 设产品 1 排序 999 → 前后台都应排最后
    s, r = req("PUT", "/api/admin/products/1", at, {"sort_order": 999})
    saved = s == 200
    s, r = req("GET", "/api/admin/products?page=1&page_size=50", at)
    admin_after = [i["id"] for i in r["data"]["items"]]
    results["sort_admin"] = saved and admin_after[-1] == 1
    # 前台顺序
    s, r = req("GET", "/api/public/products?page_size=50")
    order = [i["id"] for i in r["data"]["items"]]
    results["sort_front"] = order[-1] == 1
    # 恢复
    req("PUT", "/api/admin/products/1", at, {"sort_order": 1})
    print(f"② 排序保存+后台列表按序+前台按序: {'✅' if (results['sort_admin'] and results['sort_front']) else '❌'} 后台末位={admin_after[-1]} 前台末位={order[-1]}")

    # ---------- ③ 轮播图整屏点击跳转（点标语中央区域） ----------
    ctx3 = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx3.new_page()
    page.goto("http://localhost:5173/", wait_until="networkidle")
    page.wait_for_timeout(2500)
    links = page.locator(".carousel a").count()
    # 先切到第 2 张（link=/products，内链跳转稳定可验）
    page.locator(".carousel button[aria-label^='切换到第 2 张']").first.click()
    page.wait_for_timeout(1200)
    carousel = page.locator(".carousel")
    box = carousel.bounding_box()
    page.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
    page.wait_for_timeout(2000)
    current_url = page.url
    results["banner_click"] = links > 0 and current_url.startswith("http://localhost:5173/products")
    page.screenshot(path="D:/tmp/e2e_banner_click.png")
    print(f"③ 轮播链接数={links} 切第2张点中央后 URL={current_url.split('?')[0]}")
    ctx3.close()

    browser.close()

ok = all(results.values())
print(f"\n=== 三问题复验{'✅ 全部通过' if ok else '❌ 有失败项'} ===")
sys.exit(0 if ok else 1)
