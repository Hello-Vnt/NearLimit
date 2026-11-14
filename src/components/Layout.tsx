import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { ArrowUpRight, LogOut, Moon, Sun, Wallet } from 'lucide-react'
import { LogoMark } from './LogoMark'
import { CONTRACT_ID, DEMO_OWNER, REPO_URL, explorerAccount } from '../lib/config'
import { formatNear, timeAgo } from '../lib/near'
import { useVault } from '../lib/useVault'
import { useWallet } from '../lib/wallet'

function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light',
  )
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])
  // Follow the system until the user picks a theme by hand.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      let saved: string | null = null
      try {
        saved = localStorage.getItem('ag:theme')
      } catch {
        /* ignore */
      }
      if (!saved) setTheme(mq.matches ? 'dark' : 'light')
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    try {
      localStorage.setItem('ag:theme', next)
    } catch {
      /* ignore */
    }
    setTheme(next)
  }
  return { theme, toggle }
}

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 text-[17px] font-semibold tracking-[-0.02em]" aria-label="NearLimit home">
      <LogoMark className="h-[21px] w-auto" />
      NearLimit
    </Link>
  )
}

// ---------------------------------------------------------------- live ticker

const VERB: Record<string, string> = {
  transfer_approved: 'sent',
  transfer_pending: 'held for approval',
  transfer_blocked: 'blocked',
  transfer_failed: 'refunded',
  request_approved: 'owner approved',
  request_rejected: 'owner rejected',
}
const DOT: Record<string, string> = {
  transfer_approved: 'var(--ok)',
  request_approved: 'var(--ok)',
  transfer_pending: 'var(--warn)',
  transfer_blocked: 'var(--danger)',
  transfer_failed: 'var(--danger)',
  request_rejected: 'var(--danger)',
}
const TAGLINES = [
  'Every agent payment is checked on-chain',
  'Agent keys can only call request_transfer',
  'Blocked requests are logged with the reason',
  'Unusual payments wait for the owner',
  'Freeze, revoke or pause in one transaction',
]

