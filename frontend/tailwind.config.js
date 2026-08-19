// =============================================================================
// tailwind.config.js — Tailwind 主题与设计令牌映射
// -----------------------------------------------------------------------------
// 功能：将 Design Token（tokens.css 变量）映射为 Tailwind 工具类色值/字体，
//       使组件中可直接使用 bg-red-600 / text-gold / font-title 等语义类。
// 说明：色值直接取 UI/UX §3.1.1 数值（与 CSS 变量保持一致，双写保证可用）。
// =============================================================================

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'], // 扫描范围：模板与源码
  theme: {
    extend: {
      // ---- 品牌色板（对应 tokens.css :root 变量）----
      colors: {
        red: {
          DEFAULT: '#8C1F28',  // 宫廷红（主色）
          light: '#A4252E',    // 亮红
          deep: '#6E161D',     // 深红（标题）
        },
        gold: {
          DEFAULT: '#C9A96A',  // 帝王金
          dark: '#A8863F',     // 深金
          light: '#E8D9B5',    // 浅金
        },
        ink: {
          DEFAULT: '#2B1D16',  // 玄黑
          soft: '#3E2C22',     // 深棕
        },
        paper: {
          DEFAULT: '#F5EFE0',  // 宣纸米白
          deep: '#EFE6D2',     // 深宣纸
        },
      },
      // ---- 字体族：标题宋体 / 正文黑体 ----
      fontFamily: {
        title: ['"Noto Serif SC"', '"Songti SC"', 'SimSun', 'serif'],
        body: ['"Noto Sans SC"', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
      },
      // ---- 圆角：前台统一 2px 中式方角 ----
      borderRadius: {
        DEFAULT: '2px',
      },
      // ---- 阴影：卡片悬浮（UI/UX §3.4）----
      boxShadow: {
        card: '0 6px 24px rgba(43,29,22,0.14)',
        'card-hover': '0 10px 30px rgba(43,29,22,0.18)',
      },
      // ---- 动效（UI/UX §6.2）----
      transitionDuration: {
        fast: '200ms',
        mid: '250ms',
      },
    },
  },
  plugins: [],
}
