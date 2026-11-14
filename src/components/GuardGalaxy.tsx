import { useEffect, useRef } from 'react'
import {
  Ban,
  Bot,
  Brain,
  Coffee,
  FileText,
  Fuel,
  Gauge,
  Headphones,
  KeyRound,
  ListChecks,
  Lock,
  PauseCircle,
  Search,
  Server,
  ShoppingCart,
  Snowflake,
  Sparkles,
  Ticket,
  UserCheck,
  type LucideIcon,
} from 'lucide-react'
import { CONTRACT_ID, explorerAccount } from '../lib/config'

/**
 * A plnty "Rothko"-style constellation: NearLimit in the middle, the parts it
 * connects around it. Packets fly from agents to the vault, then on to a
 * receiver (approved, green), to the owner (pending, purple) or nowhere
 * (blocked, coral burst at the centre).
 */

interface Cluster {
  id: string
  label: string
  x: number // percent of width
  y: number // percent of height
  size: number // label px at desktop
  icons: LucideIcon[]
  tip: string
}

const CENTER = { x: 52, y: 52 }
const CLUSTERS: Cluster[] = [
  { id: 'agents', label: 'Agents', x: 21, y: 38, size: 48, icons: [Bot, ShoppingCart, Search, Headphones], tip: 'Each AI agent holds its own restricted key' },
  { id: 'policy', label: 'Policy', x: 50, y: 17, size: 28, icons: [Gauge, ListChecks, Ban], tip: 'Per-payment, daily and ask-me limits, allowlist, blocklist' },
  { id: 'owner', label: 'Owner', x: 80, y: 30, size: 36, icons: [UserCheck, Snowflake, PauseCircle], tip: 'Approves held payments and pulls the kill switches' },
  { id: 'keys', label: 'NEAR keys', x: 17, y: 77, size: 30, icons: [KeyRound, Fuel, Lock], tip: 'Function-call access keys with a 0.25 NEAR gas allowance' },
  { id: 'ai', label: 'AI explain', x: 46, y: 84, size: 24, icons: [Sparkles, Brain, FileText], tip: 'NEAR AI Cloud writes the explanation; code sets the risk' },
  { id: 'receivers', label: 'Receivers', x: 77, y: 75, size: 54, icons: [Coffee, Server, Ticket], tip: 'Where approved payments land' },
]

type Route = { from: string; to: string | null; color: string }
const ROUTES: Route[] = [
  { from: 'agents', to: 'receivers', color: '#5CC28A' }, // approved
  { from: 'agents', to: 'owner', color: '#B39CFF' }, // pending
  { from: 'agents', to: null, color: '#FF8A6B' }, // blocked
  { from: 'agents', to: 'receivers', color: '#5CC28A' },
  { from: 'owner', to: 'receivers', color: '#B39CFF' }, // owner approved
]

