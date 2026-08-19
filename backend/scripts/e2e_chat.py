# -*- coding: utf-8 -*-
"""端到端验证：前台咨询聊天 → 后台消息管理回复 → 个人中心记录（Playwright）
登录方式：API 登录 → 注入 localStorage（避免 UI 选择器脆弱）
"""
import json
import urllib.error
import urllib.request

from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8000"
SHOT_DIR = "D:/tmp"


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


def main():
    # ---- API 预登录：用户 + 管理员 ----
    s, r = req("POST", "/api/user/login", body={"phone": "13800000001", "password": "123456"})
    assert s == 200, f"用户登录失败: {s}"
    user_token = r["data"]["token"]
    s, r = req("POST", "/api/auth/login", body={"username": "admin", "password": "admin123456"})
    assert s == 200, f"后台登录失败: {s}"
    admin_token = r["data"]["token"]

    # localStorage 注入脚本（zustand persist 结构）
    user_ls = json.dumps({"state": {"userToken": user_token, "nickname": "宫阙会员", "avatar": "default-1", "isLogin": True}, "version": 0})
    admin_ls = json.dumps({"state": {"adminToken": admin_token, "admin": {"id": 1, "username": "admin", "name": "超管", "role_id": 1, "dept_id": None}, "isLogin": True}, "version": 0})

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # ========== 前台（预注入用户登录态） ==========
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        ctx.add_init_script(f"localStorage.setItem('tsgq-user-auth', '{user_ls}')")
        page = ctx.new_page()

        # ① 产品详情页按钮检查
        page.goto("http://localhost:5173/products/1", wait_until="networkidle")
        page.wait_for_timeout(1800)
        btns = [t.strip() for t in page.locator("button").all_text_contents() if t.strip()]
        print(f"① 产品页按钮: {btns[:8]}")
        assert any("提交意向" in b for b in btns), "缺少「提交意向」按钮"
        assert any("咨询顾问" in b for b in btns), "缺少「咨询顾问」按钮"
        page.screenshot(path=f"{SHOT_DIR}/e2e_1_product_buttons.png")

        # ② 点击咨询顾问 → 聊天弹窗
        page.locator("button").filter(has_text="咨询顾问").first.click()
        page.wait_for_timeout(1500)
        dialog_visible = page.locator("text=在线顾问").count() > 0
        print(f"② 聊天弹窗出现: {dialog_visible}")
        assert dialog_visible, "聊天弹窗未出现"
        page.screenshot(path=f"{SHOT_DIR}/e2e_2_chat_widget.png")

        # ③ 发送消息（含产品来源）
        page.locator("textarea").first.fill("您好，这款礼盒支持企业定制吗？")
        page.locator("button").filter(has_text="发送").first.click()
        page.wait_for_timeout(2000)
        sent = page.locator("text=支持企业定制吗").count() > 0
        print(f"③ 消息已发送并显示: {sent}")
        page.screenshot(path=f"{SHOT_DIR}/e2e_3_chat_sent.png")

        # ========== 后台（预注入管理员登录态） ==========
        ctx2 = browser.new_context(viewport={"width": 1440, "height": 900})
        ctx2.add_init_script(f"localStorage.setItem('tsgq-admin-auth', '{admin_ls}')")
        page2 = ctx2.new_page()
        page2.goto("http://localhost:5174/admin", wait_until="networkidle")
        page2.wait_for_timeout(2500)

        # ④ 侧栏「消息管理」角标
        badges = page2.locator(".ant-badge-count").all_text_contents()
        print(f"④ 消息管理角标数字: {badges}")
        page2.screenshot(path=f"{SHOT_DIR}/e2e_4_badge.png")

        # ⑤ 进入消息管理 → 会话列表（来源产品）
        page2.locator(".ant-menu").locator("li").filter(has_text="消息管理").first.click()
        page2.wait_for_timeout(2500)
        conv_items = page2.locator("text=来自产品").count()
        print(f"⑤ 会话列表含来源产品标记: {conv_items > 0}")
        page2.screenshot(path=f"{SHOT_DIR}/e2e_5_messages.png")

        # ⑥ 打开会话 → 角标应为 0 或消失（会话项显示昵称「宫阙会员」）
        page2.locator("button").filter(has_text="宫阙会员").first.click()
        page2.wait_for_timeout(2000)
        page2.screenshot(path=f"{SHOT_DIR}/e2e_6_chat_open.png")
        badges_after = page2.locator(".ant-badge-count").all_text_contents()
        print(f"⑥ 打开会话后角标: {badges_after}")

        # ⑦ 管理员回复
        page2.locator("textarea").first.fill("可以的，支持企业定制，50 盒起订")
        page2.locator("button").filter(has_text="发送回复").first.click()
        page2.wait_for_timeout(2500)
        replied = page2.locator("text=50 盒起订").count() > 0
        print(f"⑦ 管理员回复已发送: {replied}")
        page2.screenshot(path=f"{SHOT_DIR}/e2e_7_replied.png")

        # ========== 前台个人中心：消息记录 ==========
        page.goto("http://localhost:5173/profile", wait_until="networkidle")
        page.wait_for_timeout(2000)
        page.locator("button").filter(has_text="消息记录").first.click()
        page.wait_for_timeout(2500)
        admin_reply_visible = page.locator("text=50 盒起订").count() > 0
        print(f"⑧ 个人中心消息记录显示管理员回复: {admin_reply_visible}")
        page.screenshot(path=f"{SHOT_DIR}/e2e_8_profile_chat.png")

        browser.close()
        ok = dialog_visible and sent and conv_items > 0 and replied and admin_reply_visible
        print(f"\n=== E2E 验证{'✅ 全部通过' if ok else '❌ 存在失败项'} ===")
        sys_exit = 0 if ok else 1
        import sys
        sys.exit(sys_exit)


if __name__ == "__main__":
    main()
