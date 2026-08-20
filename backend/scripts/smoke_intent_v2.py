# -*- coding: utf-8 -*-
"""意向功能扩展冒烟：产品名/撤销/删除/回收站/恢复/永久删除"""
import json
import sys
import urllib.error
import urllib.request

BASE = "http://127.0.0.1:8000"
PASS = 0


def ok(name, cond, extra=""):
    global PASS
    mark = "✅" if cond else "❌"
    print(f"{mark} {name} {extra}")
    if cond:
        PASS += 1
    return cond


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


# 登录
s, r = req("POST", "/api/user/login", body={"phone": "13800000001", "password": "123456"})
assert s == 200
ut = r["data"]["token"]
s, r = req("POST", "/api/auth/login", body={"username": "admin", "password": "admin123456"})
assert s == 200
at = r["data"]["token"]

# 1. 提交意向（带来源产品 11）
s, r = req("POST", "/api/user/intents", ut, {"name": "测试员", "phone": "13800000001", "company": "测试公司", "source": "product", "product_id": 11})
ok("提交意向(带产品)", s == 201, f"id={r['data'].get('id')}")
iid = r["data"]["id"]

# 2. 用户侧列表：带产品名
s, r = req("GET", "/api/user/intents", ut)
item = next((x for x in r["data"]["items"] if x["id"] == iid), None)
ok("用户侧意向带产品名", item and item["product_name"] == "企业定制·尊享礼盒", f"product_name={item and item['product_name']}")

# 3. 后台详情带产品名
s, r = req("GET", f"/api/admin/intents/{iid}", at)
ok("后台详情带产品名", s == 200 and r["data"]["product_name"] == "企业定制·尊享礼盒", f"source={r['data'].get('source')} product={r['data'].get('product_name')}")

# 4. 用户撤销（pending → revoked）
s, r = req("POST", f"/api/user/intents/{iid}/revoke", ut)
ok("用户撤销意向", s == 200 and r["data"]["status"] == "revoked")

# 5. 重复撤销 → 422
s, r = req("POST", f"/api/user/intents/{iid}/revoke", ut)
ok("重复撤销被拒(422)", s == 422)

# 6. 用户删除已撤销意向（revoked → deleted）
s, r = req("DELETE", f"/api/user/intents/{iid}", ut)
ok("用户删除已撤销意向", s == 200)

# 7. 删除后用户列表不可见
s, r = req("GET", "/api/user/intents", ut)
ok("删除后用户列表不可见", not any(x["id"] == iid for x in r["data"]["items"]))

# 8. 后台回收站列表可见（状态 deleted）
s, r = req("GET", "/api/admin/intents/trash", at)
trash_item = next((x for x in r["data"]["items"] if x["id"] == iid), None)
ok("回收站可见(状态=deleted)", trash_item is not None and trash_item["status"] == "deleted")

# 9. 后台恢复（→ pending，详情字段保持）
s, r = req("POST", f"/api/admin/intents/{iid}/restore", at)
ok("后台恢复意向(→pending)", s == 200 and r["data"]["status"] == "pending")
s, r = req("GET", f"/api/admin/intents/{iid}", at)
ok("恢复后详情字段保持", r["data"]["company"] == "测试公司" and r["data"]["product_name"] == "企业定制·尊享礼盒")

# 10. 后台删除任意状态 → 回收站
s, r = req("DELETE", f"/api/admin/intents/{iid}", at)
ok("后台删除意向", s == 200)
s, r = req("GET", "/api/admin/intents/trash", at)
ok("删除后进回收站", any(x["id"] == iid for x in r["data"]["items"]))

# 11. 永久删除
s, r = req("DELETE", f"/api/admin/intents/{iid}/permanent", at)
ok("永久删除", s == 200)
s, r = req("GET", "/api/admin/intents/trash", at)
ok("永久删除后回收站无记录", not any(x["id"] == iid for x in r["data"]["items"]))

# 12. 正常列表不含 deleted
s, r = req("GET", "/api/admin/intents", at)
ok("正常列表无已删除项", all(x["status"] != "deleted" for x in r["data"]["items"]))

print(f"\n=== 意向功能扩展冒烟 {PASS}/15 通过 ===")
sys.exit(0 if PASS == 15 else 1)
