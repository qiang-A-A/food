// =============================================================================
// src/main.tsx — 前台应用入口
// -----------------------------------------------------------------------------
// 功能：挂载 React 根组件、引入全局样式（Tailwind + 纸感背景 + 设计令牌），
//       并启用 BrowserRouter 路由模式。
// =============================================================================

import React from 'react' // React 根渲染
import ReactDOM from 'react-dom/client' // React 18 客户端渲染 API
import { BrowserRouter } from 'react-router-dom' // 浏览器路由（history 模式）

import App from './App'
import './styles/global.css' // 全局样式（含 tokens.css 引入与纸感背景）

// 创建根节点并渲染应用
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* StrictMode：开发期双重渲染以暴露副作用问题（生产无影响） */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
