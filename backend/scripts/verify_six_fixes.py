# -*- coding: utf-8 -*-
"""验证 #1-#6：新闻分页/产品排序/列宽/轮播跳转/联系我们地图/消息记录滚动"""
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


s, r = req("POST", "/api/user/login", body={"phone": "13800000001", "password": "123456"})
assert s == 200
ut = r["data"]["token"]
s, r = req("POST", "/api/auth/login", body={"username": "admin", "password": "admin123456"})
assert s == 200
at = r["data"]["token"]
user_ls = json.dumps({"state": {"userToken": ut, "nickname": "宫阙会员", "avatar": "default-1", "isLogin": True}, "version": 0})
admin_ls = json.dumps({"state": {"adminToken": at, "admin": {"id": 1, "username": "admin", "name": "超管", "role_id": 1, "dept_id": None}, "isLogin": True}, "version": 0})

results = {}

# 准备：记录产品 1 当前 sort_order；给 banner 1 设置 link_url
s, r = req("GET", "/api/admin/products/1", at)
orig_sort = r["data"]["sort_order"]
s, r = req("GET", "/api/admin/banners", at)
banner1 = r["data"][0] if isinstance(r["data"], list) else r["data"]["items"][0]
orig_link = banner1.get("link_url")
req("PUT", f"/api/admin/banners/{banner1['id']}", at, {"link_url": "/products"})
# 设置地图嵌入地址
req("PUT", "/api/admin/settings/contact", at, {"map_url": "https://uri.amap.com/marker?position=116.39,39.90"})

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # ---------- #1 新闻分页（后端分页参数验证） ----------
    s, r = req("GET", "/api/public/news?page=1&page_size=10")
    results["news_page"] = len(r["data"]["items"]) <= 10 and r["data"]["page_size"] == 10
    print(f"#1 新闻分页(每页≤10条): {'✅' if results['news_page'] else '❌'} items={len(r['data']['items'])}")

    # ---------- #3 产品列宽（DOM 检查） ----------
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    ctx.add_init_script(f"localStorage.setItem('tsgq-admin-auth', '{admin_ls}')")
    page = ctx.new_page()
    page.goto("http://localhost:5174/admin/products", wait_until="networkidle")
    page.wait_for_timeout(2500)
    # 产品列 header 宽度
    col_w = page.evaluate("""() => {
      const th = [...document.querySelectorAll('.ant-table-thead th')].find(t => t.textContent.trim() === '产品')
      return th ? th.getBoundingClientRect().width : 0
    }""")
    results["col_width"] = 150 < col_w < 300
    print(f"#3 产品列宽={col_w:.0f}px(目标 240 左右): {'✅' if results['col_width'] else '❌'}")
    # 排序列存在
    sort_col = page.locator("th").filter(has_text="排序").count() > 0
    results["sort_col"] = sort_col
    print(f"#2 后台排序列: {'✅' if sort_col else '❌'}")
    # 修改产品 1 排序为 999（移到最后）
    page.locator("th").filter(has_text="排序").first  # 确保表格加载
    page.wait_for_timeout(500)
    ctx.close()

    # ---------- #2 产品排序 → 前台顺序变化 ----------
    req("PUT", "/api/admin/products/1", at, {"sort_order": 999})
    s, r = req("GET", "/api/public/products?page_size=50")
    order = [i["id"] for i in r["data"]["items"]]
    first5 = order[:5]
    results["product_sort"] = 1 not in first5  # 产品 1 应被排到最后
    print(f"#2 前台排序生效(产品1排最后): {'✅' if results['product_sort'] else '❌'} 前5={first5}")
    # 恢复
    req("PUT", "/api/admin/products/1", at, {"sort_order": orig_sort})

    # ---------- #4 轮播图跳转 ----------
    ctx4 = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx4.new_page()
    page.goto("http://localhost:5173/", wait_until="networkidle")
    page.wait_for_timeout(2000)
    carousel_link = page.locator(".carousel a[href='/products']").count()
    results["banner_link"] = carousel_link > 0
    page.screenshot(path="D:/tmp/e2e_banner_link.png")
    print(f"#4 轮播图点击跳转(带 href 链接): {'✅' if carousel_link else '❌'}")
    ctx4.close()

    # ---------- #5 联系我们地图 ----------
    ctx5 = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx5.new_page()
    page.goto("http://localhost:5173/contact", wait_until="domcontentloaded")
    page.wait_for_timeout(2000)
    map_iframe = page.locator("iframe[title='门店地图']").count()
    has_intent_form = page.locator("text=提交团购意向").count()
    results["contact_map"] = map_iframe > 0 and has_intent_form == 0
    page.screenshot(path="D:/tmp/e2e_contact_map.png")
    print(f"#5 联系我们地图渲染(iframe)且无表单: {'✅' if results['contact_map'] else '❌'} iframe={map_iframe}")
    ctx5.close()

    # ---------- #6 消息记录不滚动到底部 ----------
    ctx6 = browser.new_context(viewport={"width": 1440, "height": 900})
    ctx6.add_init_script(f"localStorage.setItem('tsgq-user-auth', '{user_ls}')")
    page = ctx6.new_page()
    page.goto("http://localhost:5173/profile", wait_until="networkidle")
    page.wait_for_timeout(2000)
    # 滚动到页面中部（模拟用户位置）
    page.evaluate("window.scrollTo(0, 400)")
    page.wait_for_timeout(400)
    before = page.evaluate("window.scrollY")
    # 点击消息记录 tab
    page.locator("button").filter(has_text="消息记录").first.click()
    page.wait_for_timeout(2500)
    after = page.evaluate("window.scrollY")
    results["chat_scroll"] = abs(after - before) < 50
    page.screenshot(path="D:/tmp/e2e_chat_scroll.png")
    print(f"#6 消息记录不自动滚动(前={before} 后={after}): {'✅' if results['chat_scroll'] else '❌'}")
    ctx6.close()

    browser.close()

# 恢复 banner 链接
req("PUT", f"/api/admin/banners/{banner1['id']}", at, {"link_url": orig_link})

ok = all(results.values())
print(f"\n=== #1-#6 六项需求验证{'✅ 全部通过' if ok else '❌ 有失败项'} ===")
sys.exit(0 if ok else 1)
