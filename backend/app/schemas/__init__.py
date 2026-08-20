# =============================================================================
# app/schemas/__init__.py — Pydantic 请求/响应模型（按域分组）
# -----------------------------------------------------------------------------
# 功能：集中定义全部 API 的数据契约（开发技术文档 §6 接口契约字段级对齐），
#       提供请求体验证与响应序列化；from_attributes 支持直接输出 ORM 模型。
# 说明：食品合规字段（配料/净含量/保质期/储存/过敏原）在新增时强制必填。
# =============================================================================

from datetime import datetime  # 时间字段
from typing import Generic, TypeVar  # 泛型分页

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator  # Pydantic v2

# ---- 通用 ----
T = TypeVar("T")


class PageResult(BaseModel, Generic[T]):
    """分页响应结构（开发技术文档 §6 统一约定）。"""
    items: list[T]
    total: int
    page: int
    page_size: int
    pages: int


class StatusIn(BaseModel):
    """通用启停/状态请求体：{is_activate: bool} 或 {status: str}。"""
    is_activate: bool | None = None


# ============================================================
# 用户域（前台会员）
# ============================================================

class UserRegisterIn(BaseModel):
    """注册请求：手机号+密码+确认密码（PRD F-6）。"""
    phone: str = Field(..., pattern=r"^1\d{10}$", description="11 位手机号")
    password: str = Field(..., min_length=6, max_length=20, description="密码 6-20 位")
    confirm_password: str = Field(..., description="确认密码，须与 password 一致")
    nickname: str | None = Field(None, max_length=20, description="昵称（可选）")

    @model_validator(mode="after")
    def check_confirm(self) -> "UserRegisterIn":
        # 两次密码必须一致（422 参数错误）
        if self.password != self.confirm_password:
            raise ValueError("两次输入的密码不一致")
        return self


class UserLoginIn(BaseModel):
    """用户登录请求：手机号+密码。"""
    phone: str = Field(..., pattern=r"^1\d{10}$")
    password: str = Field(..., min_length=6, max_length=20)


class UserOut(BaseModel):
    """用户公开信息（响应用，绝不返回 password_hash）。"""
    model_config = ConfigDict(from_attributes=True)
    id: int
    phone: str
    nickname: str | None = None
    avatar: str | None = None
    is_activate: bool = True
    created_at: datetime


class UserLoginOut(BaseModel):
    """登录/注册成功响应：token + 用户信息。"""
    token: str
    user: UserOut


class UserUpdateIn(BaseModel):
    """修改个人资料：昵称/手机号（可选，None 不更新）。"""
    nickname: str | None = Field(None, max_length=20)
    phone: str | None = Field(None, pattern=r"^1\d{10}$")


class PasswordChangeIn(BaseModel):
    """修改密码（前台用户与超管共用）。"""
    old_password: str = Field(..., min_length=6, max_length=20)
    new_password: str = Field(..., min_length=6, max_length=20)


class AvatarKeyIn(BaseModel):
    """默认头像库选择：avatar_key 形如 default-1 ~ default-6（PRD F-6）。"""
    avatar_key: str = Field(..., pattern=r"^default-[1-6]$")


# ============================================================
# 意向域（团购/定制意向）
# ============================================================

class IntentIn(BaseModel):
    """提交团购/定制意向请求（仅登录用户，POST /api/user/intents）。"""
    name: str = Field(..., max_length=50, description="姓名（必填）")
    phone: str = Field(..., pattern=r"^1\d{10}$", description="联系电话（必填）")
    company: str | None = Field(None, max_length=100)
    requirement: str | None = Field(None, description="采购/定制需求")
    quantity_range: str | None = Field(None, max_length=50)
    source: str = Field("contact", pattern=r"^(contact|customize|product)$", description="来源页")
    product_id: int | None = Field(None, description="来源产品（source=product 时必带）")


class IntentOut(BaseModel):
    """意向输出（用户侧：我的意向列表项）。"""
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    phone: str
    company: str | None = None
    requirement: str | None = None
    quantity_range: str | None = None
    source: str
    product_id: int | None = None
    product_name: str | None = None  # 来源产品名（source=product 时展示）
    status: str
    created_at: datetime


