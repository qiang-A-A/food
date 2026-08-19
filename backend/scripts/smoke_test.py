# =============================================================================
# backend/scripts/smoke_test.py — M3 接口冒烟测试脚本
# -----------------------------------------------------------------------------
# 功能：对关键业务链路做端到端冒烟验证（无需浏览器）：
#       前台公开 → 注册/登录 → 提交意向 → 超管登录 → 意向流转 → 产品软删恢复
#        → 回收站 → 上传。通过则打印 ✅，失败打印 ❌ 并保留错误信息。
# 用法：cd backend && .venv/Scripts/python.exe scripts/smoke_test.py
# =============================================================================

import sys  # 退出码
import httpx  # HTTP 客户端（已随 dev 依赖安装）

BASE = "http://127.0.0.1:8000"
client = httpx.Client(timeout=10)

PASS, FAIL = 0, 0


def check(name: str, cond: bool, detail: str = "") -> None:
    """断言打印：通过/失败计数。"""
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  ✅ {name}")
    else:
        FAIL += 1
        print(f"  ❌ {name} {detail}")


def main() -> None:
    print("== 1. 前台公开接口 ==")
    r = client.get(f"{BASE}/api/public/home")
    check("首页聚合", r.status_code == 200 and r.json()["data"]["banners"], str(r.json())[:120])
    r = client.get(f"{BASE}/api/public/products")
    data = r.json()["data"]
    check("产品列表(上架9个)", r.status_code == 200 and data["total"] == 9, f"total={data['total']}")
    pid = data["items"][0]["id"]
    r = client.get(f"{BASE}/api/public/products/{pid}")
    p = r.json()["data"]
    check("产品详情(含合规字段)", p.get("ingredients") and p.get("allergen"), "合规字段缺失!")
    r = client.get(f"{BASE}/api/public/categories")
    check("品类列表(5个)", len(r.json()["data"]) == 5, str(len(r.json()["data"])))
    r = client.get(f"{BASE}/api/public/news")
    check("新闻列表(上架5条)", r.json()["data"]["total"] == 5, f"total={r.json()['data']['total']}")
    r = client.get(f"{BASE}/api/public/about")
    check("关于我们(5卖点)", len(r.json()["data"]["selling_points"]) == 5)
    r = client.get(f"{BASE}/api/public/contact")
    check("联系方式(热线非空)", bool(r.json()["data"].get("contact_phone")))

    print("== 2. 用户注册/登录/意向 ==")
    import random
    phone = f"139{random.randint(10000000, 99999999)}"
    r = client.post(f"{BASE}/api/user/register", json={
        "phone": phone, "password": "test123456", "confirm_password": "test123456", "nickname": "冒烟用户",
    })
    check("用户注册(注册即登录)", r.status_code in (200, 201) and r.json()["data"]["token"], str(r.json())[:150])
    user_token = r.json()["data"]["token"]
    u_headers = {"Authorization": f"Bearer {user_token}"}
    r = client.get(f"{BASE}/api/user/profile", headers=u_headers)
    check("个人资料", r.status_code == 200 and r.json()["data"]["phone"] == phone)
    r = client.post(f"{BASE}/api/user/intents", headers=u_headers, json={
        "name": "冒烟测试", "phone": phone, "company": "测试企业",
        "requirement": "中秋团购冒烟测试", "quantity_range": "50-100", "source": "contact",
    })
    check("提交团购意向", r.status_code == 201 and r.json()["data"]["status"] == "pending", str(r.json())[:150])
    intent_id = r.json()["data"]["id"]
    r = client.get(f"{BASE}/api/user/intents", headers=u_headers)
    check("我的意向列表", r.json()["data"]["total"] >= 1)

    print("== 3. 超管认证与后台 ==")
    r = client.post(f"{BASE}/api/auth/login", json={"username": "admin", "password": "admin123456"})
    check("超管登录", r.status_code == 200 and r.json()["data"]["token"], str(r.json())[:150])
    admin_token = r.json()["data"]["token"]
    a_headers = {"Authorization": f"Bearer {admin_token}"}
    # 权限隔离：user token 访问 admin 接口应 401
    r = client.get(f"{BASE}/api/admin/dashboard", headers=u_headers)
    check("权限隔离(user→admin 401)", r.status_code == 401)
    r = client.get(f"{BASE}/api/admin/dashboard", headers=a_headers)
    d = r.json()["data"]
    check("仪表盘统计(7卡)", r.status_code == 200 and d["products"] == 12 and d["intents"] >= 5, str(d))

    print("== 4. 意向状态流转 ==")
    r = client.put(f"{BASE}/api/admin/intents/{intent_id}", headers=a_headers, json={"status": "contacted"})
    check("pending→contacted", r.status_code == 200 and r.json()["data"]["status"] == "contacted")
    r = client.put(f"{BASE}/api/admin/intents/{intent_id}", headers=a_headers, json={"status": "deal"})
    check("contacted→deal", r.status_code == 200)
    r = client.put(f"{BASE}/api/admin/intents/{intent_id}", headers=a_headers, json={"status": "pending"})
    check("deal→pending 非法(422)", r.status_code == 422, str(r.json())[:100])

    print("== 5. 产品软删/回收站 ==")
    r = client.delete(f"{BASE}/api/admin/products/{pid}", headers=a_headers)
    check("产品软删除", r.status_code == 200)
    r = client.get(f"{BASE}/api/admin/products/trash", headers=a_headers)
    check("回收站列表", r.json()["data"]["total"] >= 1)
    r = client.post(f"{BASE}/api/admin/products/{pid}/restore", headers=a_headers)
    check("回收站恢复", r.status_code == 200)
    r = client.get(f"{BASE}/api/public/products/{pid}")
    check("恢复后前台可见", r.status_code == 200)

    print("== 6. 文件上传 ==")
    # 构造 1x1 PNG 图片字节
    png = bytes.fromhex(
        "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489"
        "0000000d49444154789c626001000000ffff03000006000557bfabd40000000049454e44ae426082"
    )
    r = client.post(f"{BASE}/api/admin/upload", headers=a_headers,
                    files={"file": ("test.png", png, "image/png")}, params={"kind": "image"})
    check("图片上传", r.status_code == 200 and r.json()["data"]["url"].startswith("/uploads/"), str(r.json())[:120])
    # 非法类型校验
    r = client.post(f"{BASE}/api/admin/upload", headers=a_headers,
                    files={"file": ("evil.exe", b"MZ", "application/octet-stream")}, params={"kind": "image"})
    check("非法类型拦截(415)", r.status_code == 415)

    print("== 7. 联系方式设置 ==")
    r = client.put(f"{BASE}/api/admin/settings/contact", headers=a_headers,
                   json={"contact_phone": "400-888-9999"})
    check("联系方式更新", r.status_code == 200)
    r = client.get(f"{BASE}/api/public/contact")
    check("前台读取新热线", r.json()["data"]["contact_phone"] == "400-888-9999")

    print(f"\n==== 冒烟结果：通过 {PASS} 项 / 失败 {FAIL} 项 ====")
    sys.exit(1 if FAIL else 0)


if __name__ == "__main__":
    main()
