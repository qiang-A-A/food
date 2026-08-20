# -*- coding: utf-8 -*-
"""验证三项改动：①后台人员管理导航 ②关于我们页顶部开始 ③产品说明弹窗图片自适应"""
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


# 登录态准备
s, r = req("POST", "/api/user/login", body={"phone": "13800000001", "password": "123456"})
assert s == 200
user_token = r["data"]["token"]
user_ls = json.dumps({"state": {"userToken": user_token, "nickname": "宫阙会员", "avatar": "default-1", "isLogin": True}, "version": 0})

s, r = req("POST", "/api/auth/login", body={"username": "admin", "password": "admin123456"})
assert s == 200
admin_token = r["data"]["token"]
admin_ls = json.dumps({"state": {"adminToken": admin_token, "admin": {"id": 1, "username": "admin", "name": "超管", "role_id": 1, "dept_id": None}, "isLogin": True}, "version": 0})

results = {}

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # ---------- ① 后台人员管理导航 ----------
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    ctx.add_init_script(f"localStorage.setItem('tsgq-admin-auth', '{admin_ls}')")
    page = ctx.new_page()
    page.goto("http://localhost:5174/admin", wait_until="networkidle")
    page.wait_for_timeout(2500)
    menu_text = page.locator(".ant-menu-root").first.inner_text()
    has_personnel = "人员管理" in menu_text
    # 一级菜单不应再出现独立的 用户管理/管理员管理/部门管理/角色管理
    no_standalone_users = "用户管理" not in menu_text.split("人员管理")[0] if "人员管理" in menu_text else True
    # 展开人员管理 → 二级菜单出现
    page.locator(".ant-menu-root").locator("li").filter(has_text="人员管理").first.click()
    page.wait_for_timeout(800)
    sub_menu_text = page.locator(".ant-menu-root").first.inner_text()
    has_subs = all(k in sub_menu_text for k in ["用户管理", "管理员管理", "部门管理", "角色管理"])
    print(f"① 人员管理一级菜单: {has_personnel} | 二级四项: {has_subs} | 独立项已收纳: {no_standalone_users}")
    page.screenshot(path="D:/tmp/nav_personnel.png")
    results["personnel"] = has_personnel and has_subs and no_standalone_users
    ctx.close()

    # ---------- ② 关于我们从顶部开始 ----------
    ctx2 = browser.new_context(viewport={"width": 1440, "height": 900})
    ctx2.add_init_script(f"localStorage.setItem('tsgq-user-auth', '{user_ls}')")
    page = ctx2.new_page()
    # 先到首页并滚到底部
    page.goto("http://localhost:5173/", wait_until="networkidle")
    page.wait_for_timeout(1500)
    page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    page.wait_for_timeout(500)
    before_scroll = page.evaluate("window.scrollY")
    # 点击页脚「关于我们」链接
    page.locator("footer a, a[href='/about']").filter(has_text="关于我们").first.click()
    page.wait_for_timeout(2000)
    after_scroll = page.evaluate("window.scrollY")
    print(f"② 首页底部滚动={before_scroll} → 点击关于我们后 scrollY={after_scroll}")
    results["about_top"] = after_scroll <= 5
    ctx2.close()

    # ---------- ③ 产品说明弹窗图片自适应（产品 11 有说明） ----------
    ctx3 = browser.new_context(viewport={"width": 1440, "height": 900})
    ctx3.add_init_script(f"localStorage.setItem('tsgq-user-auth', '{user_ls}')")
    page = ctx3.new_page()
    page.goto("http://localhost:5173/products/11", wait_until="networkidle")
    page.wait_for_timeout(2000)
    page.locator("button").filter(has_text="产品说明").first.click()
    page.wait_for_timeout(1200)
    # 检查弹窗内图片是否溢出容器（img 宽度 ≤ 容器宽度）
    overflow = page.evaluate("""() => {
      const dialog = document.querySelector('[role=dialog]')
      if (!dialog) return null
      const imgs = dialog.querySelectorAll('img')
      if (!imgs.length) return 'no-img'
      const max = Math.max(...Array.from(imgs).map(i => i.getBoundingClientRect().width))
      return { imgMaxW: max, dialogW: dialog.getBoundingClientRect().width }
    }""")
    print(f"③ 说明弹窗图片宽度: {overflow}")
    no_overflow = overflow and overflow != 'no-img' and overflow["imgMaxW"] <= overflow["dialogW"] + 2
    page.screenshot(path="D:/tmp/desc_dialog_fit.png")
    results["desc_fit"] = bool(no_overflow)
    ctx3.close()

    browser.close()

ok = all(results.values())
print(f"\n=== 三项改动验证{'✅ 全部通过' if ok else '❌ 有失败项'} ===")
sys.exit(0 if ok else 1)
