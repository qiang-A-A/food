# -*- coding: utf-8 -*-
"""验证产品详情页改造：产品说明按钮+弹窗、提交意向已删除"""
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
user_token = r["data"]["token"]
user_ls = json.dumps({"state": {"userToken": user_token, "nickname": "宫阙会员", "avatar": "default-1", "isLogin": True}, "version": 0})

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    ctx.add_init_script(f"localStorage.setItem('tsgq-user-auth', '{user_ls}')")
    page = ctx.new_page()

    page.goto("http://localhost:5173/products/11", wait_until="networkidle")
    page.wait_for_timeout(2000)

    btns = [t.strip() for t in page.locator("button").all_text_contents() if t.strip()]
    print("页面按钮:", btns)

    # ① 产品说明按钮存在
    has_desc_btn = any("产品说明" in b for b in btns)
    # ② 提交意向按钮已删除
    has_intent_btn = any("提交意向" in b for b in btns)
    # ③ 立即预约/咨询顾问仍在
    has_book = any("立即预约" in b for b in btns)
    has_consult = any("咨询顾问" in b for b in btns)
    print(f"① 产品说明按钮: {has_desc_btn}")
    print(f"② 提交意向已删除: {not has_intent_btn}")
    print(f"③ 立即预约/咨询顾问: {has_book}/{has_consult}")
    page.screenshot(path="D:/tmp/pd_1_buttons.png")

    # ④ 点击产品说明 → 弹窗
    page.locator("button").filter(has_text="产品说明").first.click()
    page.wait_for_timeout(1000)
    dialog_visible = page.locator("text=产品说明").count() >= 1 and page.locator("role=dialog").count() > 0
    print(f"④ 产品说明弹窗出现: {dialog_visible}")
    page.screenshot(path="D:/tmp/pd_2_desc_dialog.png")
    # 弹窗内应有正文内容（富文本渲染，检查非空段落）
    dialog = page.locator("role=dialog").first
    body_text = dialog.inner_text()
    has_content = len(body_text.strip()) > 10
    print(f"⑤ 弹窗含说明内容: {has_content}（长度 {len(body_text.strip())}）")
    # 关闭弹窗
    page.locator("button[aria-label='关闭']").first.click()
    page.wait_for_timeout(500)
    dialog_closed = page.locator("role=dialog").count() == 0
    print(f"⑥ 弹窗可关闭: {dialog_closed}")

    browser.close()
    ok = has_desc_btn and (not has_intent_btn) and has_book and has_consult and dialog_visible and has_content and dialog_closed
    print(f"\n=== 产品详情页改造验证{'✅ 全部通过' if ok else '❌ 有失败项'} ===")
    sys.exit(0 if ok else 1)
