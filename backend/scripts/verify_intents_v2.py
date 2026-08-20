# -*- coding: utf-8 -*-
"""验证 #4-#7：意向产品名/定制页公司必填/登录返回/意向撤销删除回收站"""
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


# 登录态
s, r = req("POST", "/api/user/login", body={"phone": "13800000001", "password": "123456"})
assert s == 200
ut = r["data"]["token"]
s, r = req("POST", "/api/auth/login", body={"username": "admin", "password": "admin123456"})
assert s == 200
at = r["data"]["token"]
user_ls = json.dumps({"state": {"userToken": ut, "nickname": "宫阙会员", "avatar": "default-1", "isLogin": True}, "version": 0})
admin_ls = json.dumps({"state": {"adminToken": at, "admin": {"id": 1, "username": "admin", "name": "超管", "role_id": 1, "dept_id": None}, "isLogin": True}, "version": 0})

# 造一条带产品名的意向（source=product, product_id=11）
s, r = req("POST", "/api/user/intents", ut, {"name": "E2E测试", "phone": "13800000001", "company": "E2E公司", "source": "product", "product_id": 11})
assert s == 201, r
IID = r["data"]["id"]

results = {}

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # ---------- #5 前台定制页：公司必填 ----------
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    ctx.add_init_script(f"localStorage.setItem('tsgq-user-auth', '{user_ls}')")
    page = ctx.new_page()
    page.goto("http://localhost:5173/customize", wait_until="networkidle")
    page.wait_for_timeout(2000)
    # 公司字段带 * 且存在
    company_label = page.locator("text=公司名称 *").count() > 0
    page.screenshot(path="D:/tmp/e2e_customize.png")
    results["customize_company"] = company_label
    print(f"#5 定制页公司必填: {'✅' if company_label else '❌'}")
    ctx.close()

    # ---------- #6 登录页返回首页按钮 ----------
    ctx2 = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx2.new_page()
    page.goto("http://localhost:5173/login", wait_until="networkidle")
    page.wait_for_timeout(1500)
    back_btn = page.locator("text=返回首页").count() > 0
    page.screenshot(path="D:/tmp/e2e_login_back.png")
    results["login_back"] = back_btn
    print(f"#6 登录页返回首页按钮: {'✅' if back_btn else '❌'}")
    ctx2.close()

    # ---------- #7 个人中心：撤销 → 已撤销 → 删除 ----------
    ctx3 = browser.new_context(viewport={"width": 1440, "height": 900})
    ctx3.add_init_script(f"localStorage.setItem('tsgq-user-auth', '{user_ls}')")
    page = ctx3.new_page()
    # 原生 confirm 对话框：自动点「确定」（否则 Playwright 默认 dismiss 导致操作不执行）
    page.on("dialog", lambda d: d.accept())
    page.goto("http://localhost:5173/profile", wait_until="networkidle")
    page.wait_for_timeout(2000)
    page.locator("button").filter(has_text="我的意向").first.click()
    page.wait_for_timeout(1500)
    # 新意向处于 pending → 显示撤销按钮
    has_revoke = page.locator("button").filter(has_text="撤销意向").count() > 0
    page.screenshot(path="D:/tmp/e2e_intents.png")
    # 点击撤销（confirm 自动确认）
    if has_revoke:
        page.locator("button").filter(has_text="撤销意向").first.click()
        page.wait_for_timeout(1800)
    # 撤销后：该意向状态变已撤销（卡片内状态 Tag，非提示文字）+ 显示删除按钮
    revoked_tag = page.locator("span").filter(has_text="已撤销").count() > 0
    has_delete = page.locator("button").filter(has_text="删除").count() > 0
    page.screenshot(path="D:/tmp/e2e_intents_revoked.png")
    results["intent_revoke"] = has_revoke and revoked_tag and has_delete
    print(f"#7 我的意向撤销流程(撤销按钮/已撤销状态/删除按钮): {'✅' if (has_revoke and revoked_tag and has_delete) else '❌'}")
    ctx3.close()

    # ---------- #4+#7 后台：产品名 + 回收站 ----------
    ctx4 = browser.new_context(viewport={"width": 1440, "height": 900})
    ctx4.add_init_script(f"localStorage.setItem('tsgq-admin-auth', '{admin_ls}')")
    page = ctx4.new_page()
    page.goto(f"http://localhost:5174/admin/intents", wait_until="networkidle")
    page.wait_for_timeout(2500)
    # 列表来源列显示产品详情（产品名）
    src_shown = page.locator("text=产品详情（企业定制·尊享礼盒）").count() > 0
    # 打开详情 → 来源旁显示产品名
    page.locator("button").filter(has_text="详情").first.click()
    page.wait_for_timeout(1200)
    detail_src = page.locator("text=产品详情（企业定制·尊享礼盒）").count() > 0
    detail_del_btn = page.locator("button").filter(has_text="删除意向").count() > 0
    page.screenshot(path="D:/tmp/e2e_admin_detail.png")
    results["admin_product_name"] = src_shown and detail_src and detail_del_btn
    print(f"#4 后台详情产品名+删除按钮: {'✅' if (src_shown and detail_src and detail_del_btn) else '❌'}")
    # 删除 → 回收站可见（AntD Popconfirm 按钮文本为「删 除」，取 popover 内最后一个）
    page.locator("button").filter(has_text="删除意向").first.click()
    page.wait_for_timeout(1000)
    page.locator(".ant-popover button, .ant-popconfirm button").filter(has_text="删").last.click()
    page.wait_for_timeout(1800)
    page.goto("http://localhost:5174/admin/intents/trash", wait_until="networkidle")
    page.wait_for_timeout(2000)
    trash_visible = page.locator("text=已删除").count() > 0
    restore_btn = page.locator("button").filter(has_text="恢").count() > 0  # AntD 2 字按钮渲染为「恢 复」
    perm_btn = page.locator("button").filter(has_text="永久删除").count() > 0
    page.screenshot(path="D:/tmp/e2e_admin_trash.png")
    results["trash"] = trash_visible and restore_btn and perm_btn
    print(f"#7 回收站(已删除/恢复/永久删除): {'✅' if (trash_visible and restore_btn and perm_btn) else '❌'}")
    ctx4.close()

    browser.close()

ok = all(results.values())
print(f"\n=== #4-#7 需求验证{'✅ 全部通过' if ok else '❌ 有失败项'} ===")
sys.exit(0 if ok else 1)