/** plnty-style strip of live activity, here: real NearLimit decisions from testnet. */
function Ticker() {
  const { activity } = useVault(DEMO_OWNER || null)
  const live = activity.filter((a) => VERB[a.kind]).slice(0, 12)
  const items = live.length
    ? live.map((a) => ({
        key: `a${a.id}`,
        dot: DOT[a.kind],
        text: `${a.agent_name || 'agent'} ${VERB[a.kind]} · ${formatNear(a.amount)} NEAR → ${a.receiver_id} · ${timeAgo(a.timestamp_ms)}`,
      }))
    : TAGLINES.map((t, i) => ({ key: `t${i}`, dot: 'var(--accent)', text: t }))
  const row = (copy: number) =>
    items.map((it) => (
      <span key={`${copy}-${it.key}`} className="flex shrink-0 items-center gap-2 pr-8">
        <span className="size-1.5 rounded-full" style={{ background: it.dot }} />
        {it.text}
      </span>
    ))
  return (
    <div className="relative flex h-7 items-center overflow-hidden bg-[var(--ink)] text-[12px] text-[var(--ink-fg)]">
      {live.length > 0 && (
        <span className="relative z-10 flex h-full shrink-0 items-center gap-1.5 bg-[var(--ink)] pr-3 pl-[max(16px,env(safe-area-inset-left))] font-medium text-[var(--footer-fg)] sm:pl-5">
          <span className="size-1.5 animate-pulse rounded-full bg-[var(--accent)]" /> Live on testnet
        </span>
      )}
      <div className="flex min-w-0 flex-1 overflow-hidden" aria-label="Recent NearLimit activity">
        <div className="marquee flex w-max" style={{ ['--marquee-dur' as string]: `${Math.max(30, items.length * 7)}s` }}>
          {row(0)}
          <span aria-hidden="true" className="flex">{row(1)}</span>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- nav

function Nav() {
  const { theme, toggle } = useTheme()
  const { accountId, connect, disconnect, ready } = useWallet()
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  const pill = ({ isActive }: { isActive: boolean }) => `nav-pill ${isActive ? '!bg-[var(--btn-bg)] !text-[var(--btn-fg)]' : ''}`
  const links = (
    <>
      <NavLink to="/app" className={pill}>App</NavLink>
      <NavLink to="/playground" className={pill}>Playground</NavLink>
      <a href="/#how-it-works" className="nav-pill">How it works</a>
      <a href={REPO_URL} target="_blank" rel="noreferrer" className="nav-pill gap-1">GitHub <ArrowUpRight className="size-3" /></a>
    </>
  )
  return (
    <header className="sticky top-0 z-40">
      <Ticker />
      <div
        className={`border-b transition-colors ${scrolled ? 'border-line backdrop-blur-md' : 'border-transparent'}`}
        style={{ background: scrolled ? 'var(--nav-bg)' : 'var(--bg)' }}
      >
        <div className="container-page flex h-14 items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <Logo />
            <nav className="hidden items-center gap-1.5 md:flex" aria-label="Main">{links}</nav>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn size-8 px-0 text-muted hover:text-fg" onClick={toggle} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
              {theme === 'dark' ? <Sun className="size-[17px]" strokeWidth={1.75} /> : <Moon className="size-[17px]" strokeWidth={1.75} />}
            </button>
            {accountId ? (
              <>
                <Link to="/app" className="mono hidden max-w-[180px] truncate text-muted hover:text-fg sm:block" title={accountId}>{accountId}</Link>
                <button className="btn btn-ghost h-8 px-3 text-[12px]" onClick={() => disconnect()}>
                  <LogOut className="size-3.5" strokeWidth={1.75} /> Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/playground" className="btn btn-accent hidden h-8 px-3.5 text-[12px] sm:inline-flex">Try the demo</Link>
                <button className="btn btn-primary h-8 px-3.5 text-[12px]" onClick={connect} disabled={!ready}>
                  <Wallet className="size-3.5" strokeWidth={1.75} /> Connect wallet
                </button>
              </>
            )}
          </div>
        </div>
        <nav className="container-page flex gap-1.5 overflow-x-auto pb-2.5 md:hidden" aria-label="Main mobile">{links}</nav>
      </div>
    </header>
  )
}

// ---------------------------------------------------------------- footer

function Footer() {
  const col = (title: string, items: { label: string; to?: string; href?: string }[]) => (
    <div>
      <h3 className="text-[22px] font-medium tracking-[-0.02em]">{title}</h3>
      <ul className="mt-4 flex flex-col gap-2.5 text-[14px] text-[var(--footer-muted)]">
        {items.map((i) => (
          <li key={i.label}>
            {i.to ? (
              <Link to={i.to} className="hover:text-[var(--footer-fg)]">{i.label}</Link>
            ) : (
              <a href={i.href} target="_blank" rel="noreferrer" className="hover:text-[var(--footer-fg)]">{i.label}</a>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
  return (
    <footer className="mt-24 bg-[var(--footer-bg)] text-[var(--footer-fg)] shadow-[0_-30px_80px_-30px_rgba(0,0,0,0.35)]">
      <div className="container-page pt-20 pb-10">
        <div className="flex flex-col justify-between gap-10 md:flex-row">
          <div>
            <h2 className="max-w-[620px] text-[40px] leading-[1.04] font-medium tracking-[-0.04em] text-balance md:text-[60px]">
              Your agent can spend. It just can’t overspend.
            </h2>
            <div className="mt-7 flex flex-wrap gap-2">
              <Link to="/playground" className="btn btn-accent h-9 px-4">Try the demo <ArrowUpRight className="size-3.5" /></Link>
              <Link to="/app" className="btn h-9 border border-white/20 px-4 text-[var(--footer-fg)] hover:bg-white/10">Open the app</Link>
            </div>
          </div>
          <div className="flex flex-col gap-2 text-[13px] leading-5 text-[var(--footer-muted)] md:text-right">
            <span>NEAR Hackathon 2026</span>
            <span>AI Security &amp; Defense · Agent Economy</span>
            {CONTRACT_ID && (
              <a className="mono !text-[12px] hover:text-[var(--footer-fg)]" href={explorerAccount(CONTRACT_ID)} target="_blank" rel="noreferrer">{CONTRACT_ID}</a>
            )}
            <span className="text-[var(--footer-fg)]">Built on NEAR · testnet</span>
          </div>
        </div>

        <div className="mt-20 grid grid-cols-2 gap-10 sm:grid-cols-3">
          {col('Product', [
            { label: 'Dashboard', to: '/app' },
            { label: 'Playground', to: '/playground' },
            { label: 'Add an agent', to: '/app/agents/new' },
            ...(DEMO_OWNER ? [{ label: 'Live activity', to: `/v/${DEMO_OWNER}` }] : []),
          ])}
          {col('Build', [
            { label: 'Source code', href: REPO_URL },
            { label: 'MCP server', href: `${REPO_URL}#use-it-from-a-real-ai-agent-mcp` },
            { label: 'Smart contract', href: `${REPO_URL}/tree/main/contract` },
            ...(CONTRACT_ID ? [{ label: 'Contract on NearBlocks', href: explorerAccount(CONTRACT_ID) }] : []),
          ])}
          {col('Project', [
            { label: 'How it works', href: '/#how-it-works' },
            { label: 'README', href: `${REPO_URL}#readme` },
            { label: 'MIT licence', href: `${REPO_URL}/blob/main/LICENSE` },
          ])}
        </div>

        <div className="mt-16 flex flex-col justify-between gap-3 border-t border-white/10 pt-6 text-[12px] text-[var(--footer-muted)] sm:flex-row">
          <span className="flex items-center gap-2"><LogoMark className="h-3.5 w-auto text-[var(--footer-fg)]" /> NearLimit · testnet only, not audited</span>
          <span>Photos: Unsplash · Type: Inter</span>
        </div>
      </div>
    </footer>
  )
}

export default function Layout() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0)
    else document.getElementById(hash.slice(1))?.scrollIntoView()
  }, [pathname, hash])
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
