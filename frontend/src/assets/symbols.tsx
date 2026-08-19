// =============================================================================
// src/assets/symbols.tsx — 前台宫廷插画资产库
// -----------------------------------------------------------------------------
// 功能：将原型 SVG symbol 资产（UI/UX §3.6 八类插画）封装为 React 组件，
//       并实现「红墙渐变 + 金线礼盒/酥点剪影 + 顶部暖光」产品占位图
//       （UI/UX §3.6 占位规范，上线前替换真实摄影图）。
// 说明：线稿统一金色 #E8D9B5（深色底可用），颜色可经 stroke 属性定制。
// =============================================================================

// ---- 宫灯 ----
export function LanternIcon(props: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 40 60" className={props.className} style={props.style} aria-hidden="true">
      <path d="M20 4v6" stroke="#E8D9B5" strokeWidth="1.2" fill="none" />
      <path d="M14 10h12l-2 6H16z" fill="#E8D9B5" opacity=".9" />
      <ellipse cx="20" cy="32" rx="10" ry="15" fill="#F6ECD7" opacity=".16" stroke="#E8D9B5" strokeWidth="1.2" />
      <path d="M13 34c2 3 6 3 7 0s5-3 7 0" stroke="#E8D9B5" strokeWidth="1" fill="none" opacity=".6" />
      <path d="M14 48h12l-2 6H16z" fill="#E8D9B5" opacity=".9" />
      <path d="M20 54v4" stroke="#E8D9B5" strokeWidth="1.2" fill="none" />
      <circle cx="20" cy="32" r="2" fill="#E8D9B5" />
    </svg>
  )
}

// ---- 祥云 ----
export function CloudIcon(props: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 60 28" className={props.className} style={props.style} aria-hidden="true">
      <path d="M6 20c-3 0-5-2-5-4s2-4 5-4c1-4 4-7 8-7 5 0 8 3 9 7 1 0 3-1 4-1 4 0 7 3 7 6s-3 6-7 6H8z" fill="none" stroke="#E8D9B5" strokeWidth="1.3" opacity=".75" />
      <path d="M38 14c-2 0-4-1.5-4-3.5s2-3.5 4-3.5c1.5 0 3-1 3.5-2.5" stroke="#E8D9B5" strokeWidth="1.2" fill="none" opacity=".55" />
    </svg>
  )
}

// ---- 金瓦飞檐 ----
export function EaveIcon(props: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 120 60" className={props.className} style={props.style} aria-hidden="true">
      <path d="M10 46 Q30 14 60 12 Q90 14 110 46" fill="none" stroke="#E8D9B5" strokeWidth="3" />
      <path d="M10 46h100" stroke="#E8D9B5" strokeWidth="1.4" opacity=".6" />
      <path d="M8 50l-3 6M112 50l3 6" stroke="#E8D9B5" strokeWidth="2.4" />
      <circle cx="60" cy="16" r="4" fill="#E8D9B5" opacity=".9" />
    </svg>
  )
}

// ---- 宫廷建筑（红墙金瓦宫殿线稿）----
export function PalaceIcon(props: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 240 150" className={props.className} style={props.style} aria-hidden="true">
      <path d="M18 132h204" stroke="#E8D9B5" strokeWidth="2" />
      <path d="M30 132V96h180v36" stroke="#E8D9B5" strokeWidth="1.6" fill="rgba(43,29,22,.25)" />
      <path d="M40 96V72h160v24" stroke="#E8D9B5" strokeWidth="1.6" fill="rgba(43,29,22,.2)" />
      <path d="M52 72V52h136v20" stroke="#E8D9B5" strokeWidth="1.6" fill="rgba(43,29,22,.15)" />
      <path d="M58 52l7-16h110l7 16" stroke="#E8D9B5" strokeWidth="1.8" fill="none" />
      <path d="M90 36q6-10 30-10t30 10" stroke="#E8D9B5" strokeWidth="1.8" fill="none" />
      <circle cx="120" cy="26" r="4.5" fill="#E8D9B5" />
      <path d="M120 52v34M70 86v24M170 86v24" stroke="#E8D9B5" strokeWidth="1.2" opacity=".7" />
      <path d="M120 120v12" stroke="#E8D9B5" strokeWidth="2" />
    </svg>
  )
}

// ---- 窗棂 ----
export function WindowIcon(props: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 60 60" className={props.className} style={props.style} aria-hidden="true">
      <rect x="6" y="6" width="48" height="48" fill="rgba(232,217,181,.08)" stroke="#E8D9B5" strokeWidth="1.6" />
      <path d="M6 30h48M30 6v48M18 6v48M42 6v48M6 18h48M6 42h48" stroke="#E8D9B5" strokeWidth="1" opacity=".55" />
      <circle cx="30" cy="30" r="5" fill="none" stroke="#E8D9B5" strokeWidth="1.2" opacity=".8" />
    </svg>
  )
}

