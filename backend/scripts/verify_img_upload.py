# -*- coding: utf-8 -*-
"""验证轮播图/系列/联系我们设置 3 处图片字段均已加上传功能（含上传回填实测）"""
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
admin_token = r["data"]["token"]
admin_ls = json.dumps({"state": {"adminToken": admin_token, "admin": {"id": 1, "username": "admin", "name": "超管", "role_id": 1, "dept_id": None}, "isLogin": True}, "version": 0})

results = {}

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    ctx.add_init_script(f"localStorage.setItem('tsgq-admin-auth', '{admin_ls}')")
    page = ctx.new_page()

    # ---------- ① 轮播图管理 ----------
    page.goto("http://localhost:5174/admin/banners", wait_until="networkidle")
    page.wait_for_timeout(2200)
    page.locator("button").filter(has_text="上传轮播图").first.click()
    page.wait_for_timeout(1200)
    b1 = page.locator("text=上传").count() > 0          # 上传按钮
    b2 = page.locator("input[placeholder*='URL']").count() > 0  # 手动输入框
    # 实测上传回填
    page.locator("input[type='file']").first.set_input_files("D:/tmp/test_cover.png")
    page.wait_for_timeout(2500)
    url_val = page.locator("input[placeholder*='URL']").first.input_value()
    b3 = url_val.startswith("/uploads/")
    print(f"① 轮播图: 上传按钮={b1} 手动URL={b2} 上传回填={b3} ({url_val[:40]})")
    page.screenshot(path="D:/tmp/banner_upload.png")
    page.locator("button").filter(has_text="取 消").first.click()
    page.wait_for_timeout(800)
    results["banners"] = b1 and b2 and b3

    # ---------- ② 系列管理 ----------
    page.goto("http://localhost:5174/admin/categories", wait_until="networkidle")
    page.wait_for_timeout(2200)
    page.locator("button").filter(has_text="新增").first.click()
    page.wait_for_timeout(1200)
    c1 = page.locator("text=上传").count() > 0
    c2 = page.locator("input[placeholder*='URL']").count() > 0
    print(f"② 系列管理: 上传按钮={c1} 手动URL={c2}")
    page.screenshot(path="D:/tmp/category_upload.png")
    page.locator("button").filter(has_text="取 消").first.click()
    page.wait_for_timeout(800)
    results["categories"] = c1 and c2

    # ---------- ③ 联系我们设置 ----------
    # 注：该页二维码已有 seed 值 → ImageUploader 显示缩略图而非"上传"按钮
    #     （有图时上传按钮隐藏，属正常逻辑）；以文件输入框 + URL 输入框渲染为准
    page.goto("http://localhost:5174/admin/settings/contact", wait_until="networkidle")
    page.wait_for_timeout(2200)
    d1 = page.locator("input[type='file']").count() > 0   # 上传能力（隐藏 file input）
    d2 = page.locator("input[placeholder*='URL']").count() > 0  # 手动 URL 输入
    d3 = page.locator("text=保存").count() > 0
    print(f"③ 联系我们: 上传能力={d1} 手动URL={d2}")
    page.screenshot(path="D:/tmp/contact_upload.png")
    results["contact"] = d1 and d2 and d3

    browser.close()

ok = all(results.values())
print(f"\n=== 三处图片上传改造验证{'✅ 全部通过' if ok else '❌ 有失败项'} ===")
sys.exit(0 if ok else 1)
