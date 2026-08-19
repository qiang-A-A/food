// =============================================================================
// packages/api-client/src/types.ts — 共享 TS 类型定义
// -----------------------------------------------------------------------------
// 功能：定义前后台共用的接口响应信封、分页结构与通用枚举，
//       保证前后端契约一致（对应方案 §6.1 统一约定与开发技术文档附录 A）。
// =============================================================================

/** 后端统一响应信封：{code, message, data}（code=0 表示成功） */
export interface ApiResponse<T = unknown> {
  code: number        // 业务码：0 成功；非 0 见错误码体系（4000/4010/4030/4040/4090/4130/4150/4220/5000）
  message: string     // 提示信息（失败时展示给用户）
  data: T             // 业务数据载荷
}

/** 分页查询公共参数 */
export interface PageQuery {
  page?: number        // 页码（从 1 开始）
  page_size?: number   // 每页条数
  keyword?: string     // 关键词搜索（可选）
}

/** 分页响应结构 */
export interface PageResult<T> {
  items: T[]           // 当前页数据
  total: number        // 总条数
  page: number         // 当前页码
  page_size: number    // 每页条数
  pages: number        // 总页数
}

/** 产品发布状态三态（PRD v2.2）：on 上架 / off 下架 / draft 草稿（前台仅可见 on） */
export type PublishStatus = 'on' | 'off' | 'draft'

/** 团购/定制意向来源：contact 联系我们 / customize 礼盒定制 / product 产品详情（已确认扩展） */
export type IntentSource = 'contact' | 'customize' | 'product'

/** 团购意向状态流转（PRD B-11）：待跟进 → 已联系 → 已成交/已关闭 */
export type IntentStatus = 'pending' | 'contacted' | 'deal' | 'closed'

/** 登录令牌载荷（前端存储结构） */
export interface AuthToken {
  token: string        // JWT
  role: 'user' | 'admin' // 角色：前台用户 / 后台超管
  expires_at?: number  // 过期时间戳（毫秒，可选）
}

/** 当前登录用户信息（前台个人中心数据源） */
export interface UserProfile {
  id: number
  phone: string
  nickname: string
  avatar: string       // 头像 URL 或默认头像 key（default-N）
  is_activate: boolean
  created_at: string
}
