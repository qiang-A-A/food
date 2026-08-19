# =============================================================================
# app/utils/errors.py — 业务异常与错误码定义
# -----------------------------------------------------------------------------
# 功能：定义统一错误码常量（对应开发技术文档附录 C）与业务异常 AppError，
#       main.py 中注册全局异常处理器，将 AppError 转为统一响应信封。
# 说明：错误码映射 HTTP 状态——400 参数 / 401 认证 / 403 权限 / 404 不存在 /
#       409 冲突 / 413 过大 / 415 类型 / 422 状态非法 / 500 内部。
# =============================================================================


class ErrorCode:
    """业务错误码常量（与开发技术文档附录 C 对齐）。"""

    SUCCESS = 0       # 成功
    PARAM_ERROR = 4000      # 参数错误
    UNAUTHORIZED = 4010     # 未登录 / 令牌无效或过期
    LOGIN_FAILED = 4011     # 登录失败（手机号或密码错误）
    ACCOUNT_DISABLED = 4030 # 账号已禁用
    FORBIDDEN = 4031        # 无权限
    NOT_FOUND = 4040        # 资源不存在
    CONFLICT = 4090         # 冲突（如手机号已注册、品类下有产品）
    FILE_TOO_LARGE = 4130   # 文件过大
    UNSUPPORTED_TYPE = 4150 # 不支持的文件类型
    INVALID_TRANSITION = 4220  # 状态流转非法（意向状态机）
    INTERNAL_ERROR = 5000   # 内部错误


class AppError(Exception):
    """业务异常：携带业务码 + 用户可读消息 + HTTP 状态码。

    router/service 中通过 `raise AppError(code, msg, http_status)` 抛出，
    由 main.py 的全局异常处理器统一转为 {code, message, data: None} 信封。
    """

    def __init__(self, code: int, message: str, http_status: int = 400):
        super().__init__(message)
        self.code = code           # 业务码（见 ErrorCode）
        self.message = message     # 用户可读消息
        self.http_status = http_status  # HTTP 状态码

    # ---- 常用快捷构造 ----
    @staticmethod
    def param(msg: str = "参数错误") -> "AppError":
        return AppError(ErrorCode.PARAM_ERROR, msg, 400)

    @staticmethod
    def unauthorized(msg: str = "请先登录") -> "AppError":
        return AppError(ErrorCode.UNAUTHORIZED, msg, 401)

    @staticmethod
    def login_failed(msg: str = "手机号或密码错误") -> "AppError":
        return AppError(ErrorCode.LOGIN_FAILED, msg, 401)

    @staticmethod
    def disabled(msg: str = "账号已禁用") -> "AppError":
        return AppError(ErrorCode.ACCOUNT_DISABLED, msg, 403)

    @staticmethod
    def forbidden(msg: str = "无权限操作") -> "AppError":
        return AppError(ErrorCode.FORBIDDEN, msg, 403)

    @staticmethod
    def not_found(msg: str = "资源不存在") -> "AppError":
        return AppError(ErrorCode.NOT_FOUND, msg, 404)

    @staticmethod
    def conflict(msg: str = "数据冲突") -> "AppError":
        return AppError(ErrorCode.CONFLICT, msg, 409)

    @staticmethod
    def invalid_transition(msg: str = "状态流转非法") -> "AppError":
        return AppError(ErrorCode.INVALID_TRANSITION, msg, 422)
