import { Fragment, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  Ban,
  Bot,
  CircleCheck,
  CirclePause,
  Code2,
  Coffee,
  Hexagon,
  KeyRound,
  Plug,
  Server,
  ShieldCheck,
  Snowflake,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { LogoMark } from './LogoMark'
import { AGENT_GAS_ALLOWANCE_NEAR } from '../lib/config'

/*
 * Hero after a "design research companion" reference: dotted grid, two pill
 * badges, a large centred headline, and floating product cards and icon tiles
 * around it. Every card is real NearLimit UI in miniature.
 */

type Tone = 'accent' | 'coral' | 'blue' | 'ok' | 'neutral'
const TILE_BG: Record<Tone, string> = {
  accent: 'var(--accent-soft)',
  coral: 'var(--coral-soft)',
  blue: 'var(--blue-soft)',
  ok: 'color-mix(in srgb, var(--ok) 13%, transparent)',
  neutral: 'var(--chip)',
}
const TILE_FG: Record<Tone, string> = {
  accent: 'var(--accent-text)',
  coral: 'var(--coral-text)',
  blue: 'var(--blue-text)',
  ok: 'var(--ok)',
  neutral: 'var(--fg)',
}

const d = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties

/** A small rounded square with one icon, like the app icons in the reference. */
function IconTile({ icon: Icon, tone, size = 64, className = '', delay = 0, float = 6 }: { icon: LucideIcon | 'logo'; tone: Tone; size?: number; className?: string; delay?: number; float?: number }) {
  return (
    <div className={`absolute ${className}`} aria-hidden="true">
      <div className="rise-in" style={d(delay)}>
        <div
          className="float-y flex items-center justify-center rounded-[18px] shadow-sm shadow-black/5"
          style={{ width: size, height: size, background: TILE_BG[tone], color: TILE_FG[tone], animationDuration: `${float}s`, animationDelay: `${-delay / 400}s` }}
        >
          <div className="flex items-center justify-center rounded-xl bg-bg shadow-sm" style={{ width: size * 0.56, height: size * 0.56 }}>
            {Icon === 'logo' ? <LogoMark className="h-[45%] w-auto text-fg" /> : <Icon className="size-[55%]" strokeWidth={2} />}
          </div>
        </div>
      </div>
    </div>
  )
}

function Chip({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`absolute rounded-lg bg-bg px-2.5 py-1 text-[12px] font-medium whitespace-nowrap text-fg shadow-md shadow-black/10 ${className}`}>{children}</span>
}

/** A pastel tile holding a mini NearLimit card, a "Type" label and floating chips. */
function ProductCard({ tone, kind, title, chips, className, delay, float, children }: { tone: Tone; kind: string; title: string; chips: { text: string; className: string }[]; className: string; delay: number; float: number; children: ReactNode }) {
  return (
    <div className={`absolute ${className}`} aria-hidden="true">
      <div className="rise-in" style={d(delay)}>
        <div className="float-y relative rounded-[26px] p-5 pt-12" style={{ background: TILE_BG[tone], animationDuration: `${float}s`, animationDelay: `${-delay / 300}s` }}>
          <div className="absolute top-3 left-3 flex items-center gap-2 rounded-xl bg-bg py-1.5 pr-3 pl-2 shadow-md shadow-black/10">
            <span className="flex size-7 items-center justify-center rounded-lg" style={{ background: TILE_BG[tone], color: TILE_FG[tone] }}>
              <LogoMark className="h-3.5 w-auto" />
            </span>
            <span className="leading-tight">
              <span className="block text-[10.5px] text-muted">{kind}</span>
              <span className="block text-[14px] font-semibold tracking-[-0.01em]">{title}</span>
            </span>
          </div>
          <div className="rounded-xl border border-line bg-bg p-3.5 text-left text-[12px] shadow-sm">{children}</div>
          {chips.map((c) => <Chip key={c.text} className={c.className}>{c.text}</Chip>)}
        </div>
      </div>
    </div>
  )
}

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

export default function HeroSection() {
  const headline = ['Your AI agent can spend.', 'It just can’t overspend.']
  let word = 0
  return (
    <>
      <section className="relative overflow-hidden">
        {/* dotted grid */}
        <div
          aria-hidden="true"
          className="absolute inset-0 [background-image:radial-gradient(var(--border-strong)_1.1px,transparent_1.1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,#000_70%,transparent)]"
        />

        {/* ---------------- floating cards (wide screens) ---------------- */}
        <div className="pointer-events-none absolute inset-0 hidden xl:block">
          <ProductCard
            tone="coral"
            kind="Request"
            title="Blocked"
            className="top-[56px] -left-[24px] w-[300px]"
            delay={250}
            float={7}
            chips={[
              { text: 'Prompt injection', className: '-right-6 top-14' },
              { text: 'Logged on-chain', className: '-bottom-3 left-8' },
            ]}
          >
            <div className="font-medium">ShopBot → drain.testnet</div>
            <div className="mono mt-0.5 !text-[12px] text-muted">5 NEAR · memo: “ignore previous…”</div>
            <span className="badge badge-danger mt-2.5 !h-6"><Ban className="size-3.5" /> over per-tx limit</span>
          </ProductCard>

          <ProductCard
            tone="blue"
            kind="Access key"
            title="Agent key"
            className="top-[520px] -left-[36px] w-[290px]"
            delay={450}
            float={8}
            chips={[{ text: `${AGENT_GAS_ALLOWANCE_NEAR} NEAR gas cap`, className: '-bottom-3.5 right-6' }]}
          >
            <div className="flex items-center gap-2 font-medium"><KeyRound className="size-3.5 text-blue-text" /> ed25519:7Fq…kP2</div>
            <div className="mt-2 flex flex-col gap-1 text-muted">
              <span className="flex items-center gap-1.5"><CircleCheck className="size-3.5 text-ok" /> request_transfer only</span>
              <span className="flex items-center gap-1.5"><Ban className="size-3.5 text-danger" /> no deposits, no other calls</span>
            </div>
          </ProductCard>

          <ProductCard
            tone="ok"
            kind="Payment"
            title="Approved"
            className="top-[40px] -right-[20px] w-[300px]"
            delay={350}
            float={7.5}
            chips={[
              { text: 'Within every limit', className: '-left-10 top-[88px]' },
              { text: 'Sent instantly', className: '-bottom-3 right-10' },
            ]}
          >
            <div className="flex justify-end">
              <span className="rounded-2xl rounded-br-md bg-[var(--btn-bg)] px-3 py-1.5 text-[12px] text-[var(--btn-fg)]">Pay 0.1 NEAR to coffee.testnet</span>
            </div>
            <div className="mt-2 flex">
              <span className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-surface px-3 py-1.5 text-[12px]"><CircleCheck className="size-3.5 text-ok" /> Sent · 0.1 of 2 NEAR today</span>
            </div>
          </ProductCard>

          <ProductCard
            tone="accent"
            kind="Inbox"
            title="Needs approval"
            className="top-[540px] -right-[30px] w-[300px]"
            delay={550}
            float={8.5}
            chips={[{ text: 'AI explains, you decide', className: '-bottom-3.5 left-6' }]}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">0.8 NEAR → new account</span>
              <span className="badge badge-danger !h-5 !px-2 !text-[10.5px]">Risk: High</span>
            </div>
            <div className="mt-1 text-muted">First payment · memo has instructions</div>
            <div className="mt-2.5 flex gap-1.5">
              <span className="btn btn-primary !h-7 !px-3 !text-[11.5px]">Reject</span>
              <span className="btn btn-ghost !h-7 !px-3 !text-[11.5px]">Approve</span>
            </div>
          </ProductCard>
        </div>

        {/* ---------------- icon tiles ---------------- */}
        <div className="pointer-events-none absolute inset-0 hidden lg:block">
          <IconTile icon="logo" tone="accent" size={78} className="top-[28px] left-[2.5%] xl:top-[190px] xl:left-[21%]" delay={150} float={6.5} />
          <IconTile icon={Bot} tone="blue" size={70} className="top-[330px] left-[4%] xl:top-[330px] xl:left-[15%]" delay={300} float={7} />
          <IconTile icon={ShieldCheck} tone="ok" size={60} className="top-[430px] left-[10%] xl:top-[420px] xl:left-[8.5%]" delay={380} float={6} />
          <IconTile icon={Snowflake} tone="neutral" size={66} className="top-[560px] left-[4%] xl:top-[600px] xl:left-[19%]" delay={480} float={7.5} />
          <IconTile icon={Ban} tone="coral" size={52} className="top-[230px] left-[9%] xl:top-[300px] xl:left-[3%]" delay={420} float={5.5} />
          <IconTile icon={Coffee} tone="ok" size={64} className="top-[260px] right-[9%] xl:top-[330px] xl:right-[16%]" delay={330} float={6.5} />
          <IconTile icon={Sparkles} tone="accent" size={66} className="top-[60px] right-[3%] xl:top-[250px] xl:right-[5%]" delay={420} float={7} />
          <IconTile icon={CirclePause} tone="accent" size={58} className="top-[420px] right-[4%] xl:top-[420px] xl:right-[11%]" delay={460} float={6} />
          <IconTile icon={Server} tone="blue" size={62} className="top-[560px] right-[10%] xl:top-[450px] xl:right-[2%]" delay={520} float={8} />
          <IconTile icon={KeyRound} tone="coral" size={48} className="hidden xl:block xl:top-[640px] xl:right-[20%]" delay={600} float={5.5} />
        </div>

        {/* ---------------- centre column ---------------- */}
        <div className="container-page relative flex flex-col items-center pt-16 pb-20 text-center md:pt-28 xl:pt-[150px] xl:pb-[150px]">
          <div className="rise-in flex flex-wrap justify-center gap-2.5">
            <span className="inline-flex h-9 items-center gap-2 rounded-full px-4 text-[14px] font-medium" style={{ background: TILE_BG.ok, color: 'var(--ok)' }}>
              <span className="size-1.5 animate-pulse rounded-full bg-[var(--ok)]" /> Live on NEAR testnet
            </span>
            <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--accent-soft)] px-4 text-[14px] text-muted">
              <span className="font-medium text-accent-text">MCP server</span> now available for any agent
            </span>
          </div>

          <h1 className="mt-8 text-[44px] leading-[1.02] font-medium tracking-[-0.045em] sm:text-[60px] md:text-[76px] md:leading-[0.98] xl:text-[84px]" aria-label={headline.join(' ')}>
            {headline.map((line, li) => (
              <span key={li} className="block whitespace-normal md:whitespace-nowrap">
                {line.split(' ').map((w) => {
                  const n = word++
                  return (
                    <Fragment key={n}>
                      <span aria-hidden="true" className="rise-in" style={d(150 + n * 60)}>{w}</span>{' '}
                    </Fragment>
                  )
                })}
              </span>
            ))}
          </h1>

          <p className="rise-in !block mt-7 max-w-[600px] text-[18px] leading-[29px] text-muted md:text-[19px]" style={d(700)}>
            A spending firewall for AI agents on NEAR. Your agent gets a key that can only ask, and every payment is checked on-chain against your limits.
          </p>

          <div className="rise-in !flex mt-9 flex-wrap justify-center gap-3" style={d(820)}>
            <Link to="/playground" className="btn btn-accent h-[52px] rounded-full px-7 text-[16px]">
              Try to trick an agent <ArrowUpRight className="size-4" />
            </Link>
            <Link to="/app" className="btn h-[52px] rounded-full bg-chip px-7 text-[16px] text-fg hover:bg-line-strong">
              Open the app
            </Link>
          </div>
          <span className="rise-in mt-3.5 text-[13px] text-muted" style={d(900)}>Interactive tutorial · no wallet needed</span>
        </div>
      </section>

      {/* ---------------- logos + honest stat ---------------- */}
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