class IntentAdminOut(IntentOut):
    """意向输出（后台侧：含提交用户手机号/昵称）。"""
    user_id: int | None = None
    user_phone: str | None = None  # 冗余字段：提交会员手机号（后台表格列）
    user_nickname: str | None = None


class IntentStatusIn(BaseModel):
    """意向状态流转请求体：{"status": "contacted"}（管理侧正常流转/撤销）。"""
    status: str = Field(..., pattern=r"^(pending|contacted|deal|closed|revoked)$")


# ============================================================
# 认证域（超管）
# ============================================================

class AdminLoginIn(BaseModel):
    """超管登录请求（登录页角落入口）。"""
    username: str = Field(..., min_length=2, max_length=50)
    password: str = Field(..., min_length=6, max_length=20)


class AdminOut(BaseModel):
    """后台用户输出（不含 password_hash）。"""
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    name: str
    nickname: str | None = None
    phone: str | None = None
    email: str | None = None
    gender: str | None = None
    post: str | None = None
    dept_id: int | None = None
    role_id: int
    is_activate: bool = True
    created_at: datetime


class AdminLoginOut(BaseModel):
    """超管登录成功响应。"""
    token: str
    admin: AdminOut


# ============================================================
# 品类域
# ============================================================

class CategoryIn(BaseModel):
    """品类新增/编辑（slug 唯一）。"""
    name: str = Field(..., max_length=50)
    slug: str = Field(..., max_length=50, pattern=r"^[a-z0-9-]+$")
    cover_image: str | None = None
    sort_order: int = 0
    is_activate: bool = True


class CategoryOut(BaseModel):
    """品类输出（含产品数，后台列表用）。"""
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    slug: str
    cover_image: str | None = None
    sort_order: int = 0
    is_activate: bool = True
    product_count: int = 0  # 冗余：该品类下未删除产品数（后台列表展示）


class CategorySortIn(BaseModel):
    """品类批量排序请求体：orders 数组。"""
    orders: list[dict]  # [{"id": 1, "sort_order": 1}, ...]


# ============================================================
# 产品域（糕点礼盒）
# ============================================================

class ProductCreateIn(BaseModel):
    """产品新增：食品合规字段必填（PRD 风险项：食品合规）。"""
    category_id: int
    product_no: str = Field(..., max_length=50, description="产品编号（唯一）")
    name: str = Field(..., max_length=100)
    series: str | None = Field(None, max_length=50, description="所属系列（如 胡桃禮）")
    model: str | None = Field(None, max_length=50)
    cover_image: str | None = None
    product_images: list[str] = []
    box_images: list[str] = []
    description: str | None = None                      # 富文本（后端净化）
    spec_params: list[dict] = []                        # 规格参数 JSON
    spec: str | None = Field(None, max_length=100)
    flavor: str | None = Field(None, max_length=100)
    # ---- 食品合规必填字段 ----
    ingredients: str = Field(..., description="配料表（必填）")
    net_weight: str = Field(..., max_length=50, description="净含量（必填）")
    shelf_life: str = Field(..., max_length=50, description="保质期（必填）")
    storage: str = Field(..., max_length=100, description="储存条件（必填）")
    allergen: str = Field(..., max_length=200, description="过敏原提示（必填）")
    box_spec: str | None = Field(None, max_length=200, description="礼盒规格")
    price: str | None = Field(None, max_length=50, description="最低价（¥xxx 起）")
    is_featured: bool = False
    publish_status: str = Field("draft", pattern=r"^(on|off|draft)$")
    sort_order: int = 0


class ProductUpdateIn(BaseModel):
    """产品编辑：全字段可选（None 表示不更新该字段）。"""
    category_id: int | None = None
    product_no: str | None = None
    name: str | None = None
    series: str | None = None
    model: str | None = None
    cover_image: str | None = None
    product_images: list[str] | None = None
    box_images: list[str] | None = None
    description: str | None = None
    spec_params: list[dict] | None = None
    spec: str | None = None
    flavor: str | None = None
    ingredients: str | None = None
    net_weight: str | None = None
    shelf_life: str | None = None
    storage: str | None = None
    allergen: str | None = None
    box_spec: str | None = None
    price: str | None = None
    is_featured: bool | None = None
    publish_status: str | None = Field(None, pattern=r"^(on|off|draft)$")
    sort_order: int | None = None


