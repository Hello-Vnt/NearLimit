import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  Bot,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  Code2,
  Headphones,
  Hexagon,
  KeyRound,
  Plane,
  Plug,
  Search,
  Server,
  ShoppingCart,
  Sparkles,
  X,
  type LucideIcon,
} from 'lucide-react'
import { LogoMark } from './LogoMark'
import { BotMascot } from './BotMascot'
import { REPO_URL } from '../lib/config'

/*
 * Hero after amplemarket.com: tight centred headline, one CTA, a large live
 * list card on a soft multi-colour glow, motion streaks on the left and a
 * "NEW" card stack on the right. The doodle character is replaced by glossy
 * CSS 3D objects. Every row is an example of a NearLimit decision.
 */

const d = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties
const reduce = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// ---------------------------------------------------------------- 3D objects

/** A glossy rounded tile with real depth: stacked layers in a 3D context. */
function Tile3D({ size, from, to, icon: Icon, className = '', tilt = 0, dur = 9 }: { size: number; from: string; to: string; icon: LucideIcon | 'logo'; className?: string; tilt?: number; dur?: number }) {
  const r = size * 0.28
  const depth = Math.round(size * 0.16)
  return (
    <div className={`pointer-events-none absolute ${className}`} style={{ perspective: 900 }} aria-hidden="true">
      <div className="rock-3d relative" style={{ width: size, height: size, transformStyle: 'preserve-3d', animationDuration: `${dur}s`, ['--tilt' as string]: `${tilt}deg` }}>
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="absolute inset-0"
            style={{ borderRadius: r, transform: `translateZ(${-depth + (i * depth) / 6}px)`, background: `color-mix(in srgb, ${to} 78%, #000)` }}
          />
        ))}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            borderRadius: r,
            background: `linear-gradient(145deg, ${from}, ${to})`,
            boxShadow: `inset 0 2px 1px rgba(255,255,255,.65), inset 0 -${size * 0.12}px ${size * 0.22}px rgba(0,0,0,.16), 0 ${size * 0.45}px ${size * 0.5}px -${size * 0.25}px ${to}`,
          }}
        >
          <div className="absolute inset-x-[10%] top-[7%] h-[38%] rounded-[40%] bg-gradient-to-b from-white/60 to-white/0" />
          {Icon === 'logo' ? (
            <LogoMark className="relative h-[40%] w-auto text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.25)]" />
          ) : (
            <Icon className="relative size-[46%] text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.25)]" strokeWidth={2.2} />
          )}
        </div>
      </div>
    </div>
  )
}

/** A thick glossy coin with the NearLimit mark. */
function Coin3D({ size, className = '' }: { size: number; className?: string }) {
  const depth = Math.round(size * 0.14)
  return (
    <div className={`pointer-events-none absolute ${className}`} style={{ perspective: 900 }} aria-hidden="true">
      <div className="spin-coin relative" style={{ width: size, height: size, transformStyle: 'preserve-3d' }}>
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="absolute inset-0 rounded-full" style={{ transform: `translateZ(${-depth / 2 + (i * depth) / 8}px)`, background: '#6a4fd1' }} />
        ))}
        <div
          className="absolute inset-0 flex items-center justify-center rounded-full"
          style={{
            transform: `translateZ(${depth / 2}px)`,
            background: 'radial-gradient(circle at 32% 28%, #e7deff, #a68aff 45%, #7a5cf0 80%)',
            boxShadow: 'inset 0 0 0 4px rgba(255,255,255,.35), inset 0 -8px 14px rgba(0,0,0,.18)',
          }}
        >
          <LogoMark className="h-[38%] w-auto text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.25)]" />
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- live list

type Status = 'approved' | 'held' | 'blocked'
interface Row {
  agent: string
  icon: LucideIcon
  tone: string
  pay: string
  signal: string
  status: Status
}

