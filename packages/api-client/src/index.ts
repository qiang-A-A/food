// =============================================================================
// packages/api-client/src/index.ts — Axios 封装工厂
// -----------------------------------------------------------------------------
// 功能：创建统一 Axios 实例：BaseURL、请求鉴权头注入、统一响应信封拆包、
//       401 未登录跳转回调。前台与后台各自调用 createApiClient 生成实例。
// 说明：对应方案 §6.1 统一约定；错误码 4010（未登录）触发 onUnauthorized。
//
// 审计修复（2026-08-19）：
//   1. 成功分支此前直接返回 data，不检查 body.code !== 0——
//      若后端以 HTTP 200 返回业务错误（如手机号已注册），前端会误判成功
//      （表单清空/进入登录态）。现校验 code===0 才算成功，否则按业务错误 reject。
//   2. 4010 触发条件此前过窄：仅当响应体携带 code===4010 才回调；FastAPI
//      默认的裸 401（{detail:...}，如缺失 Authorization 头）不会触发，
//      导致登录态残留或静默失效。现统一按 HTTP 状态码 401 触发 onUnauthorized。
// =============================================================================

import axios, { AxiosError, type AxiosInstance } from 'axios'
import type { ApiResponse } from './types'

export * from './types'   // 再导出类型：使用方一行 import 全部
export * from './paths'   // 再导出路径常量

/** createApiClient 入参：各端差异配置 */
export interface ApiClientOptions {
  baseURL?: string                 // 请求根路径（开发走 Vite 代理，生产走同域）
  getToken?: () => string | null   // 读取当前 JWT（前台 userToken / 后台 adminToken）
  onUnauthorized?: () => void      // 401 回调：清理登录态并跳转登录页
  timeout?: number                 // 超时（默认 15s）
}

/**
 * 创建 API 客户端实例
 * @param options 差异化配置（token 获取方式与未登录回调）
 * @returns 配置好的 Axios 实例（直接 await 调用即可拿到 data 载荷）
 */
export function createApiClient(options: ApiClientOptions = {}): AxiosInstance {
  const client = axios.create({
    baseURL: options.baseURL ?? '', // 默认同域/代理
    timeout: options.timeout ?? 15000,
    headers: { 'Content-Type': 'application/json' },
  })

  // ---- 请求拦截器：自动附加 Authorization: Bearer <JWT> ----
  client.interceptors.request.use((config) => {
    const token = options.getToken?.()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })

  // ---- 响应拦截器：统一信封拆包 + 错误归一 ----
  client.interceptors.response.use(
    // 成功（HTTP 2xx）：仍须校验业务码 code===0（审计修复 1）
    (response) => {
      const body = response.data as ApiResponse
      if (body && typeof body.code === 'number' && body.code !== 0) {
        // HTTP 200 但业务失败（后端约定的业务错误场景）：
        // 未登录码也触发登录引导，其余按业务错误抛出
        if (body.code === 4010) options.onUnauthorized?.()
        return Promise.reject(new Error(body.message || '请求失败'))
      }
      return response.data // code===0 或非信封结构：原样返回
    },
    // 失败（HTTP 非 2xx）：归一为可读错误对象
    (error: AxiosError<ApiResponse>) => {
      // HTTP 401：统一触发未登录引导（审计修复 2：不再依赖 body.code 字段）
      if (error.response?.status === 401) {
        options.onUnauthorized?.()
      }
      if (error.response?.data) {
        const body = error.response.data
        // 优先取统一信封 message；FastAPI 默认格式 {detail: ...} 兼容取用
        const msg = body.message || (body as { detail?: string }).detail || '请求失败'
        return Promise.reject(new Error(msg))
      }
      // 网络层错误（后端未启动/超时等）
      return Promise.reject(new Error('网络异常，请稍后重试'))
    },
  )

  return client
}
