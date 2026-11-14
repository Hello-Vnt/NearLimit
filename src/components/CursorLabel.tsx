import { useEffect, useRef } from 'react'

/**
 * The "You" pill that trails the site cursor, like a multiplayer cursor.
 * Mouse and trackpad only; hidden over text fields, outside the window,
 * and when the visitor prefers reduced motion.
 */
export default function CursorLabel() {
  const el = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const node = el.current
    if (!fine || still || !node) return
    let x = -100
    let y = -100
    let raf = 0
    const paint = () => {
      raf = 0
      node.style.transform = `translate3d(${x + 20}px, ${y + 24}px, 0)`
    }
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      x = e.clientX
      y = e.clientY
      const t = e.target as HTMLElement | null
      const typing = !!t?.closest('input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]), textarea, [contenteditable=true]')
      node.style.opacity = typing ? '0' : '1'
      if (!raf) raf = requestAnimationFrame(paint)
    }
    const hide = () => (node.style.opacity = '0')
    const down = () => node.style.setProperty('--s', '0.9')
    const up = () => node.style.setProperty('--s', '1')
    window.addEventListener('pointermove', move, { passive: true })
    document.documentElement.addEventListener('pointerleave', hide)
    window.addEventListener('blur', hide)
    window.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', up)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', move)
      document.documentElement.removeEventListener('pointerleave', hide)
      window.removeEventListener('blur', hide)
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
    }
  }, [])
  return (
    <div ref={el} aria-hidden="true" className="pointer-events-none fixed top-0 left-0 z-[100] opacity-0 transition-opacity duration-200" style={{ transform: 'translate3d(-100px,-100px,0)' }}>
      <span
        className="block rounded-[10px] px-2.5 py-1 text-[13px] font-semibold tracking-[-0.01em] text-white shadow-[0_6px_14px_-4px_rgba(90,60,200,0.55)] transition-transform duration-150"
        style={{ background: '#7a5cf0', transform: 'scale(var(--s, 1))' }}
      >
        You
      </span>
    </div>
  )
}
