import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Ban,
  Bot,
  CalendarCheck,
  CircleCheck,
  Code2,
  FileText,
  Headphones,
  ListFilter,
  MousePointer2,
  Plane,
  Plug,
  Receipt,
  Repeat,
  Search,
  Server,
  ShoppingCart,
  Sparkles,
  Terminal,
  X,
  type LucideIcon,
} from 'lucide-react'
import { LogoMark } from './LogoMark'

/*
 * Bento grid after amplemarket.com: four cards with a centred heading and a
 * small animated piece of NearLimit UI each. All motion stops under
 * prefers-reduced-motion; the timed card only runs while on screen.
 */

const reduce = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function useOnScreen<T extends Element>() {
  const ref = useRef<T>(null)
  const [on, setOn] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { threshold: 0.35 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return [ref, on] as const
}

function Card({ title, children, className = '' }: { title: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div data-reveal className={`relative overflow-hidden rounded-[28px] bg-surface ${className}`}>
      <h3 className="mx-auto max-w-[420px] px-6 pt-10 text-center text-[26px] leading-[1.15] font-medium tracking-[-0.035em] text-balance md:pt-12 md:text-[32px]">{title}</h3>
      {children}
    </div>
  )
}

// ---------------------------------------------------------------- 1. mascot + signals

const SIGNALS: { text: string; color: string }[] = [
  { text: 'Prompt injection in memo', color: 'var(--coral)' },
  { text: 'Over daily limit', color: '#e0a443' },
  { text: 'First payment to this account', color: 'var(--accent)' },
  { text: 'Receiver on blocklist', color: 'var(--danger)' },
  { text: 'Within every limit', color: 'var(--ok)' },
  { text: '8× the agent’s average', color: 'var(--blue)' },
]

function Mascot() {
  return (
    <div className="float-y relative z-10 flex size-[170px] items-center justify-center rounded-[44px] bg-[#2a2928] shadow-[0_30px_60px_-24px_rgba(0,0,0,0.5),inset_0_2px_0_rgba(255,255,255,0.08)] md:size-[200px]" style={{ animationDuration: '5s' }}>
      <div
        className="relative flex size-[96px] rotate-45 items-center justify-center rounded-[26px] md:size-[112px]"
        style={{
          background: 'radial-gradient(circle at 30% 25%, #e9e0ff, #b39cff 45%, #7a5cf0 95%)',
          boxShadow: 'inset 0 3px 4px rgba(255,255,255,.6), inset 0 -14px 22px rgba(60,20,140,.35), 0 10px 26px -8px #7a5cf0',
        }}
      >
        <div className="flex -rotate-45 gap-3">
          <span className="blink h-5 w-2.5 rounded-full bg-[#1a1a19]" />
          <span className="blink h-5 w-2.5 rounded-full bg-[#1a1a19]" />
        </div>
      </div>
    </div>
  )
}

function SignalsCard() {
  const row = (copy: number) =>
    SIGNALS.map((s) => (
      <span key={`${copy}-${s.text}`} className="mr-3 flex shrink-0 items-center gap-2 rounded-xl bg-bg px-3.5 py-2 text-[16px] whitespace-nowrap shadow-sm">
        <span className="size-4 rounded-[5px]" style={{ background: s.color }} />
        {s.text}
      </span>
    ))
  return (
    <Card title="Always-on checks catch every risky payment">
      <div className="relative flex h-[300px] items-center justify-center md:h-[320px]">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_15%,#000_85%,transparent)]">
          <div className="marquee flex w-max" style={{ ['--marquee-dur' as string]: '28s' }}>
            {row(0)}
            <span aria-hidden="true" className="flex">{row(1)}</span>
          </div>
        </div>
        <Mascot />
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------- 2. table

const TABLE: { agent: string; icon: LucideIcon; tone: string; chip: string; dot: string; more?: number }[] = [
  { agent: 'ShopBot', icon: ShoppingCart, tone: 'var(--blue)', chip: 'Prompt injection', dot: 'var(--coral)', more: 1 },
  { agent: 'ResearchBot', icon: Search, tone: 'var(--accent)', chip: 'Over daily limit', dot: '#e0a443', more: 2 },
  { agent: 'SupportBot', icon: Headphones, tone: 'var(--coral)', chip: 'New receiver', dot: 'var(--accent)', more: 1 },
  { agent: 'TravelBot', icon: Plane, tone: 'var(--ok)', chip: 'Above ask-me line', dot: 'var(--blue)' },
  { agent: 'OpsBot', icon: Server, tone: 'var(--accent)', chip: 'Unusual amount', dot: 'var(--blue)', more: 1 },
]

function TableCard() {
  return (
    <Card title="Know which agents need you today">
      <div className="mt-10 ml-6 overflow-hidden rounded-tl-2xl border-t border-l border-line bg-bg md:ml-12 [mask-image:linear-gradient(to_bottom,#000_70%,transparent),linear-gradient(to_right,#000_80%,transparent)] [mask-composite:intersect]">
        <div className="flex items-center gap-2 border-b border-line px-4 py-3 text-[14px]">
          <span className="flex size-8 items-center justify-center rounded-lg border border-line"><Search className="size-4" /></span>
          <span className="flex items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 whitespace-nowrap">
            <ListFilter className="size-4 text-muted" /> Status <span className="text-muted">is</span>
            <span className="flex items-center gap-1 font-medium text-accent-text"><span className="size-2 rounded-full bg-[var(--accent)]" /> Held</span>
            <X className="size-3.5 text-muted" />
          </span>
        </div>
        <div className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)] bg-surface text-[14px] text-muted">
          <span className="border-r border-line px-4 py-3">Agent</span>
          <span className="px-4 py-3 whitespace-nowrap">Policy check <span className="opacity-70">· every request ↓</span></span>
        </div>
        <div className="relative">
          <div aria-hidden="true" className="scan-row pointer-events-none absolute inset-x-0 top-0 h-[54px] bg-[var(--accent-soft)]" />
          {TABLE.map((r) => (
            <div key={r.agent} className="relative grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)] border-t border-line text-[15px]">
              <span className="flex items-center gap-2.5 border-r border-line px-4 py-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg" style={{ background: `color-mix(in srgb, ${r.tone} 24%, transparent)`, color: `color-mix(in srgb, ${r.tone} 70%, var(--fg))` }}>
                  <r.icon className="size-4" strokeWidth={2} />
                </span>
                <span className="truncate font-medium">{r.agent}</span>
              </span>
              <span className="flex items-center gap-2 px-4 py-3 whitespace-nowrap">
                <span className="flex items-center gap-1.5 rounded-md border border-line px-2 py-0.5 text-[13.5px]">
                  <span className="size-2 rounded-[2px]" style={{ background: r.dot }} /> {r.chip}
                </span>
                {r.more && <span className="rounded-md border border-line px-1.5 py-0.5 text-[12px] text-muted">+{r.more}</span>}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------- 3. decide card (timed)

function DecideCard() {
  const [ref, on] = useOnScreen<HTMLDivElement>()
  const [step, setStep] = useState(1) // 0 plain, 1 sources open, 2 cursor on Reject, 3 rejected
  useEffect(() => {
    if (!on || reduce()) return
    const id = setInterval(() => setStep((s) => (s + 1) % 4), 1900)
    return () => clearInterval(id)
  }, [on])
  return (
    <Card title="Decide held payments in one tap">
      <div ref={ref} className="relative mx-6 mt-10 mb-0 overflow-hidden rounded-t-2xl border border-b-0 border-line bg-bg md:mx-12 [mask-image:linear-gradient(to_bottom,#000_80%,transparent)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-[var(--accent-soft)] px-4 py-3 text-[14px]">
          <span className="flex items-center gap-2 text-accent-text">
            Held request from <span className="flex items-center gap-1.5 rounded-md bg-bg px-2 py-0.5 font-medium text-fg"><ShoppingCart className="size-3.5" /> ShopBot</span>
          </span>
          <span className="flex items-center gap-2 text-accent-text">
            Explained by <span className="flex items-center gap-1.5 rounded-md bg-bg px-2 py-0.5 font-medium text-fg">NEAR AI <Sparkles className="size-3.5 text-accent-text" /></span>
          </span>
        </div>
        <div className="relative min-h-[290px] px-5 py-5 text-[15px] leading-[1.6]">
          <p>
            <span className="mono !text-[14px]">0.8 NEAR</span> to <span className="mono !text-[14px]">totally-legit-vendor.testnet</span>
          </p>
          <p className="mt-3 max-w-[56%] text-muted">First payment to this account, and the memo tells the reader to ignore previous instructions. Typical of prompt injection.</p>
          <div className="mt-5 flex items-center gap-2">
            <span className={`btn h-9 px-4 transition-all ${step === 3 ? 'btn-coral' : 'btn-primary'} ${step === 2 ? 'scale-95' : ''}`}>
              {step === 3 ? <><CircleCheck className="size-3.5" /> Rejected</> : <><Ban className="size-3.5" /> Reject</>}
            </span>
            <span className="btn btn-ghost h-9 px-4">Approve</span>
            <span className="badge badge-danger ml-1">Risk: High</span>
          </div>
          {step === 3 && <div className="bubble-in mt-3 text-[13px] text-muted">Logged on-chain. Nothing was sent.</div>}

          <div className={`absolute top-3 right-4 w-[min(300px,62%)] rounded-xl border border-line bg-bg p-3.5 text-[14px] shadow-xl shadow-black/10 transition-all duration-300 ${step === 1 || step === 2 ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0'}`}>
            <div className="text-[13px] text-muted">2 facts used</div>
            <div className="mt-2.5 flex items-center gap-2"><FileText className="size-4 text-muted" /> Receiver account</div>
            <div className="mt-1 pl-6 text-muted">Does not exist on testnet</div>
            <div className="mt-2.5 border-t border-line pt-2.5">
              <div className="flex items-center gap-2"><Bot className="size-4 text-muted" /> Memo scan</div>
              <div className="mt-1 pl-6 text-muted">Instruction-like text found</div>
            </div>
          </div>

          <MousePointer2
            className="pointer-events-none absolute size-6 fill-[var(--fg)] text-[var(--bg)] drop-shadow transition-all duration-700 ease-out"
            style={step >= 2 ? { left: 64, top: 192 } : { left: '72%', top: 20 }}
            strokeWidth={1.5}
          />
        </div>
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------- 4. channels

const CHANNELS_A: { label: string; icon: LucideIcon; color: string }[] = [
  { label: 'Claude Code', icon: Terminal, color: 'var(--coral)' },
  { label: 'Codex', icon: Code2, color: 'var(--ok)' },
  { label: 'Cursor', icon: MousePointer2, color: 'var(--fg)' },
  { label: 'MCP server', icon: Plug, color: 'var(--accent)' },
  { label: 'CLI script', icon: Terminal, color: 'var(--blue)' },
  { label: 'ShopBot', icon: ShoppingCart, color: 'var(--blue)' },
]
const CHANNELS_B: { label: string; icon: LucideIcon; color: string }[] = [
  { label: 'API calls', icon: Server, color: 'var(--accent)' },
  { label: 'Invoices', icon: Receipt, color: 'var(--coral)' },
  { label: 'Bookings', icon: CalendarCheck, color: 'var(--ok)' },
  { label: 'Subscriptions', icon: Repeat, color: 'var(--blue)' },
  { label: 'Shopping', icon: ShoppingCart, color: '#e0a443' },
  { label: 'Data feeds', icon: Search, color: 'var(--accent)' },
]

function ChannelRow({ items, reverse }: { items: typeof CHANNELS_A; reverse?: boolean }) {
  const row = (copy: number) =>
    items.map((c) => (
      <span key={`${copy}-${c.label}`} className="mr-3 flex shrink-0 items-center gap-2.5 rounded-xl bg-bg py-2 pr-4 pl-2 text-[16px] whitespace-nowrap shadow-sm">
        <span className="flex size-7 items-center justify-center rounded-lg" style={{ background: `color-mix(in srgb, ${c.color} 22%, transparent)`, color: c.color }}>
          <c.icon className="size-4" strokeWidth={2} />
        </span>
        {c.label}
      </span>
    ))
  return (
    <div className="overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
      <div className={`marquee flex w-max ${reverse ? 'marquee-rev' : ''}`} style={{ ['--marquee-dur' as string]: '34s' }}>
        {row(0)}
        <span aria-hidden="true" className="flex">{row(1)}</span>
      </div>
    </div>
  )
}

function ChannelsCard() {
  return (
    <Card title="One policy for every agent and tool">
      <div className="relative mt-10 pb-10">
        <div className="relative mx-auto flex size-[88px] items-center justify-center rounded-[24px] bg-[var(--accent-soft)] shadow-[0_12px_30px_-12px_var(--accent)]">
          <span className="pulse-ring absolute inset-0 rounded-[24px] border-2 border-[var(--accent)]" />
          <LogoMark className="h-9 w-auto text-accent-text" />
        </div>
        <svg aria-hidden="true" viewBox="0 0 600 70" preserveAspectRatio="none" className="mx-auto mt-0 block h-[70px] w-[86%]">
          <path d="M300 0 V30 Q300 40 290 40 H30 Q12 40 12 58 V70 M300 30 Q300 40 310 40 H570 Q588 40 588 58 V70" fill="none" stroke="var(--border-strong)" strokeWidth="1.5" />
          <path className="flow-line" d="M300 0 V30 Q300 40 290 40 H30 Q12 40 12 58 V70" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" />
          <path className="flow-line" style={{ animationDelay: '-1.2s' }} d="M300 0 V30 Q300 40 310 40 H570 Q588 40 588 58 V70" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
        <div className="mt-3 flex flex-col gap-3">
          <ChannelRow items={CHANNELS_A} />
          <ChannelRow items={CHANNELS_B} reverse />
        </div>
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------- grid

export default function BentoFeatures() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-6">
        <SignalsCard />
        <DecideCard />
      </div>
      <div className="flex min-w-0 flex-col gap-6">
        <TableCard />
        <ChannelsCard />
      </div>
    </div>
  )
}
