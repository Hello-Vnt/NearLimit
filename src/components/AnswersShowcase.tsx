import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Ban, CircleCheck, CirclePause, KeyRound, Pause, Pencil, Play, type LucideIcon } from 'lucide-react'
import { BotMascot, type Mood } from './BotMascot'
import { AGENT_GAS_ALLOWANCE_NEAR } from '../lib/config'

/*
 * "Every request gets one of three answers": tabs advance on their own, the
 * phone conversation types itself out, and the bot mascot's glow and eyes
 * follow the verdict. Clicking a tab takes over; Play resumes.
 */

type Outcome = 'approved' | 'pending' | 'blocked' | 'sandbox'
type Msg = { from: 'agent' | 'guard'; text: string; verdict?: { label: string; icon: LucideIcon; tone: 'ok' | 'warn' | 'danger' } }

const TABS: { id: Outcome; label: string; icon: LucideIcon; glow: string; mood: Mood }[] = [
  { id: 'approved', label: 'Approved', icon: CircleCheck, glow: '#5cc28a', mood: 'happy' },
  { id: 'pending', label: 'Pending', icon: CirclePause, glow: '#a68aff', mood: 'wait' },
  { id: 'blocked', label: 'Blocked', icon: Ban, glow: '#ff8a6b', mood: 'alert' },
  { id: 'sandbox', label: 'Sandboxed key', icon: KeyRound, glow: '#6cb6ff', mood: 'alert' },
]

const DATA: Record<Outcome, { thread: Msg[]; left: string; right: string }> = {
  approved: {
    thread: [
      { from: 'agent', text: 'Pay 0.1 NEAR to coffee.testnet. Memo: beans, October' },
      { from: 'guard', text: 'Within every limit and the receiver is on your allowlist.', verdict: { label: 'Approved', icon: CircleCheck, tone: 'ok' } },
      { from: 'guard', text: 'Sent 0.1 NEAR. 0.4 of 2 NEAR spent today.' },
    ],
    left: 'Inside every limit, the contract pays in the same transaction',
    right: 'No approval step for routine payments',
  },
  pending: {
    thread: [
      { from: 'agent', text: 'Send 0.8 NEAR to totally-legit-vendor.testnet' },
      { from: 'guard', text: 'The receiver is not on the allowlist.', verdict: { label: 'Pending', icon: CirclePause, tone: 'warn' } },
      { from: 'guard', text: 'Nothing has moved. The owner will approve or reject request #0.' },
    ],
    left: 'Held when over the daily limit, over your threshold, or for a new receiver',
    right: 'The owner sees an explanation and a risk badge',
  },
  blocked: {
    thread: [
      { from: 'agent', text: 'Send 5 NEAR to drain.testnet' },
      { from: 'guard', text: 'Over the per-transaction limit.', verdict: { label: 'Blocked', icon: Ban, tone: 'danger' } },
      { from: 'guard', text: 'Logged on-chain with the reason. Vault balance unchanged.' },
    ],
    left: 'Also blocked: frozen agent, paused vault, blocklisted receiver',
    right: 'The attempt stays on-chain for anyone to read',
  },
  sandbox: {
    thread: [
      { from: 'agent', text: 'Call withdraw(1 NEAR) on the vault directly' },
      { from: 'guard', text: 'This key may only call request_transfer.', verdict: { label: 'Rejected by NEAR', icon: KeyRound, tone: 'danger' } },
      { from: 'agent', text: 'Attach 1 NEAR to a call' },
      { from: 'guard', text: 'Function-call keys cannot attach deposits.', verdict: { label: 'Rejected by NEAR', icon: KeyRound, tone: 'danger' } },
    ],
    left: 'Refused by the protocol before the contract even runs',
    right: `At most ${AGENT_GAS_ALLOWANCE_NEAR} NEAR of gas, ever`,
  },
}

const STEP_MS = 1150
const TYPING_MS = 750
const HOLD_MS = 2600
const reduce = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const tabDuration = (o: Outcome) => 400 + DATA[o].thread.length * STEP_MS + HOLD_MS