const POOL: Row[] = [
  { agent: 'ShopBot', icon: ShoppingCart, tone: 'var(--blue)', pay: '0.1 NEAR → coffee.testnet', signal: 'Within every limit', status: 'approved' },
  { agent: 'ResearchBot', icon: Search, tone: 'var(--accent)', pay: '0.02 NEAR → inference.testnet', signal: 'Paid per API call', status: 'approved' },
  { agent: 'ShopBot', icon: ShoppingCart, tone: 'var(--blue)', pay: '5 NEAR → drain.testnet', signal: 'Over per-payment limit', status: 'blocked' },
  { agent: 'SupportBot', icon: Headphones, tone: 'var(--coral)', pay: '0.8 NEAR → new-vendor.testnet', signal: 'New receiver, owner asked', status: 'held' },
  { agent: 'TravelBot', icon: Plane, tone: 'var(--ok)', pay: '0.4 NEAR → tickets.testnet', signal: 'Within every limit', status: 'approved' },
  { agent: 'OpsBot', icon: Server, tone: 'var(--accent)', pay: '0.3 NEAR → host.testnet', signal: 'Allowlisted supplier', status: 'approved' },
  { agent: 'ShopBot', icon: ShoppingCart, tone: 'var(--blue)', pay: '1 NEAR → evil.testnet', signal: 'Receiver on blocklist', status: 'blocked' },
  { agent: 'ResearchBot', icon: Search, tone: 'var(--accent)', pay: '1.6 NEAR → data-feed.testnet', signal: 'Over daily limit', status: 'held' },
  { agent: 'OpsBot', icon: Server, tone: 'var(--accent)', pay: '0.2 NEAR → storage.testnet', signal: 'Within every limit', status: 'approved' },
  { agent: 'TravelBot', icon: Plane, tone: 'var(--ok)', pay: '0.9 NEAR → hotel.testnet', signal: 'Above ask-me line', status: 'held' },
]

const DIAMOND: Record<Status, string> = {
  approved: 'linear-gradient(135deg, #8fe3b0, #2a9d5c)',
  held: 'linear-gradient(135deg, #d9ccff, #7a5cf0)',
  blocked: 'linear-gradient(135deg, #ffc2b0, #e0573a)',
}
const LABEL: Record<Status, string> = { approved: 'Approved', held: 'Held', blocked: 'Blocked' }

function useLiveRows(visible: number) {
  const [rows, setRows] = useState(() => POOL.slice(0, visible).map((r, i) => ({ ...r, key: i })))
  const next = useRef(visible)
  useEffect(() => {
    if (reduce()) return
    const id = setInterval(() => {
      if (document.hidden) return
      const r = POOL[next.current % POOL.length]
      const key = next.current++
      setRows((all) => [{ ...r, key }, ...all].slice(0, visible))
    }, 2800)
    return () => clearInterval(id)
  }, [visible])
  return rows
}

function FeedCard() {
  const rows = useLiveRows(7)
  const first = rows[0]?.key
  return (
    <div className="relative mx-auto w-full max-w-[620px] overflow-hidden rounded-[22px] border border-line bg-bg/95 shadow-[0_30px_80px_-30px_rgba(30,29,28,0.35)] backdrop-blur [mask-image:linear-gradient(to_bottom,#000_78%,transparent)]">
      <div className="flex items-center gap-2.5 bg-surface px-4 py-3 text-[14px] whitespace-nowrap">
        <span className="hidden size-4 rounded border border-line-strong sm:block" />
        <ChevronDown className="size-4 text-muted" />
        <span className="font-medium">Recently checked</span>
        <span className="rounded-md bg-chip px-1.5 text-[12px] font-medium">20+</span>
        <span className="ml-auto rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-medium text-accent-text">Example<span className="hidden sm:inline"> feed</span></span>
      </div>
      <ul className="divide-y divide-line px-4">
        {rows.map((r) => (
          <li key={r.key} className={`flex items-center gap-3.5 py-3.5 ${r.key === first && r.key >= 7 ? 'feed-in' : ''}`}>
            <span className="hidden size-4 shrink-0 rounded border border-line-strong sm:block" />
            <span className="relative flex size-11 shrink-0 items-center justify-center rounded-xl" style={{ background: `color-mix(in srgb, ${r.tone} 22%, transparent)`, color: `color-mix(in srgb, ${r.tone} 70%, var(--fg))` }}>
              <r.icon className="size-5" strokeWidth={2} />
              <span className="absolute -right-1 -bottom-1 flex size-[18px] items-center justify-center rounded-full border-2 border-[var(--bg)] bg-[var(--btn-bg)] text-[var(--btn-fg)]">
                <KeyRound className="size-2.5" strokeWidth={2.5} />
              </span>
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block text-[15px] font-medium">{r.agent}</span>
              <span className="mono block truncate !text-[13px] text-muted">{r.pay}</span>
            </span>
            <span className="hidden shrink-0 items-center gap-2 rounded-lg border border-line bg-bg px-2.5 py-1 text-[13px] shadow-sm sm:flex">
              <span className="text-muted">{r.signal}</span>
              <span className="font-medium">{LABEL[r.status]}</span>
              <span className="size-3 rotate-45 rounded-[3px] shadow-sm" style={{ background: DIAMOND[r.status] }} />
            </span>
            <span className="size-3 shrink-0 rotate-45 rounded-[3px] sm:hidden" style={{ background: DIAMOND[r.status] }} />
          </li>
        ))}
      </ul>
    </div>
  )
}

