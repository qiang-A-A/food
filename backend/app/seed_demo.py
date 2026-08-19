# =============================================================================
# app/seed_demo.py — 演示数据脚本（可选执行，已确认提供）
# -----------------------------------------------------------------------------
# 功能：预置演示用产品/新闻/轮播/意向/演示用户，便于 M6 联调走查与演示，
#       与基础种子（seed.py）解耦——业务表为空时填充，可一键重置。
# 说明：产品食品合规字段（配料/净含量/保质期/储存/过敏原）全部填写，
#       以校验前台详情页合规范式；source/status 覆盖全部枚举。
# 用法：cd backend && .venv/Scripts/python.exe -m app.seed_demo
# =============================================================================

from datetime import datetime  # 标准库：时间

import bcrypt  # 密码哈希库（演示会员可直接登录）

from app.database import SessionLocal
from app.models import (
    Banner, Category, News, Product, PurchaseIntent, User,
)

# 演示会员密码（仅演示环境，与产品数据解耦）
DEMO_USER_PASSWORD = "123456"


def hash_password(plain: str) -> str:
    """生成 bcrypt 密码哈希（与 seed.py 保持一致）。"""
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def seed_demo() -> None:
    """填充演示数据；业务表（products）已有数据则跳过。"""
    db = SessionLocal()
    try:
        # ---- 幂等检查：产品表已有数据说明演示数据已存在 ----
        if db.query(Product).count() > 0:
            print("[seed_demo] 已存在演示数据，跳过（如需重置：删除 tsgq_dev.db 后重新迁移+seed+seed_demo）")
            return

        operator = "demo"

        # ========== 0) 演示会员（2 个，用于意向关联与登录演示，密码 123456） ==========
        u1 = User(
            phone="13800000001", password_hash=hash_password(DEMO_USER_PASSWORD),
            nickname="宫阙会员", avatar="default-1", created_by=operator,
        )
        u2 = User(
            phone="13800000002", password_hash=hash_password(DEMO_USER_PASSWORD),
            nickname="礼赠采购专员", avatar="default-3", created_by=operator,
        )
        db.add_all([u1, u2])
        db.flush()

        # ========== 1) 产品（12 个，覆盖 5 品类 + 发布状态三态演示） ==========
        # 品类映射：按 slug 查询（与 seed.py 插入顺序对应）
        cats = {c.slug: c for c in db.query(Category).all()}

        def mk(
            cat_slug: str, no: str, name: str, series: str, model: str,
            spec: str, flavor: str, price: str, featured: bool,
            status: str = "on", weight: str = "480g", shelf: str = "60 天",
        ) -> Product:
            """构造产品对象：食品合规字段给出演示值（详情页合规范式校验用）。"""
            return Product(
                category_id=cats[cat_slug].id, series=series, product_no=no,
                name=name, model=model,
                cover_image="",  # MVP 前台用 SVG 占位（UI/UX §1.4），真实图上线替换
                product_images=[], box_images=[], description="",
                spec_params=[
                    {"key": "净含量", "value": weight},
                    {"key": "保质期", "value": shelf},
                    {"key": "储存条件", "value": "阴凉干燥处避光保存"},
                    {"key": "礼盒规格", "value": "礼盒 28×22×8cm"},
                ],
                spec=spec, flavor=flavor,
                ingredients="小麦粉、红枣、核桃仁、白砂糖、植物油（演示数据）",
                net_weight=weight, shelf_life=shelf,
                storage="阴凉干燥处避光保存",
                allergen="含麸质、坚果（演示数据）",
                box_spec="礼盒 28×22×8cm",
                price=price, is_featured=featured,
                publish_status=status, sort_order=1,
                created_by=operator,
            )

        products = [
            # ---- 御点珍馐（酥点） ----
            mk("yudian", "GQ-1001", "御品九宫酥礼盒", "胡桃禮", "GQ-001", "9 枚装", "核桃/枣泥", "¥388", True),
            mk("yudian", "GQ-1002", "龙凤呈祥喜饼礼盒", "胡桃禮", "GQ-002", "6 枚装", "红豆/莲蓉", "¥328", True),
            mk("yudian", "GQ-1003", "御膳核桃酥礼盒", "胡桃禮", "GQ-003", "12 枚装", "核桃酥", "¥468", False),
            # ---- 节令礼盒（中秋·年礼） ----
            mk("jieling", "SY-2001", "桂花秋月糕礼盒", "节令臻礼", "SY-001", "8 枚装", "桂花/绿豆", "¥358", True),
            mk("jieling", "SY-2002", "枣泥山药糕礼盒", "节令臻礼", "SY-002", "8 枚装", "枣泥山药", "¥298", True),
            mk("jieling", "SY-2003", "红豆山药糕礼盒", "节令臻礼", "SY-003", "6 枚装", "红豆山药", "¥268", False, status="off"),
            # ---- 宫廷茶点 ----
            mk("chadian", "KT-3001", "龙井酥茶点礼盒", "茶歇雅韵", "KT-001", "12 枚装", "龙井/绿豆", "¥258", True),
            mk("chadian", "KT-3002", "玫瑰豆沙酥礼盒", "茶歇雅韵", "KT-002", "8 枚装", "玫瑰豆沙", "¥228", False, status="draft"),
            # ---- 商务套装 ----
            mk("shangwu", "WC-4001", "御膳八珍糕点礼盒", "商务尊享", "WC-001", "双层 24 枚", "八珍混合", "¥888", False),
            mk("shangwu", "WC-4002", "燕窝酥礼盒", "商务尊享", "WC-002", "双层 16 枚", "燕窝酥", "¥1288", True),
            # ---- 高端定制 ----
            mk("gaoduan", "DZ-6001", "企业定制·尊享礼盒", "定制礼盒", "DZ-001", "定制规格", "按需定制", "¥1688 起", True),
            mk("gaoduan", "DZ-6002", "企业定制·节庆礼盒", "定制礼盒", "DZ-002", "定制规格", "按需定制", "¥1288 起", False, status="off"),
        ]
        db.add_all(products)
        print(f"[seed_demo] 产品 12 个（含 off×2 / draft×1 状态演示）")

        # ========== 2) 新闻（6 条，含置顶与下架演示） ==========
        now = datetime.now()
        news = [
            News(title="天上宫阙 2026 宫廷糕点礼赠发布会圆满举行", summary="秋季新品御礼亮相，礼赠场景一站式解决方案发布",
                 content="<p>（演示正文：发布会现场报道，可插入图片与视频）</p>", publish_date=now,
                 is_top=True, is_activate=True, created_by=operator),
            News(title="「天上宫阙」荣获中国礼赠食品创意金奖", summary="御礼系列获行业权威认可",
                 content="<p>（演示正文：获奖历程与产品介绍）</p>", publish_date=now,
                 is_top=False, is_activate=True, created_by=operator),
            News(title="非遗糕点工艺大师班开讲：传承古法起酥", summary="与非遗匠人共同守护宫廷糕点技艺",
                 content="<p>（演示正文：工艺大师班活动回顾）</p>", publish_date=now,
                 is_top=False, is_activate=True, created_by=operator),
            News(title="体验馆焕新：北京礼赠体验馆重装开业", summary="沉浸式体验宫廷糕点礼赠文化",
                 content="<p>（演示正文：体验馆开业信息）</p>", publish_date=now,
                 is_top=False, is_activate=True, created_by=operator),
            News(title="定制服务升级：一对一口味搭配顾问日", summary="企业定制专属服务再升级",
                 content="<p>（演示正文：定制服务说明）</p>", publish_date=now,
                 is_top=False, is_activate=False, created_by=operator),  # 下架演示
            News(title="品质保障再升级：SC 认证 · 保质期透明标注", summary="食品安全合规承诺",
                 content="<p>（演示正文：品质保障体系）</p>", publish_date=now,
                 is_top=False, is_activate=True, created_by=operator),
        ]
        db.add_all(news)
        print(f"[seed_demo] 新闻 6 条（含下架×1 / 置顶×1 演示）")

        # ========== 3) 轮播图（5 张，前台 Hero 用 SVG 插画占位渲染） ==========
        # 说明：image 存占位标记（svg:hero-scene-N），M4 前台按标记渲染红墙宫阙插画
        banners = [
            Banner(title="御礼天成 · 宫廷糕点", image="svg:hero-scene-1", link_url="/", sort_order=1, created_by=operator),
            Banner(title="古法手作 · 酥香传世", image="svg:hero-scene-2", link_url="/products", sort_order=2, created_by=operator),
            Banner(title="定制礼盒 · 专属礼遇", image="svg:hero-scene-3", link_url="/contact", sort_order=3, created_by=operator),
            Banner(title="新品发布会专题", image="svg:hero-scene-4", link_url="/news/1", sort_order=4, created_by=operator),
            Banner(title="北京体验馆焕新", image="svg:hero-scene-5", link_url="/news/4", sort_order=5, created_by=operator),
        ]
        db.add_all(banners)
        print(f"[seed_demo] 轮播图 5 张")

        # ========== 4) 团购/定制意向（5 条，覆盖 source 三值 + 状态机四态） ==========
        intents = [
            PurchaseIntent(user_id=u1.id, name="张先生", phone="13900001111", company="某某科技企业",
                           requirement="中秋企业团购 200 盒，需定制烫金 LOGO", quantity_range="100-200 盒",
                           source="contact", status="pending", created_by=operator),
            PurchaseIntent(user_id=u2.id, name="李经理", phone="13900002222", company="某某金融集团",
                           requirement="年会伴手礼采购，预算 300 元/份", quantity_range="500 盒以上",
                           source="contact", status="contacted", created_by=operator),
            PurchaseIntent(user_id=u1.id, name="王总", phone="13900003333", company="某某地产",
                           requirement="节庆礼盒定制，双层面料提篮款", quantity_range="50-100 盒",
                           source="customize", status="deal", created_by=operator),
            PurchaseIntent(user_id=u2.id, name="赵女士", phone="13900004444", company="",
                           requirement="咨询燕窝酥礼盒报价与起订量", quantity_range="20-50 盒",
                           source="product", status="pending", created_by=operator),
            PurchaseIntent(user_id=u1.id, name="陈先生", phone="13900005555", company="某某贸易",
                           requirement="已通过电话确认，暂缓采购", quantity_range="",
                           source="customize", status="closed", created_by=operator),
        ]
        db.add_all(intents)
        print(f"[seed_demo] 意向 5 条（source: contact×2/customize×2/product×1；status 四态全覆盖）")

        # ---- 提交 ----
        db.commit()
        print("[seed_demo] 演示数据完成 ✅（演示会员 2 个，密码需在 M3 后重置为可用哈希）")

    except Exception as exc:  # 失败回滚
        db.rollback()
        print(f"[seed_demo] 失败，已回滚：{exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_demo()
