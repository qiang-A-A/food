// =============================================================================
// packages/api-client/src/index.ts — Axios 封装工厂
// -----------------------------------------------------------------------------
// 功能：创建统一 Axios 实例：BaseURL、请求鉴权头注入、统一响应信封拆包、
//       401 未登录跳转回调。前台与后台各自调用 createApiClient 生成实例。
// 说明：对应方案 §6.1 统一约定；错误码 4010（未登录）触发 onUnauthorized。
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
    // 成功：HTTP 2xx 时返回 {code,message,data} 信封本体，由调用方解构
    (response) => response.data,
    // 失败：归一为可读错误对象，4010 触发未登录回调
    (error: AxiosError<ApiResponse>) => {
      // 后端业务错误：携带统一信封（如 4000 参数错误、4011 登录失败等）
      if (error.response?.data) {
        const body = error.response.data
        // 未登录/令牌过期：统一触发登录引导（对应权限分水岭交互）
        if (body.code === 4010) {
          options.onUnauthorized?.()
        }
        return Promise.reject(new Error(body.message || '请求失败'))
      }
      // 网络层错误（后端未启动/超时等）
      return Promise.reject(new Error('网络异常，请稍后重试'))
    },
  )

  return client
}
