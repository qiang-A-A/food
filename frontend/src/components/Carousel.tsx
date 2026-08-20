// =============================================================================
// src/components/Carousel.tsx — Hero 轮播
// -----------------------------------------------------------------------------
// 功能：首页主视觉轮播（UI/UX §6.2）——6s 自动切换 + 箭头/指示点手动切换，
//       opacity 过渡 .8s；尊重系统减弱动效（prefers-reduced-motion 自动停止）。
// =============================================================================

import { useCallback, useEffect, useRef, useState } from 'react'

interface Slide {
  /** 背景内容（红墙宫阙 SVG 插画或图片 URL） */
  bg: React.ReactNode
  /** 轮播标语（覆盖在背景之上） */
  slogan: string
  /** 副标语（可选） */
  sub?: string
  /** 跳转链接（后台轮播图 link_url，点击整屏跳转；可空不跳） */
  link?: string
}

interface CarouselProps {
  slides: Slide[]
  autoMs?: number  // 自动切换间隔（默认 6000ms）
}

export function Carousel({ slides, autoMs = 6000 }: CarouselProps) {
  const [index, setIndex] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 手动切换（供箭头/指示点使用）
  const go = useCallback((next: number) => {
    setIndex(((next % slides.length) + slides.length) % slides.length)
  }, [slides.length])

  // 自动轮播（尊重 reduced-motion 关闭）
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length)
    }, autoMs)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [autoMs, slides.length])

  if (slides.length === 0) return null

  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: '#3A0B0F',
        // 关键：容器必须有显式高度，否则 absolute 定位的 slide 撑不起容器（轮播塌陷不可见）
        height: 480,
      }}
      className="carousel"
      aria-roledescription="轮播"
    >
      {/* 移动端降低轮播高度 */}
      <style>{`@media (max-width: 768px){ .carousel{ height: 340px !important; } }`}</style>
      {/* 当前轮播内容（opacity 过渡 .8s，UI/UX §6.2） */}
      {slides.map((s, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            inset: 0,
            opacity: i === index ? 1 : 0,
            transition: 'opacity .8s',
            pointerEvents: i === index ? 'auto' : 'none',
          }}
        >
          {/* 背景（SVG 插画或图片）——link_url 存在时整屏可点击跳转（需求 #4） */}
          {s.link ? (
            <a
              href={s.link}
              aria-label={s.slogan}
              style={{ position: 'absolute', inset: 0, display: 'block', textDecoration: 'none' }}
              onClick={(e) => e.stopPropagation()}
            >
              {s.bg}
            </a>
          ) : (
            <div style={{ position: 'absolute', inset: 0 }}>{s.bg}</div>
          )}
          {/* 标语层（居中） */}
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '0 24px',
            }}
          >
            <h2 style={{ fontFamily: 'var(--font-title)', fontSize: 'clamp(32px,5vw,56px)', fontWeight: 900, letterSpacing: 10, color: '#F6ECD7', margin: 0 }}>
              {s.slogan}
            </h2>
            {s.sub && (
              <div style={{ marginTop: 14, fontSize: 15, letterSpacing: 4, color: 'var(--gold-light)' }}>{s.sub}</div>
            )}
            {/* 金色分隔线（UI/UX §3.8） */}
            <div className="gold-divider" style={{ marginTop: 22 }} />
          </div>
        </div>
      ))}

      {/* 箭头（左右切换） */}
      <button aria-label="上一张" onClick={() => go(index - 1)} style={arrowStyle('left')}>‹</button>
      <button aria-label="下一张" onClick={() => go(index + 1)} style={arrowStyle('right')}>›</button>

      {/* 指示点 */}
      <div style={{ position: 'absolute', bottom: 18, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 8, zIndex: 3 }}>
        {slides.map((_, i) => (
          <button
            key={i}
            aria-label={`切换到第 ${i + 1} 张`}
            onClick={() => go(i)}
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              border: '1px solid #C9A96A',
              background: i === index ? '#C9A96A' : 'transparent',
              cursor: 'pointer',
              padding: 0,
            }}
          />
        ))}
      </div>
    </div>
  )
}

// 箭头按钮统一样式
function arrowStyle(side: 'left' | 'right'): React.CSSProperties {
  return {
    position: 'absolute',
    top: '50%',
    [side]: 16,
    transform: 'translateY(-50%)',
    zIndex: 3,
    width: 40,
    height: 40,
    borderRadius: '50%',
    border: '1px solid rgba(201,169,106,.6)',
    background: 'rgba(43,29,22,.35)',
    color: '#E8D9B5',
    fontSize: 24,
    lineHeight: 1,
    cursor: 'pointer',
  } as React.CSSProperties
}