// ---------------------------------------------------------------- side pieces

function Streaks() {
  return (
    <svg aria-hidden="true" viewBox="0 0 520 360" className="pointer-events-none absolute top-[470px] left-0 hidden w-[42vw] max-w-[640px] lg:block" preserveAspectRatio="none">
      <defs>
        <linearGradient id="streak" x1="0" x2="1">
          <stop offset="0" stopColor="var(--border-strong)" stopOpacity="0" />
          <stop offset="1" stopColor="var(--muted)" stopOpacity="0.45" />
        </linearGradient>
      </defs>
      {[30, 80, 130, 180, 230, 280].map((y, i) => (
        <path key={y} className="streak" style={{ animationDelay: `${i * -0.7}s` }} d={`M -20 ${y} C 160 ${y + 10}, 330 ${170 + (y - 160) * 0.35}, 520 ${172 + (y - 160) * 0.18}`} fill="none" stroke="url(#streak)" strokeWidth="1.4" />
      ))}
    </svg>
  )
}

function NewStack() {
  const [open, setOpen] = useState(true)
  if (!open) return null
  return (
    <div className="absolute right-[3%] bottom-[60px] z-10 hidden w-[250px] xl:block">
      <div className="absolute inset-0 translate-x-[-34px] translate-y-[10px] rotate-[-9deg] rounded-2xl border border-line bg-[var(--blue-soft)] shadow-md" />
      <div className="absolute inset-0 translate-x-[-18px] translate-y-[5px] rotate-[-4.5deg] rounded-2xl border border-line bg-[var(--coral-soft)] shadow-md" />
      <div className="rise-in relative block rounded-2xl border border-line bg-bg p-3 text-left shadow-xl shadow-black/10" style={d(900)}>
        <div className="relative h-[108px] overflow-hidden rounded-xl bg-[linear-gradient(135deg,var(--accent-soft),var(--blue-soft)_55%,var(--coral-soft))]">
          <span className="absolute top-2 left-2 rounded-md bg-[var(--btn-bg)] px-1.5 py-0.5 text-[10.5px] font-semibold text-[var(--btn-fg)]">NEW</span>
          <Tile3D size={58} from="#c9b8ff" to="#7a5cf0" icon={Plug} className="top-[24px] left-[34px]" tilt={-14} dur={7} />
          <Tile3D size={46} from="#bfe0ff" to="#3d8be0" icon={Bot} className="top-[38px] left-[128px]" tilt={12} dur={8} />
        </div>
        <button type="button" onClick={() => setOpen(false)} aria-label="Dismiss" className="absolute top-4 right-4 flex size-6 items-center justify-center rounded-full bg-bg/80 text-muted hover:text-fg">
          <X className="size-3.5" />
        </button>
        <div className="mt-3 px-1 text-[17px] leading-[1.25] font-medium tracking-[-0.02em]">MCP server: let Claude Code and Codex pay safely</div>
        <a href={`${REPO_URL}#use-it-from-a-real-ai-agent-mcp`} target="_blank" rel="noreferrer" className="mt-3 flex items-center gap-1 border-t border-line px-1 pt-2.5 text-[14px] font-medium hover:text-accent-text">
          Read the setup <ChevronRight className="size-4" />
        </a>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- logos row

const BUILT_WITH: { label: string; icon: LucideIcon }[] = [
  { label: 'NEAR Protocol', icon: Hexagon },
  { label: 'near-sdk-rs', icon: Code2 },
]
const BUILT_WITH_2: { label: string; icon: LucideIcon }[] = [
  { label: 'NEAR AI Cloud', icon: Sparkles },
  { label: 'MCP', icon: Plug },
]

function Wordmark({ label, icon: Icon }: { label: string; icon: LucideIcon }) {
  return (
    <span className="flex items-center gap-2 text-[19px] font-semibold tracking-[-0.03em] whitespace-nowrap text-muted opacity-75 md:text-[22px]">
      <Icon className="size-5 md:size-6" strokeWidth={2} /> {label}
    </span>
  )
}

// ---------------------------------------------------------------- hero

export default function HeroSection() {
  return (
    <>
      <section className="relative overflow-hidden pb-6">
        {/* drifting multi-colour glow */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="blob absolute top-[380px] left-[8%] size-[560px] rounded-full bg-[var(--accent)] opacity-[var(--blob-a)] blur-[90px]" />
          <div className="blob absolute top-[470px] left-[38%] size-[620px] rounded-full bg-[var(--blue)] opacity-[var(--blob-a)] blur-[100px]" style={{ animationDelay: '-6s' }} />
          <div className="blob absolute top-[360px] right-[6%] size-[500px] rounded-full bg-[var(--coral)] opacity-[var(--blob-a)] blur-[90px]" style={{ animationDelay: '-11s' }} />
        </div>

        <div className="container-page relative flex flex-col items-center pt-16 text-center md:pt-24">
          <h1 className="rise-in !block text-[44px] leading-[1.02] font-medium tracking-[-0.055em] sm:text-[60px] md:text-[78px] md:leading-[0.98]">
            Your AI agent can spend.
            <br />
            It just can’t overspend.
          </h1>
          <p className="rise-in !block mt-6 max-w-[560px] text-[18px] leading-[28px] text-muted md:text-[20px] md:leading-[30px]" style={d(150)}>
            A spending firewall for AI agents on NEAR. Every payment is checked on-chain, held for you when it looks wrong, or blocked.
          </p>
          <div className="rise-in !flex mt-8 flex-col items-center gap-3" style={d(280)}>
            <Link to="/playground" className="btn btn-accent h-12 rounded-xl px-6 text-[16px]">
              Try to trick an agent <ArrowUpRight className="size-4" />
            </Link>
            <Link to="/app" className="text-[14px] text-muted underline decoration-line-strong underline-offset-4 hover:text-fg">or open the app</Link>
          </div>
        </div>

        {/* stage: streaks, 3D objects, the live card, the NEW stack */}
        <div className="relative mt-14 min-h-[560px] md:mt-16">
          <Streaks />
          <div className="fly-in pointer-events-none absolute top-[140px] left-[13%] hidden lg:block">
            <Tile3D size={74} from="#ffc2b0" to="#e0573a" icon={KeyRound} tilt={-18} dur={8} />
          </div>
          <div className="rise-in pointer-events-none absolute top-[-92px] left-[calc(50%+200px)] z-20 hidden md:block" style={d(700)}>
            <BotMascot size={150} glow="#a68aff" look={-0.8} />
          </div>
          <Coin3D size={84} className="top-[300px] left-[calc(50%+330px)] hidden lg:block" />
          <Tile3D size={64} from="#bfe0ff" to="#3d8be0" icon="logo" className="top-[360px] left-[calc(50%-400px)] hidden lg:block" tilt={-12} dur={10} />

          <div className="container-page relative">
            <div className="rise-in !block" style={d(380)}>
              <FeedCard />
            </div>
          </div>
          <NewStack />
        </div>
      </section>

      {/* logos + honest stat */}
      <section className="border-y border-line py-9" aria-label="Built with">
        <div className="container-page flex flex-wrap items-center justify-center gap-x-10 gap-y-6 md:justify-between">
          {BUILT_WITH.map((b) => <Wordmark key={b.label} {...b} />)}
          <div className="flex flex-col items-center leading-tight">
            <span className="text-[13px] text-muted">Contract tests <span className="font-semibold text-coral-text">18 / 18</span></span>
            <span className="mt-1 flex gap-1 text-[var(--coral)]">
              {Array.from({ length: 5 }, (_, i) => <CircleCheck key={i} className="size-[18px]" strokeWidth={2.25} />)}
            </span>
            <span className="mt-1 text-[12px] text-muted">passing in cargo test</span>
          </div>
          {BUILT_WITH_2.map((b) => <Wordmark key={b.label} {...b} />)}
        </div>
      </section>
    </>
  )
}
