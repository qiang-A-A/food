# =============================================================================
# app/security/sanitize_html.py — 富文本白名单净化（防 XSS）
# -----------------------------------------------------------------------------
# 功能：入库前用 nh3 对富文本 HTML 做白名单净化（开发技术文档 §5.5 / ADR-4），
#       前端渲染前再以 DOMPurify 二次净化，形成双重防线。
# 说明：iframe 仅允许白名单视频域名（bilibili / 腾讯 / 优酷），杜绝恶意站点。
#
# 审核修复（2026-08-19 代码审计）：
#   1. nh3 0.3.x 要求 attributes 为 dict[str, set]，此前传 list 导致
#      clean() 一调用即 TypeError → 新闻/产品/关于富文本接口全部 500。
#      已改为 set 集合（实测正常净化）。
#   2. sanitize_iframe_src 此前是死代码（全项目无调用点）且存在绕过：
#      - lstrip("www.") 按字符集剥离，https://wwwv.qq.com/ 可误判放行；
#      - 正则不锚定，javascript://v.qq.com/ 可绕过。
#      已改为 urlparse 解析 + www. 精确前缀，并在 clean() 内联生效：
#      非白名单域名的 <iframe> 整体移除。
# =============================================================================

import re  # 正则：iframe 标签提取
from urllib.parse import urlparse  # URL 解析：域名校验

import nh3  # Rust 实现的 HTML 净化库

# ---- 允许的标签白名单（对应开发技术文档 §5.5）----
ALLOWED_TAGS = {
    "p", "br", "strong", "em", "u", "h1", "h2", "h3",
    "ul", "ol", "li", "blockquote", "img", "a", "iframe",
    "video", "source", "span",
}

# ---- 各标签允许的属性白名单（nh3 要求值为 set 集合，实测 list 会 TypeError）----
ALLOWED_ATTRS = {
    "a": {"href", "target"},
    "img": {"src", "alt"},
    "img": {"src", "alt", "style"},  # style：图片拖拽 resize 后以 style="width:X%" 存储
    "iframe": {"src", "width", "height"},
    "video": {"src", "controls"},
}

# ---- 视频平台白名单域名（URL 嵌入仅限这些平台；与后台 RichTextEditor 一致）----
ALLOWED_VIDEO_HOSTS = {"player.bilibili.com", "v.qq.com", "player.youku.com"}

# iframe 完整块匹配（含闭合标签；兼容自闭合 <iframe ... />）——
# 修复：此前仅匹配 opening tag，移除后残留孤立 </iframe> 破坏 HTML 结构
_IFRAME_BLOCK_RE = re.compile(r"<iframe\b[^>]*>(?:.*?</iframe>)?", re.IGNORECASE | re.DOTALL)
# iframe 内 src 属性提取
_SRC_RE = re.compile(r'src\s*=\s*"([^"]+)"', re.IGNORECASE)


def sanitize_iframe_src(src: str | None) -> str | None:
    """校验 iframe 视频地址：仅放行白名单域名，其余返回 None。

    用于将 B站/腾讯/优酷分享链接转为安全 iframe 嵌入。
    修复点：使用 urlparse 精确解析 host（修复 lstrip 按字符集剥离的绕过），
    协议相对地址（//host/）补全为 https 后再解析。
    """
    if not src:
        return None
    src = src.strip()
    if not src:
        return None
    # 协议相对地址（//v.qq.com/...）补全为 https 后统一解析
    parsed = urlparse(src if "://" in src else f"https:{src}")
    # 审计修复：显式限定协议——urlparse 对 javascript://v.qq.com 会解析出
    # hostname=v.qq.com 而 scheme=javascript，若不拦 scheme 则白名单被绕过
    if parsed.scheme not in ("http", "https"):
        return None
    host = (parsed.hostname or "").lower()
    if not host:
        return None
    # 白名单域名或其 www. 等价前缀（精确前缀匹配，杜绝 wwwv.qq.com 绕过）
    if host in ALLOWED_VIDEO_HOSTS or (
        host.startswith("www.") and host[4:] in ALLOWED_VIDEO_HOSTS
    ):
        return src
    return None


def _filter_iframes(html: str) -> str:
    """净化后过滤 iframe：仅保留白名单视频域名的嵌入，其余整体移除。

    在 nh3 白名单净化（保证属性/协议合法）之后执行，作为域名级第二道闸。
    匹配整个 <iframe>...</iframe> 块（含闭合标签），避免残留孤立闭合标签。
    """
    def _repl(match: re.Match) -> str:
        block = match.group(0)
        src_m = _SRC_RE.search(block)
        if src_m and sanitize_iframe_src(src_m.group(1)):
            return block  # 白名单域名：原样保留
        return ""  # 非白名单：移除整个 iframe 块

    return _IFRAME_BLOCK_RE.sub(_repl, html)


def clean(html: str | None) -> str:
    """净化富文本 HTML（空值返回空串）。

    流程：nh3 标签/属性/协议白名单净化 → iframe 视频域名白名单过滤。
    """
    if not html:
        return ""
    cleaned = nh3.clean(
        html,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRS,
        url_schemes={"http", "https"},  # 仅允许 http/https 协议链接
    )
    # 域名级闸门：移除非白名单视频平台的 iframe 嵌入
    return _filter_iframes(cleaned)
