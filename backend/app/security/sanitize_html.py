# =============================================================================
# app/security/sanitize_html.py — 富文本白名单净化（防 XSS）
# -----------------------------------------------------------------------------
# 功能：入库前用 nh3 对富文本 HTML 做白名单净化（开发技术文档 §5.5 / ADR-4），
#       前端渲染前再以 DOMPurify 二次净化，形成双重防线。
# 说明：iframe 仅允许白名单视频域名（bilibili / 腾讯 / 优酷），杜绝恶意站点。
# =============================================================================

import re  # 正则：iframe 域名校验

import nh3  # Rust 实现的 HTML 净化库

# ---- 允许的标签白名单（对应开发技术文档 §5.5）----
ALLOWED_TAGS = {
    "p", "br", "strong", "em", "u", "h1", "h2", "h3",
    "ul", "ol", "li", "blockquote", "img", "a", "iframe",
    "video", "source", "span",
}

# ---- 各标签允许的属性白名单 ----
ALLOWED_ATTRS = {
    "a": ["href", "target"],
    "img": ["src", "alt"],
    "iframe": ["src", "width", "height"],
    "video": ["src", "controls"],
}

# ---- 视频平台白名单域名（URL 嵌入仅限这些平台）----
ALLOWED_VIDEO_HOSTS = {"player.bilibili.com", "v.qq.com", "player.youku.com"}


def clean(html: str | None) -> str:
    """净化富文本 HTML（空值返回空串）。"""
    if not html:
        return ""
    return nh3.clean(
        html,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRS,
        url_schemes={"http", "https"},  # 仅允许 http/https 协议链接
    )


def sanitize_iframe_src(src: str | None) -> str | None:
    """校验 iframe 视频地址：仅放行白名单域名，其余返回 None。

    用于将 B站/腾讯/优酷分享链接转为安全 iframe 嵌入。
    """
    if not src:
        return None
    # 提取域名（兼容 http://、https://、协议相对 //）
    match = re.search(r"(?:https?:)?//([^/]+)/", src)
    if not match:
        return None
    host = match.group(1).lower()
    # 允许带 www. 前缀的等价域名
    if host in ALLOWED_VIDEO_HOSTS or host.lstrip("www.") in ALLOWED_VIDEO_HOSTS:
        return src
    return None
