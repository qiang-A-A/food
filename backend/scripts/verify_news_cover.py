# -*- coding: utf-8 -*-
"""验证新闻封面改造：编辑弹窗应有「上传」按钮 + URL 输入框双入口"""
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


# 后台登录拿 token
s, r = req("POST", "/api/auth/login", body={"username": "admin", "password": "admin123456"})
assert s == 200, f"后台登录失败: {s}"
admin_token = r["data"]["token"]
admin_ls = json.dumps({"state": {"adminToken": admin_token, "admin": {"id": 1, "username": "admin", "name": "超管", "role_id": 1, "dept_id": None}, "isLogin": True}, "version": 0})

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    ctx.add_init_script(f"localStorage.setItem('tsgq-admin-auth', '{admin_ls}')")
    page = ctx.new_page()

    # 打开新闻管理
    page.goto("http://localhost:5174/admin/news", wait_until="networkidle")
    page.wait_for_timeout(2500)

    # 点击「新增新闻」
    page.locator("button").filter(has_text="新增").first.click()
    page.wait_for_timeout(1500)

    # 检查封面字段：上传按钮 + URL 输入框
    has_upload_btn = page.locator("text=上传").count() > 0
    has_url_input = page.locator("input[placeholder*='图片 URL'], input[placeholder*='URL']").count() > 0
    has_hint = page.locator("text=首张为封面").count() > 0
    print(f"封面上传按钮: {has_upload_btn}")
    print(f"URL 手动输入框: {has_url_input}")
    print(f"上传提示文案: {has_hint}")
    page.screenshot(path="D:/tmp/news_cover_uploader.png")

    # 真实上传：选图 → 回填 URL 到输入框
    page.locator("input[type='file']").first.set_input_files("D:/tmp/test_cover.png")
    page.wait_for_timeout(2500)  # 等上传完成
    url_value = page.locator("input[placeholder*='图片 URL'], input[placeholder*='URL']").first.input_value()
    # 上传接口返回相对路径（/uploads/...，前端代理与生产同域均可访问）
    uploaded = url_value.startswith("/uploads/")
    print(f"上传回填 URL: {url_value[:60]}")
    page.screenshot(path="D:/tmp/news_cover_uploaded.png")

    browser.close()
    ok = has_upload_btn and has_url_input and has_hint and uploaded
    print(f"\n=== 封面改造验证{'✅ 通过' if ok else '❌ 失败'} ===")
    sys.exit(0 if ok else 1)
