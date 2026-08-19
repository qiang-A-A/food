# -*- coding: utf-8 -*-
"""消息功能端到端冒烟测试：用户发消息 → 后台角标/会话 → 打开已读 → 回复 → 用户查看"""
import json
import urllib.request
import urllib.error

BASE = "http://127.0.0.1:8000"


def req(method, path, token=None, body=None):
    url = BASE + path
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, method=method)
    if token:
        r.add_header("Authorization", f"Bearer {token}")
    if data:
        r.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(r, timeout=5) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())


# 1. 用户登录（演示账号）
s, r = req("POST", "/api/user/login", body={"phone": "13800000001", "password": "123456"})
assert s == 200, f"用户登录失败: {s} {r}"
user_token = r["data"]["token"]
print("1.✅ 用户登录成功")

# 2. 用户发送消息（带来源产品 1）
s, r = req("POST", "/api/user/messages", user_token, {"content": "你好，想咨询这款礼盒的起订量", "product_id": 1})
assert s == 201, f"发送消息失败: {s} {r}"
print("2.✅ 用户发送消息成功，消息id:", r["data"]["id"])

# 3. 后台登录
s, r = req("POST", "/api/auth/login", body={"username": "admin", "password": "admin123456"})
assert s == 200, f"后台登录失败: {s} {r}"
admin_token = r["data"]["token"]
print("3.✅ 后台登录成功")

# 4. 后台未读数 → 应为 1
s, r = req("GET", "/api/admin/messages/unread-count", admin_token)
assert s == 200 and r["data"]["count"] == 1, f"未读数异常: {s} {r}"
print("4.✅ 后台未读数 =", r["data"]["count"])

# 5. 会话列表 → 应显示用户 + 产品名 + 未读 1
s, r = req("GET", "/api/admin/messages/conversations", admin_token)
assert s == 200 and len(r["data"]["items"]) >= 1, f"会话列表异常: {s} {r}"
conv = r["data"]["items"][0]
print("5.✅ 会话列表:", conv["user_nickname"], "| 来源产品:", conv["product_name"], "| 未读:", conv["unread"])

# 6. 打开会话 → 记录 + 未读清零（角标下降）
user_id = conv["user_id"]
s, r = req("GET", f"/api/admin/messages/{user_id}", admin_token)
assert s == 200 and r["data"]["items"], f"聊天记录异常: {s} {r}"
print("6.✅ 打开会话，消息数:", len(r["data"]["items"]), "| 剩余未读:", r["data"]["unread_total"])

# 7. 管理员回复
s, r = req("POST", f"/api/admin/messages/{user_id}", admin_token, {"content": "您好，这款礼盒 50 盒起订，具体可电话沟通"})
assert s == 201, f"回复失败: {s} {r}"
print("7.✅ 管理员回复成功")

# 8. 用户查看聊天记录 → 应含管理员回复
s, r = req("GET", "/api/user/messages", user_token)
assert s == 200 and any(m["sender"] == "admin" for m in r["data"]["items"]), f"用户侧记录异常: {s} {r}"
print("8.✅ 用户侧可见管理员回复，总消息数:", r["data"]["total"])

# 9. 用户未读数 → 打开已读后为 0
s, r = req("GET", "/api/user/messages/unread", user_token)
assert s == 200 and r["data"]["count"] == 0, f"用户未读异常: {s} {r}"
print("9.✅ 用户未读数 =", r["data"]["count"])

print("\n🎉 消息功能端到端冒烟全部通过")
