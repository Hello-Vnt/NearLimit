import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Info } from 'lucide-react'

/**
 * Tooltip on hover and keyboard focus (and tap, for `focusable` triggers).
 * Rendered in a portal with fixed positioning, so scroll areas and animated
 * parents never clip it, and it is kept inside the viewport.
 */
export function Tip({ text, children, focusable = false, className = '' }: { text: string; children: ReactNode; focusable?: boolean; className?: string }) {
  const id = useId()
  const trigger = useRef<HTMLSpanElement>(null)
  const bubble = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    if (!open || !trigger.current || !bubble.current) return
    const r = trigger.current.getBoundingClientRect()
    const w = bubble.current.offsetWidth
    const h = bubble.current.offsetHeight
    const left = Math.max(8, Math.min(r.left + r.width / 2 - w / 2, window.innerWidth - w - 8))
    const top = r.top - h - 8 < 8 ? r.bottom + 8 : r.top - h - 8
    setPos({ top, left })
  }, [open])

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const show = () => {
    setPos(null)
    setOpen(true)
  }

  return (
    <span
      ref={trigger}
      className={`inline-flex ${focusable ? 'cursor-help rounded-full' : ''} ${className}`}
      tabIndex={focusable ? 0 : undefined}
      aria-describedby={open ? id : undefined}
      onMouseEnter={show}
      onMouseLeave={() => setOpen(false)}
      onFocus={show}
      onBlur={() => setOpen(false)}
      onClick={focusable ? () => (open ? setOpen(false) : show()) : undefined}
    >
      {children}
      {open &&
        createPortal(
          <span
            ref={bubble}
            id={id}
            role="tooltip"
            style={{ top: pos?.top ?? 0, left: pos?.left ?? 0, visibility: pos ? 'visible' : 'hidden' }}
            className="pointer-events-none fixed z-[70] w-max max-w-[260px] rounded-xl bg-[var(--btn-bg)] px-3 py-2 text-left text-[12.5px] leading-[18px] font-normal tracking-normal whitespace-normal text-[var(--btn-fg)] shadow-lg shadow-black/15"
          >
            {text}
          </span>,
          document.body,
        )}
    </span>
  )
}

/** A small (i) icon that explains the thing next to it. */
export function InfoTip({ text, label = 'More info' }: { text: string; label?: string }) {
  return (
    <Tip text={text} focusable>
      <Info className="size-3.5 text-muted hover:text-fg" strokeWidth={1.75} aria-label={label} />
    </Tip>
  )
}
