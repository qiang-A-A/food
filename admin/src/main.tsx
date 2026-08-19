// =============================================================================
// src/main.tsx — 后台应用入口
// -----------------------------------------------------------------------------
// 功能：挂载后台 React 应用，配置 AntD5 中文语言包与品牌主题色
//       （金 #C9A96A / 宫廷红 #8C1F28 点缀，对应 UI/UX §5.3 后台组件规范）。
// =============================================================================

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider } from 'antd' // AntD 全局配置（主题/语言）
import zhCN from 'antd/locale/zh_CN'   // 中文语言包

import App from './App'
import './styles/global.css' // 后台全局样式（浅灰商务底 + 品牌点缀）

// AntD 品牌主题：token 覆盖主色为宫廷红、圆角 3px（UI/UX §5.3）
const theme = {
  token: {
    colorPrimary: '#8C1F28',   // 主色：宫廷红
    colorLink: '#1677FF',      // 链接蓝（编辑链接）
    borderRadius: 3,           // 后台圆角 3px
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif",
  },
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN} theme={theme}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ConfigProvider>
  </React.StrictMode>,
)
