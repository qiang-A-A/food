// =============================================================================
// packages/api-client/src/paths.ts — API 路径常量
// -----------------------------------------------------------------------------
// 功能：集中维护全部后端接口路径（对应方案 §6.2 接口分组），
//       前后台统一引用，避免散落字符串导致联调不一致。
// =============================================================================

/** 前台公开接口（无需登录）——对应方案 §6.2 public 组 */
export const publicApi = {
  home: '/api/public/home',                    // 首页聚合数据
  products: '/api/public/products',            // 产品列表
  productDetail: (id: number | string) => `/api/public/products/${id}`, // 产品详情
  categories: '/api/public/categories',        // 品类列表
  news: '/api/public/news',                    // 新闻列表
  newsDetail: (id: number | string) => `/api/public/news/${id}`,       // 新闻详情
  about: '/api/public/about',                  // 关于我们（含品牌故事）
  contact: '/api/public/contact',              // 联系方式（来自 settings）
}

/** 前台用户接口（需 user JWT）——对应方案 §6.2 user 组 */
export const userApi = {
  register: '/api/user/register',              // 注册（注册即登录）
  login: '/api/user/login',                    // 用户登录（主入口）
  profile: '/api/user/profile',                // 个人中心（GET/PUT）
  password: '/api/user/password',              // 修改密码
  avatar: '/api/user/avatar',                  // 修改头像（上传/默认头像库）
  intents: '/api/user/intents',                // 我的意向（GET/POST）
}

/** 超管认证接口——对应方案 §6.2 auth 组 */
export const authApi = {
  login: '/api/auth/login',                    // 超管登录（登录页角落入口）
  password: '/api/auth/password',              // 超管修改密码
}

/** 后台管理接口（需 admin JWT）——对应方案 §6.2 admin 组（M3 按模块细化） */
export const adminApi = {
  dashboard: '/api/admin/dashboard',           // 仪表盘统计
  products: '/api/admin/products',             // 产品管理（CRUD/状态/批量）
  productRestore: (id: number) => `/api/admin/products/${id}/restore`, // 产品恢复
  productTrash: '/api/admin/products/trash',   // 产品回收站彻底清空
  categories: '/api/admin/categories',         // 品类管理
  news: '/api/admin/news',                     // 新闻管理
  newsRestore: (id: number) => `/api/admin/news/${id}/restore`,
  newsTrash: '/api/admin/news/trash',
  banners: '/api/admin/banners',               // 轮播图管理
  about: '/api/admin/about',                   // 关于我们更新
  intents: '/api/admin/intents',               // 团购意向管理
  users: '/api/admin/users',                   // 注册用户管理
  admins: '/api/admin/admins',                 // 管理员管理
  departments: '/api/admin/departments',       // 部门管理
  roles: '/api/admin/roles',                   // 角色管理
  settingsContact: '/api/admin/settings/contact', // 联系方式设置
  settingsSite: '/api/admin/settings/site',       // 站点设置
  upload: '/api/admin/upload',                 // 图片/视频上传
}
