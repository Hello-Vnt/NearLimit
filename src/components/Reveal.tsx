import { useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from 'react'

const reduce = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** True once the element has scrolled into view (and stays true). */
export function useInView<T extends Element>(margin = '0px 0px -12% 0px') {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (reduce() || typeof IntersectionObserver === 'undefined') return setInView(true)
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true)
          io.disconnect()
        }
      },
      { rootMargin: margin },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [margin])
  return [ref, inView] as const
}

/** Fades and lifts its content in when it scrolls into view. `delay` staggers siblings. */
export function Reveal({ as: Tag = 'div', delay = 0, className = '', style, children, ...rest }: { as?: ElementType; delay?: number; className?: string; style?: CSSProperties; children: ReactNode } & Record<string, unknown>) {
  const [ref, inView] = useInView<HTMLElement>()
  return (
    <Tag ref={ref} className={`reveal ${inView ? 'is-in' : ''} ${className}`} style={{ ...style, '--d': `${delay}ms` } as CSSProperties} {...rest}>
      {children}
    </Tag>
  )
}

/** Counts up to `to` once visible. */
export function CountUp({ to, decimals = 0, duration = 1300 }: { to: number; decimals?: number; duration?: number }) {
  const [ref, inView] = useInView<HTMLSpanElement>()
  const [v, setV] = useState(() => (reduce() ? to : 0))
  useEffect(() => {
    if (!inView || reduce()) return setV(to)
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      setV(to * (1 - Math.pow(1 - t, 3)))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, to, duration])
  return <span ref={ref} className="tabular-nums">{v.toFixed(decimals)}</span>
}

/**
 * Page-level scroll reveal: every element with `data-reveal` fades in when it
 * enters the viewport. Stagger with style={{ '--d': '120ms' }}.
 * Uses a data attribute (not className) so React re-renders never undo it.
 */
export function useAutoReveal() {
  useEffect(() => {
    const showAll = reduce() || typeof IntersectionObserver === 'undefined'
    const io = showAll
      ? null
      : new IntersectionObserver(
          (entries) => {
            for (const e of entries) {
              if (e.isIntersecting) {
                e.target.setAttribute('data-in', '')
                io?.unobserve(e.target)
              }
            }
          },
          { rootMargin: '0px 0px -10% 0px' },
        )
    const seen = new WeakSet<Element>()
    const scan = () => {
      document.querySelectorAll<HTMLElement>('[data-reveal]:not([data-in])').forEach((el) => {
        if (showAll) return el.setAttribute('data-in', '')
        if (seen.has(el)) return
        seen.add(el)
        io!.observe(el)
      })
    }
    scan()
    // Elements React mounts later (route changes, remounts) are picked up too.
    let queued = 0
    const mo = new MutationObserver(() => {
      if (queued) return
      queued = requestAnimationFrame(() => {
        queued = 0
        scan()
      })
    })
    mo.observe(document.body, { childList: true, subtree: true })
    return () => {
      mo.disconnect()
      io?.disconnect()
      cancelAnimationFrame(queued)
    }
  }, [])
}