class ProductOut(BaseModel):
    """产品输出（前台列表/详情 + 后台列表共用）。"""
    model_config = ConfigDict(from_attributes=True)
    id: int
    category_id: int
    category_name: str | None = None  # 冗余：品类名（避免 N+1，列表联查填充）
    series: str | None = None
    product_no: str
    name: str
    model: str | None = None
    cover_image: str | None = None
    product_images: list = []
    box_images: list = []
    description: str | None = None
    spec_params: list = []
    spec: str | None = None
    flavor: str | None = None
    ingredients: str | None = None
    net_weight: str | None = None
    shelf_life: str | None = None
    storage: str | None = None
    allergen: str | None = None
    box_spec: str | None = None
    price: str | None = None
    is_featured: bool = False
    publish_status: str = "draft"
    sort_order: int = 0
    created_at: datetime


class ProductStatusIn(BaseModel):
    """产品发布状态切换请求体。"""
    publish_status: str = Field(..., pattern=r"^(on|off|draft)$")


class BatchActionIn(BaseModel):
    """产品批量操作请求体（批量上架/下架/草稿/删除）。"""
    ids: list[int] = Field(..., min_length=1)
    action: str = Field(..., pattern=r"^(on|off|draft|delete)$")


# ============================================================
# 新闻域
# ============================================================

class NewsIn(BaseModel):
    """新闻新增/编辑（content 富文本，后端 nh3 净化）。"""
    title: str = Field(..., max_length=200)
    summary: str | None = Field(None, max_length=300)
    cover_image: str | None = None
    content: str | None = None
    publish_date: datetime | None = None
    is_top: bool = False
    is_activate: bool = True


class NewsOut(BaseModel):
    """新闻输出。"""
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    summary: str | None = None
    cover_image: str | None = None
    content: str | None = None
    publish_date: datetime
    is_top: bool = False
    is_activate: bool = True
    created_at: datetime


# ============================================================
# 轮播图域
# ============================================================

class BannerIn(BaseModel):
    """轮播图新增/编辑。"""
    title: str | None = Field(None, max_length=100)
    image: str = Field(..., max_length=512)
    link_url: str | None = Field(None, max_length=512)
    sort_order: int = 0
    is_activate: bool = True


class BannerOut(BaseModel):
    """轮播图输出。"""
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str | None = None
    image: str
    link_url: str | None = None
    sort_order: int = 0
    is_activate: bool = True


# ============================================================
# 关于我们域
# ============================================================

class AboutIn(BaseModel):
    """关于我们更新：公司简介/品牌故事/荣誉/卖点（JSON 数组）。"""
    company_intro: str | None = None
    brand_story: str | None = None
    honors: list[dict] | None = None       # [{title, desc, icon}]
    selling_points: list[dict] | None = None  # [{title, desc, icon}]


class AboutOut(BaseModel):
    """关于我们输出。"""
    model_config = ConfigDict(from_attributes=True)
    id: int = 1
    company_intro: str | None = None
    brand_story: str | None = None
    honors: list = []
    selling_points: list = []


# ============================================================
# 用户管理域（后台）
# ============================================================

class UserAdminOut(UserOut):
    """后台用户管理输出（与 UserOut 同构，独立命名便于扩展）。"""
    pass


# ============================================================
# 管理员管理域（后台）
# ============================================================

class AdminCreateIn(BaseModel):
    """新增后台用户：密码必填（bcrypt 哈希后入库）。

    审计修复（2026-08-19）：phone/email 空串（前端未填时提交 ""）统一转 None，
    此前空串会触发 pattern 校验失败 → 400，导致「不填手机号无法创建管理员」。
    """
    username: str = Field(..., min_length=2, max_length=50)
    password: str = Field(..., min_length=6, max_length=20)
    name: str = Field(..., max_length=50)
    nickname: str | None = None
    phone: str | None = Field(None, pattern=r"^1\d{10}$")
    email: str | None = Field(None, max_length=100)
    gender: str | None = Field(None, max_length=10)
    post: str | None = Field(None, max_length=50)
    dept_id: int | None = None
    role_id: int = 1
    is_activate: bool = True

    @field_validator("phone", "email", mode="before")
    @classmethod
    def _empty_to_none(cls, v):
        """空串视为未填写（转 None，跳过后续 pattern 校验）。"""
        return None if v == "" else v


