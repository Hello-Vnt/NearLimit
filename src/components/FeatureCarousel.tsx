import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { CursorBadge } from './CursorBadge'

// Photos: Unsplash (unsplash.com/license), credited in the README.
const unsplash = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&h=900&q=70`

interface Slide {
  title: string
  sub: string
  kicker: string
  word: string
  ring: string
  photo: string
  alt: string
  credit: string
  cta: { label: string; to: string }
  cursor: { label: string; tone: 'accent' | 'blue' | 'coral' }
}

const SLIDES: Slide[] = [
  {
    title: 'Give every agent its own key',
    sub: 'It can only ask the vault, never move NEAR itself',
    kicker: 'Introducing',
    word: 'Agent keys',
    ring: 'var(--accent)',
    photo: '1609770231080-e321deccc34c',
    alt: 'A metal key in a keyhole casting a long shadow',
    credit: 'Amol Tyagi',
    cta: { label: 'Add an agent', to: '/app/agents/new' },
    cursor: { label: '@ShopBot', tone: 'blue' },
  },
  {
    title: 'Every payment checked on-chain',
    sub: 'Approved, held or blocked in the same transaction',
    kicker: 'Enforced by',
    word: 'The contract',
    ring: 'var(--blue)',
    photo: '1639322537228-f710d846310a',
    alt: 'Glowing cubes arranged on a black surface',
    credit: 'Shubham Dhage',
    cta: { label: 'See the rules', to: '/#how-it-works' },
    cursor: { label: '@nearlimit', tone: 'accent' },
  },
  {
    title: 'Unusual payments wait for you',
    sub: 'Read the plain-English explanation, then approve or reject',
    kicker: 'You decide',
    word: 'Approvals',
    ring: 'var(--accent)',
    photo: '1526045612212-70caf35c14df',
    alt: 'A person holding a smartphone',
    credit: 'freestocks',
    cta: { label: 'Try it', to: '/playground' },
    cursor: { label: '@you', tone: 'accent' },
  },
  {
    title: 'Plug in any AI agent',
    sub: 'Claude Code, Codex and Cursor pay through the MCP server',
    kicker: 'Works with',
    word: 'Any agent',
    ring: 'var(--blue)',
    photo: '1485827404703-89b55fcc595e',
    alt: 'A white humanoid robot in front of a wall',
    credit: 'Alex Knight',
    cta: { label: 'MCP setup', to: '/#how-it-works' },
    cursor: { label: '@claude-code', tone: 'blue' },
  },
  {
    title: 'Stop everything in one click',
    sub: 'Freeze an agent, revoke its key or pause the whole vault',
    kicker: 'Always there',
    word: 'Kill switch',
    ring: 'var(--coral)',
    photo: '1532883130016-f3d311140ba8',
    alt: 'A red emergency pull lever on a wall',
    credit: 'Jason Leung',
    cta: { label: 'Open the app', to: '/app' },
    cursor: { label: '@owner', tone: 'coral' },
  },
]

const DURATION = 6500
const reduce = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** plnty-style feature carousel: title, big photo slide, arrows, progress bars. */
export default function FeatureCarousel() {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const [visible, setVisible] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const auto = !reduce() && !paused && visible

  useEffect(() => {
    const el = root.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.3 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!auto) return
    const t = setTimeout(() => setI((n) => (n + 1) % SLIDES.length), DURATION)
    return () => clearTimeout(t)
  }, [i, auto])

  const go = (d: number) => setI((n) => (n + d + SLIDES.length) % SLIDES.length)
  const s = SLIDES[i]

  return (
    <div
      ref={root}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="NearLimit features"
    >
      <div className="flex flex-col items-start justify-between gap-5 md:flex-row md:items-end">
        <div key={`t${i}`} className="bubble-in min-w-0">
          <h2 className="text-[28px] leading-[1.12] font-medium tracking-[-0.035em] md:text-[40px]">{s.title}</h2>
          <p className="text-[28px] leading-[1.12] font-medium tracking-[-0.035em] text-muted md:text-[40px]">{s.sub}</p>
        </div>
        <Link to={s.cta.to} className="btn h-12 shrink-0 rounded-[14px] border-2 border-fg px-6 text-[17px] hover:bg-surface">
          {s.cta.label}
        </Link>
      </div>

      <div className="relative mt-8">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[22px] bg-[var(--ink)] sm:aspect-[16/9]">
          {SLIDES.map((sl, n) => (
            <img
              key={sl.photo}
              src={unsplash(sl.photo)}
              alt={n === i ? sl.alt : ''}
              title={`Photo: ${sl.credit} on Unsplash`}
              loading={n === 0 ? 'eager' : 'lazy'}
              decoding="async"
              className={`absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-[1200ms] ease-out ${n === i ? 'scale-100 opacity-100' : 'scale-[1.04] opacity-0'}`}
            />
          ))}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.42),rgba(0,0,0,0.12)_70%)]" />
          <div key={`w${i}`} className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-white sm:gap-5" aria-live="polite">
            <span className="rise-in text-[36px] leading-none font-medium tracking-[-0.04em] drop-shadow-lg sm:text-[64px] md:text-[84px]">{s.kicker}</span>
            <span
              className="rise-in rounded-[28px] border-[5px] bg-black/35 px-6 py-2 text-[36px] leading-tight font-medium tracking-[-0.04em] backdrop-blur-sm sm:rounded-[40px] sm:px-10 sm:text-[64px] md:text-[84px]"
              style={{ borderColor: s.ring, ['--d' as string]: '180ms' }}
            >
              {s.word}
            </span>
          </div>
          <div key={`c${i}`} className="cursor-drift pointer-events-none absolute top-[60%] left-[64%] hidden sm:block" aria-hidden="true">
            <CursorBadge label={s.cursor.label} size={46} />
          </div>
        </div>

        <button type="button" onClick={() => go(-1)} aria-label="Previous feature" className="absolute top-1/2 -left-3 flex size-10 -translate-y-1/2 items-center justify-center rounded-xl bg-surface text-fg shadow-sm hover:bg-chip md:-left-14">
          <ChevronLeft className="size-5" strokeWidth={2.25} />
        </button>
        <button type="button" onClick={() => go(1)} aria-label="Next feature" className="absolute top-1/2 -right-3 flex size-10 -translate-y-1/2 items-center justify-center rounded-xl bg-surface text-fg shadow-sm hover:bg-chip md:-right-14">
          <ChevronRight className="size-5" strokeWidth={2.25} />
        </button>
      </div>

      <div className="mt-5 grid grid-cols-5 gap-2.5" role="tablist" aria-label="Choose a feature">
        {SLIDES.map((sl, n) => (
          <button key={sl.word} type="button" role="tab" aria-selected={n === i} aria-label={sl.word} onClick={() => setI(n)} className="group py-2">
            <span className="block h-[3px] overflow-hidden rounded-full bg-[var(--border-strong)]">
              <span
                key={n === i ? `on-${i}-${auto}` : 'off'}
                className={`block h-full rounded-full ${n < i ? 'w-full bg-fg' : n === i ? (auto ? 'progress-fill bg-[var(--accent)]' : 'w-full bg-[var(--accent)]') : 'w-0'}`}
                style={{ animationDuration: `${DURATION}ms` }}
              />
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