// ---- 如意纹 ----
export function RuyiIcon(props: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 40 40" className={props.className} style={props.style} aria-hidden="true">
      <path d="M20 6c8 6 12 14 10 22-1 4-4 6-8 6h-4c-4 0-7-2-8-6-2-8 2-16 10-22z" fill="none" stroke="#E8D9B5" strokeWidth="1.4" opacity=".85" />
      <path d="M14 20q3-4 6 0M26 20q3-4 6 0" stroke="#E8D9B5" strokeWidth="1.1" fill="none" opacity=".6" />
    </svg>
  )
}

// ---- 礼盒金线剪影（产品占位）----
export function GiftBoxIcon(props: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 200 120" className={props.className} style={props.style} aria-hidden="true">
      <rect x="46" y="44" width="108" height="64" fill="rgba(232,217,181,.12)" stroke="#E8D9B5" strokeWidth="2" />
      <rect x="38" y="32" width="124" height="18" rx="2" fill="rgba(232,217,181,.18)" stroke="#E8D9B5" strokeWidth="2" />
      <path d="M100 32v76" stroke="#E8D9B5" strokeWidth="2" />
      <path d="M100 32v-14" stroke="#E8D9B5" strokeWidth="2" />
      <path d="M100 18c-14-10-30-6-30 4 0 8 14 10 30 10 16 0 30-2 30-10 0-10-16-14-30-4z" fill="none" stroke="#E8D9B5" strokeWidth="1.8" />
      <rect x="60" y="102" width="80" height="3" fill="#E8D9B5" opacity=".4" />
    </svg>
  )
}

// ---- 酥点金线剪影（产品占位）----
export function CakeIcon(props: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 200 120" className={props.className} style={props.style} aria-hidden="true">
      <ellipse cx="100" cy="86" rx="52" ry="14" fill="rgba(232,217,181,.1)" stroke="#E8D9B5" strokeWidth="2" />
      <path d="M48 86c0-22 22-34 52-34s52 12 52 34" fill="rgba(232,217,181,.14)" stroke="#E8D9B5" strokeWidth="2" />
      <circle cx="100" cy="64" r="20" fill="none" stroke="#E8D9B5" strokeWidth="1.8" />
      <path d="M100 50v28M86 64h28M90 54l20 20M110 54l-20 20" stroke="#E8D9B5" strokeWidth="1" opacity=".7" />
      <circle cx="100" cy="64" r="4" fill="#E8D9B5" opacity=".8" />
    </svg>
  )
}

// -----------------------------------------------------------------------------
// 产品占位图：红墙渐变底 + 顶部暖光 + 金线剪影（UI/UX §3.6 占位规范）
// 说明：coverImage 为空时渲染占位；真实图片上线后走 <img>（金框相框样式）。
// -----------------------------------------------------------------------------

const PLACEHOLDER_SCENES = [
  'linear-gradient(165deg,#A4252E 0%,#8C1F28 45%,#5A1016 100%)',
  'linear-gradient(200deg,#93212A 0%,#7A1A22 50%,#4A0E14 100%)',
]

export function ProductPlaceholder(props: { kind?: 'giftbox' | 'cake'; seed?: number; className?: string }) {
  // 依据 seed 在两种红墙渐变间轮换，营造场景差异
  const bg = PLACEHOLDER_SCENES[(props.seed ?? 0) % PLACEHOLDER_SCENES.length]
  const Icon = props.kind === 'cake' ? CakeIcon : GiftBoxIcon
  return (
    <div
      className={props.className}
      style={{
        width: '100%',
        height: '100%',
        minHeight: 160,
        background: bg,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
      aria-label="宫廷糕点礼盒占位图"
    >
      {/* 顶部暖光（受光感） */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% -10%, rgba(255,240,210,.35), transparent 60%)' }} />
      {/* 金线礼盒/酥点剪影 */}
      <Icon className="ph-art" />
      {/* 占位标注 */}
      <span
        style={{
          position: 'absolute',
          bottom: 8,
          right: 10,
          fontSize: 10,
          letterSpacing: 2,
          color: 'rgba(232,217,181,.75)',
        }}
      >
        宫廷糕点·示意图
      </span>
      <style>{`.ph-art{width:62%;height:56%;opacity:.95}`}</style>
    </div>
  )
}