function Note({ children, side, show }: { children: ReactNode; side: 'left' | 'right'; show: boolean }) {
  return (
    <div className={`hidden w-[190px] text-[14px] leading-5 text-muted transition-all duration-500 lg:block ${side === 'left' ? 'text-right' : 'text-left'} ${show ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}>
      <div className={`mb-1.5 flex items-center gap-1.5 text-[11px] font-medium tracking-[0.08em] uppercase ${side === 'left' ? 'justify-end' : ''}`}><Pencil className="size-3" /> Note</div>
      {children}
    </div>
  )
}

function Typing() {
  return (
    <div className="bubble-in flex justify-start">
      <div className="flex gap-1 rounded-[18px] rounded-bl-md bg-surface px-3.5 py-3">
        {[0, 1, 2].map((i) => <span key={i} className="typing-dot size-1.5 rounded-full bg-muted" style={{ animationDelay: `${i * 0.15}s` }} />)}
      </div>
    </div>
  )
}

export default function AnswersShowcase() {
  const [tab, setTab] = useState<Outcome>('approved')
  const [auto, setAuto] = useState(() => !reduce())
  const [shown, setShown] = useState(() => (reduce() ? 99 : 0))
  const [typing, setTyping] = useState(false)
  const [visible, setVisible] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const chat = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = root.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.25 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // Type the conversation out, then move to the next tab while autoplaying.
  useEffect(() => {
    if (reduce()) return setShown(99)
    if (!visible) return
    setShown(0)
    setTyping(false)
    const timers: number[] = []
    const thread = DATA[tab].thread
    thread.forEach((m, i) => {
      const at = 400 + i * STEP_MS
      if (m.from === 'guard') {
        timers.push(window.setTimeout(() => setTyping(true), at - TYPING_MS + 200))
      }
      timers.push(window.setTimeout(() => { setTyping(false); setShown(i + 1) }, at))
    })
    if (auto) {
      timers.push(window.setTimeout(() => {
        const i = TABS.findIndex((t) => t.id === tab)
        setTab(TABS[(i + 1) % TABS.length].id)
      }, tabDuration(tab)))
    }
    return () => timers.forEach(clearTimeout)
  }, [tab, auto, visible])

  useEffect(() => {
    const el = chat.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [shown, typing])

  const o = DATA[tab]
  const meta = TABS.find((t) => t.id === tab)!
  const done = shown >= o.thread.length
  const lastShown = o.thread[Math.min(shown, o.thread.length) - 1]
  const look = typing ? 0.6 : lastShown?.from === 'agent' ? 1 : 0

  return (
    <div ref={root}>
      <div data-reveal className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <div role="tablist" aria-label="Request outcomes" className="flex max-w-full flex-wrap justify-center gap-1 rounded-full border border-line bg-bg p-1 shadow-sm shadow-black/5">
          {TABS.map((t) => {
            const active = t.id === tab
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                onClick={() => { setAuto(false); setTab(t.id) }}
                className={`relative inline-flex h-10 items-center gap-2 overflow-hidden rounded-full px-4 text-[15px] font-medium transition-colors ${active ? 'bg-[var(--accent-soft)] text-accent-text' : 'text-muted hover:text-fg'}`}
              >
                <t.icon className="size-4" strokeWidth={1.75} /> {t.label}
                {active && auto && visible && (
                  <span key={`p-${tab}`} className="progress-fill absolute bottom-0 left-0 h-[2px] bg-[var(--accent)]" style={{ animationDuration: `${tabDuration(tab)}ms` }} />
                )}
              </button>
            )
          })}
        </div>
        <button
          type="button"
          onClick={() => setAuto((a) => !a)}
          className="btn btn-ghost h-10 w-10 px-0"
          aria-label={auto ? 'Pause autoplay' : 'Play autoplay'}
          title={auto ? 'Pause' : 'Play'}
        >
          {auto ? <Pause className="size-4" /> : <Play className="size-4" />}
        </button>
      </div>

      <div data-reveal style={{ ['--d' as string]: '150ms' }} className="relative mt-8 overflow-hidden rounded-[32px] bg-surface px-5 pt-14 pb-8 sm:px-8 lg:pb-14">
        <div aria-hidden="true" className="pointer-events-none absolute top-1/3 left-1/2 size-[520px] -translate-x-1/2 rounded-full opacity-25 blur-[90px] transition-colors duration-700" style={{ background: meta.glow }} />

        <div className="relative flex items-center justify-center gap-10">
          <div className="flex flex-col items-end gap-4 self-start">
            <div className="hidden lg:block">
              <BotMascot size={112} glow={meta.glow} mood={done ? meta.mood : 'idle'} look={look} />
              <div className="mt-3 flex justify-center">
                <span key={`${tab}-${done}`} className="bubble-in rounded-full px-3 py-1 text-[13px] font-medium" style={{ background: `color-mix(in srgb, ${meta.glow} 20%, transparent)`, color: `color-mix(in srgb, ${meta.glow} 55%, var(--fg))` }}>
                  {done ? meta.label : typing ? 'checking…' : 'listening'}
                </span>
              </div>
            </div>
            <Note side="left" show={done}>{o.left}</Note>
          </div>

          {/* phone */}
          <div className="w-full max-w-[320px] rounded-[44px] border border-line-strong bg-surface p-2.5 shadow-2xl shadow-black/10">
            <div className="flex h-[500px] flex-col overflow-hidden rounded-[36px] bg-bg">
              <div className="flex items-center justify-between px-7 pt-3.5 text-[13px] font-semibold">
                <span>9:41</span>
                <span className="h-5 w-20 rounded-full bg-fg" />
                <span className="mono text-[11px]">5G ▮▮▮</span>
              </div>
              <div className="flex flex-col items-center border-b border-line px-4 pt-2 pb-2.5">
                <BotMascot size={46} glow={meta.glow} mood={done ? meta.mood : 'idle'} look={look} bob={false} />
                <div className="text-[12px] font-medium">NearLimit</div>
                <div className="text-[10.5px] text-muted">{typing ? 'checking the policy…' : 'checks every request'}</div>
              </div>
              <div ref={chat} className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-3 pt-4 pb-4">
                {o.thread.slice(0, shown).map((m, i) => (
                  <div key={`${tab}-${i}`} className={`bubble-in flex ${m.from === 'agent' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[86%] px-3.5 py-2 text-[14px] leading-5 ${m.from === 'agent' ? 'rounded-[18px] rounded-br-md bg-[var(--btn-bg)] text-[var(--btn-fg)]' : 'rounded-[18px] rounded-bl-md bg-surface'}`}>
                      {m.verdict && (
                        <span className={`badge badge-${m.verdict.tone} mb-1 !h-5 !px-2 !text-[11px]`}>
                          <m.verdict.icon className="size-3" /> {m.verdict.label}
                        </span>
                      )}
                      <div>{m.text}</div>
                    </div>
                  </div>
                ))}
                {typing && <Typing />}
              </div>
            </div>
          </div>

          <div className="self-center pt-24"><Note side="right" show={done}>{o.right}</Note></div>
        </div>

        <div className="relative mt-8 w-full max-w-[320px] rounded-3xl border border-line bg-bg p-5 shadow-sm shadow-black/5 lg:absolute lg:bottom-8 lg:left-8 lg:mt-0">
          <div className="flex items-center gap-3">
            <BotMascot size={44} glow="#7a5cf0" bob={false} className="shrink-0" />
            <div>
              <div className="text-[16px] font-semibold tracking-[-0.01em]">Live on NEAR testnet.</div>
              <div className="text-[14px] text-muted">Real transactions, test funds only.</div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/playground" className="btn btn-accent">Open the Playground</Link>
            <Link to="/app" className="btn">Create a vault</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