export default function GuardGalaxy() {
  const wrap = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = canvas.current
    const box = wrap.current
    if (!cv || !box) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let w = 0
    let h = 0
    let stars: { x: number; y: number; r: number; p: number; s: number }[] = []
    const glows = [
      { x: 0.15, y: 0.2, r: 0.28, c: 'rgba(166,138,255,0.10)' },
      { x: 0.85, y: 0.75, r: 0.32, c: 'rgba(108,182,255,0.09)' },
      { x: 0.7, y: 0.18, r: 0.2, c: 'rgba(255,138,107,0.07)' },
      { x: 0.3, y: 0.85, r: 0.22, c: 'rgba(255,220,180,0.05)' },
    ]
    const pos = (id: string) => {
      const c = CLUSTERS.find((k) => k.id === id)!
      return { x: (c.x / 100) * w, y: (c.y / 100) * h }
    }
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      w = box.clientWidth
      h = box.clientHeight
      cv.width = w * dpr
      cv.height = h * dpr
      cv.style.width = `${w}px`
      cv.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const n = Math.round((w * h) / 1400)
      stars = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, r: Math.random() < 0.06 ? 1.6 : Math.random() * 0.9 + 0.2, p: Math.random() * Math.PI * 2, s: 0.4 + Math.random() * 1.6 }))
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(box)

    type Packet = { route: Route; t0: number }
    const packets: Packet[] = []
    let next = 0
    let visible = true
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting))
    io.observe(box)

    const draw = (now: number) => {
      ctx.clearRect(0, 0, w, h)
      for (const g of glows) {
        const grd = ctx.createRadialGradient(g.x * w, g.y * h, 0, g.x * w, g.y * h, g.r * Math.max(w, h))
        grd.addColorStop(0, g.c)
        grd.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = grd
        ctx.fillRect(0, 0, w, h)
      }
      for (const s of stars) {
        const a = still ? 0.7 : 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(now / 1000 * s.s + s.p))
        ctx.fillStyle = `rgba(255,255,255,${a})`
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fill()
      }
      const cx = (CENTER.x / 100) * w
      const cy = (CENTER.y / 100) * h
      // spokes
      ctx.lineWidth = 1
      for (const c of CLUSTERS) {
        const p = pos(c.id)
        ctx.strokeStyle = 'rgba(255,255,255,0.13)'
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(p.x, p.y)
        ctx.stroke()
      }
      // packets
      if (!still) {
        if (now > next) {
          packets.push({ route: ROUTES[Math.floor(Math.random() * ROUTES.length)], t0: now })
          next = now + 650 + Math.random() * 700
        }
        for (let i = packets.length - 1; i >= 0; i--) {
          const pk = packets[i]
          const t = (now - pk.t0) / 2600
          if (t > 1.15) {
            packets.splice(i, 1)
            continue
          }
          const a = pos(pk.route.from)
          let x: number, y: number
          if (t < 0.5) {
            const k = t / 0.5
            x = a.x + (cx - a.x) * k
            y = a.y + (cy - a.y) * k
          } else if (pk.route.to) {
            const b = pos(pk.route.to)
            const k = Math.min(1, (t - 0.5) / 0.5)
            x = cx + (b.x - cx) * k
            y = cy + (b.y - cy) * k
          } else {
            // blocked: burst at the centre
            const k = Math.min(1, (t - 0.5) / 0.4)
            ctx.strokeStyle = pk.route.color
            ctx.globalAlpha = 1 - k
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.arc(cx, cy, 8 + k * 34, 0, Math.PI * 2)
            ctx.stroke()
            ctx.globalAlpha = 1
            continue
          }
          ctx.shadowColor = pk.route.color
          ctx.shadowBlur = 12
          ctx.fillStyle = pk.route.color
          ctx.beginPath()
          ctx.arc(x, y, 3.2, 0, Math.PI * 2)
          ctx.fill()
          ctx.shadowBlur = 0
        }
      }
      // the vault
      const pulse = still ? 0 : 0.5 + 0.5 * Math.sin(now / 600)
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, 26 + pulse * 8)
      grd.addColorStop(0, 'rgba(166,138,255,0.55)')
      grd.addColorStop(1, 'rgba(166,138,255,0)')
      ctx.fillStyle = grd
      ctx.beginPath()
      ctx.arc(cx, cy, 34, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#B39CFF'
      ctx.beginPath()
      ctx.arc(cx, cy, 7, 0, Math.PI * 2)
      ctx.fill()
    }

    let raf = 0
    const loop = (now: number) => {
      if (visible && !document.hidden) draw(now)
      raf = requestAnimationFrame(loop)
    }
    if (still) draw(0)
    else raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
    }
  }, [])

  return (
    <div className="rounded-[34px] border-[12px] border-dashed border-[var(--blue)] bg-[#a9d4ff] sm:rounded-[44px] sm:border-[14px] dark:bg-[#123a63]">
      <div ref={wrap} className="relative aspect-[4/5] overflow-hidden rounded-[22px] bg-[#05060a] sm:aspect-[16/10] sm:rounded-[30px]">
        <canvas ref={canvas} className="absolute inset-0" aria-hidden="true" />
        <span
          className="absolute rounded-lg bg-[var(--blue)] px-2 py-0.5 text-[12px] font-medium text-[var(--blue-fg)] shadow-lg sm:text-[13px]"
          style={{ left: `calc(${CENTER.x}% + 14px)`, top: `calc(${CENTER.y}% - 11px)` }}
        >
          @nearlimit
        </span>
        {CLUSTERS.map((c) => (
          <div
            key={c.id}
            className="group absolute -translate-x-1/2 -translate-y-1/2 text-center text-white"
            style={{ left: `${c.x}%`, top: `${c.y}%` }}
            title={c.tip}
          >
            <div className="font-medium tracking-[-0.03em] drop-shadow" style={{ fontSize: `clamp(15px, ${c.size / 14}vw, ${c.size}px)`, lineHeight: 1.1 }}>
              {c.label}
            </div>
            <div className="mt-2 flex justify-center gap-2.5 text-white/55 transition-colors group-hover:text-white/90">
              {c.icons.map((I, n) => <I key={n} className="size-3.5 sm:size-4" strokeWidth={1.75} />)}
            </div>
            <div className="pointer-events-none absolute top-full left-1/2 mt-2 hidden w-[200px] -translate-x-1/2 rounded-lg bg-white/10 px-2.5 py-1.5 text-[12px] leading-4 text-white/85 backdrop-blur group-hover:block">
              {c.tip}
            </div>
          </div>
        ))}
        <div className="absolute bottom-5 left-5 hidden flex-wrap gap-x-3 gap-y-1 text-[12px] text-white/70 sm:flex">
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#5CC28A]" /> approved</span>
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#B39CFF]" /> held for owner</span>
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#FF8A6B]" /> blocked</span>
        </div>
        {CONTRACT_ID && (
          <a
            href={explorerAccount(CONTRACT_ID)}
            target="_blank"
            rel="noreferrer"
            className="absolute right-3 bottom-3 rounded-xl bg-white/85 px-3.5 py-2 text-[13px] font-medium text-[#1e1d1c] hover:bg-white sm:right-5 sm:bottom-5 sm:text-[15px]"
          >
            See the contract
          </a>
        )}
      </div>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 px-2 pt-2.5 pb-1 text-[12px] text-[#0b2e57] sm:hidden dark:text-white/80">
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#2a7347]" /> approved</span>
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#7a5cf0]" /> held for owner</span>
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#d4502f]" /> blocked</span>
      </div>
    </div>
  )
}