class AdminUpdateIn(BaseModel):
    """编辑后台用户：可选字段（None 不更新；password 提供则重置）。

    审计修复（2026-08-19）：password/phone/email 空串统一转 None——
    此前前端编辑时密码留空提交 "" 触发 min_length 校验失败 → 400，
    导致「编辑管理员 100% 失败」（留空=不修改的语义不成立）。
    """
    username: str | None = None
    password: str | None = Field(None, min_length=6, max_length=20)
    name: str | None = None
    nickname: str | None = None
    phone: str | None = None
    email: str | None = None
    gender: str | None = None
    post: str | None = None
    dept_id: int | None = None
    role_id: int | None = None
    is_activate: bool | None = None

    @field_validator("password", "phone", "email", mode="before")
    @classmethod
    def _empty_to_none(cls, v):
        """空串视为未修改（转 None，不触发长度/格式校验、不更新字段）。"""
        return None if v == "" else v


# ============================================================
# 部门 / 角色域
# ============================================================

class DepartmentIn(BaseModel):
    """部门新增/编辑：parent_id 为空表示顶级。"""
    dept_name: str = Field(..., max_length=50)
    parent_id: int | None = None


class DepartmentOut(BaseModel):
    """部门输出（含子部门树结构，前端递归渲染）。

    审计修复（2026-08-19）：补 is_activate 字段——此前输出缺失导致
    后台部门列表「启用」列永远显示停用（undefined 落到 false 分支）。
    """
    model_config = ConfigDict(from_attributes=True)
    id: int
    dept_name: str
    parent_id: int | None = None
    is_activate: bool = True  # 启用状态（数据库字段，前端启用/停用列数据源）
    children: list["DepartmentOut"] = []  # 子部门（树形，递归）


class RoleIn(BaseModel):
    """角色新增/编辑。"""
    role_name: str = Field(..., max_length=50)


class RoleOut(BaseModel):
    """角色输出。"""
    model_config = ConfigDict(from_attributes=True)
    id: int
    role_name: str
    is_activate: bool = True


# ============================================================
# 系统设置域
# ============================================================

class ContactSettingsIn(BaseModel):
    """联系方式设置（MVP 必做，前台联系我们页数据源）。"""
    contact_phone: str | None = None
    contact_email: str | None = None
    contact_address: str | None = None
    contact_wechat_qr: str | None = None
    footer_icp: str | None = None
    footer_sc_license: str | None = None


class SiteSettingsIn(BaseModel):
    """站点设置（P2，可延后）：网站标题/品牌标语。"""
    site_title: str | None = None
    site_slogan: str | None = None


# ============================================================
# 消息域（前台用户 ⇄ 后台管理员聊天）
# ============================================================

class MessageIn(BaseModel):
    """发送聊天消息请求：内容必填，product_id 可选（来源产品）。"""
    content: str = Field(..., min_length=1, max_length=1000, description="消息内容（纯文本）")
    product_id: int | None = Field(None, description="发起来源产品（产品详情页咨询时携带）")


class MessageOut(BaseModel):
    """聊天消息输出（用户侧与后台侧共用）。"""
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int | None = None
    product_id: int | None = None
    sender: str            # user / admin
    admin_id: int | None = None
    admin_name: str | None = None   # 回复管理员姓名（后台展示）
    content: str
    is_read_admin: bool = False
    is_read_user: bool = False
    created_at: datetime


class ConversationOut(BaseModel):
    """后台会话列表项：每用户一条，含最新消息/未读数/来源产品。"""
    user_id: int
    user_nickname: str | None = None
    user_phone: str | None = None
    user_avatar: str | None = None
    last_message: str | None = None     # 最近一条消息内容（预览）
    last_sender: str | None = None      # 最近消息方向
    last_time: datetime | None = None   # 最近消息时间
    unread: int = 0                     # 管理员侧未读数（角标来源）
    product_id: int | None = None       # 最近消息来源产品
    product_name: str | None = None     # 来源产品名（列表展示）


class UnreadOut(BaseModel):
    """未读消息数输出（角标）。"""
    count: int
