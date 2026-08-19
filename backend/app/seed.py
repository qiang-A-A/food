# =============================================================================
# app/seed.py — 基础种子数据脚本（幂等）
# -----------------------------------------------------------------------------
# 功能：填充数据库文档 §7.2 种子数据——角色（2）/部门（1）/品类（5）/关于
#       （单行含 5 卖点）/设置（8 个 key）/初始超级管理员。
# 说明：① 密码由 bcrypt 生成，读取环境变量（config 中 ADMIN_INITIAL_*），
#          禁止明文入库（数据库文档 §7.2 红线）；② 幂等：已有数据则跳过，
#          重置方式为删除数据库文件后重新 alembic upgrade head + seed。
# 用法：cd backend && .venv/Scripts/python.exe -m app.seed
# =============================================================================

import bcrypt  # 密码哈希库（直接使用 bcrypt 5.x，避免 passlib 兼容问题）

from app.config import settings
from app.database import SessionLocal
from app.models import (
    Admin, About, Category, Department, Role, Setting,
)


def hash_password(plain: str) -> str:
    """生成 bcrypt 密码哈希（bcrypt 5.x API：接收 bytes，返回 bytes 解码为 str）。"""
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def seed() -> None:
    """执行基础种子写入；已存在数据则跳过（保持幂等）。"""
    db = SessionLocal()
    try:
        # ---- 幂等检查：角色表已有数据说明已初始化过 ----
        if db.query(Role).count() > 0:
            print("[seed] 数据库已有种子数据，跳过（如需重置：删除 tsgq_dev.db 后重新迁移+种子）")
            return

        operator = "system"  # 初始化统一记 system（数据库文档 §7.2）

        # ========== 1) 角色（至少超级管理员，预留运营编辑） ==========
        role_super = Role(role_name="超级管理员", created_by=operator)
        role_editor = Role(role_name="运营编辑", created_by=operator)
        db.add_all([role_super, role_editor])
        db.flush()  # 获取自增 id（后续 admin 引用 role_id）

        # ========== 2) 部门（顶级总部，parent_id 为空） ==========
        dept_hq = Department(dept_name="宫阙总部", parent_id=None, created_by=operator)
        db.add(dept_hq)
        db.flush()

        # ========== 3) 品类（5 个默认，slug 对应数据库文档 §3.3） ==========
        categories = [
            Category(name="御点珍馐", slug="yudian", sort_order=1, created_by=operator),
            Category(name="节令礼盒", slug="jieling", sort_order=2, created_by=operator),
            Category(name="宫廷茶点", slug="chadian", sort_order=3, created_by=operator),
            Category(name="商务套装", slug="shangwu", sort_order=4, created_by=operator),
            Category(name="高端定制", slug="gaoduan", sort_order=5, created_by=operator),
        ]
        db.add_all(categories)

        # ========== 4) 关于我们（单行 id=1，含 5 个核心卖点） ==========
        selling_points = [
            {"title": "宫廷御膳传承", "desc": "源自宫廷御膳技艺，传承千年礼制", "icon": "heritage"},
            {"title": "非遗手工技艺", "desc": "非遗匠人手作，古法烘焙", "icon": "craft"},
            {"title": "甄选天然食材", "desc": "严选天然原料，零添加承诺", "icon": "natural"},
            {"title": "高端礼盒定制", "desc": "企业团购与私人高端定制", "icon": "custom"},
            {"title": "食品安全品质", "desc": "SC 认证工厂，全程品控", "icon": "safety"},
        ]
        about = About(
            id=1,  # 固定单行 id=1（数据库文档 §3.8）
            company_intro="（公司简介占位：由后台录入）",
            brand_story="（品牌故事占位：御膳渊源）",
            honors=[],
            selling_points=selling_points,
            created_by=operator,
        )
        db.add(about)

        # ========== 5) 系统设置（预置联系方式与页脚合规信息） ==========
        # 注意：value 存 JSON 字符串（带引号），对应数据库文档 §3.9 示例
        settings_seed = [
            Setting(key="site_title", value='"天上宫阙 · 御礼天成"', created_by=operator),
            Setting(key="site_slogan", value='"御礼天成，礼承宫廷"', created_by=operator),
            Setting(key="contact_phone", value='"400-000-0000"', created_by=operator),
            Setting(key="contact_email", value='"contact@tsgq.com"', created_by=operator),
            Setting(key="contact_address", value='"（待填地址）"', created_by=operator),
            Setting(key="contact_wechat_qr", value='"（待填二维码 URL）"', created_by=operator),
            Setting(key="footer_icp", value='"（待填备案号）"', created_by=operator),
            Setting(key="footer_sc_license", value='"SC00000000000000"', created_by=operator),
        ]
        db.add_all(settings_seed)

        # ========== 6) 初始超级管理员（密码 bcrypt 哈希，读取环境变量） ==========
        admin_username = settings.ADMIN_INITIAL_USERNAME  # 默认 admin
        admin_password = settings.ADMIN_INITIAL_PASSWORD  # 默认 admin123456（部署后强制修改）
        admin = Admin(
            username=admin_username,
            password_hash=hash_password(admin_password),  # 生成 bcrypt 哈希，绝不明文
            name="系统管理员",
            nickname="Admin",
            phone="13900000000",
            email="admin@tsgq.com",
            gender="男",
            post="技术总监",
            dept_id=dept_hq.id,      # 宫阙总部
            role_id=role_super.id,   # 超级管理员
            created_by=operator,
        )
        db.add(admin)

        # ---- 提交事务 ----
        db.commit()
        print(f"[seed] 基础种子完成：角色 2 / 部门 1 / 品类 5 / 关于 1 / 设置 8 / 超管 {admin_username}")

    except Exception as exc:  # 失败回滚并抛出，便于排查
        db.rollback()
        print(f"[seed] 失败，已回滚：{exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
