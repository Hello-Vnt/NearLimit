import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { LogOut, Moon, ShieldCheck, Sun } from 'lucide-react'
import { CONTRACT_ID, explorerAccount } from '../lib/config'
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
    <Link to="/" className="flex items-center gap-2 text-[16px] font-medium tracking-[-0.01em]">
      <ShieldCheck className="size-5" strokeWidth={1.75} />
      NearLimit
    </Link>
  )
}

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
  const link = ({ isActive }: { isActive: boolean }) =>
    `text-[15px] font-medium transition-colors hover:text-fg ${isActive ? 'text-fg' : 'text-muted'}`
  return (
    <header
      className={`sticky top-0 z-40 border-b transition-colors ${scrolled ? 'border-line backdrop-blur-md' : 'border-transparent'}`}
      style={{ background: scrolled ? 'var(--nav-bg)' : 'var(--bg)' }}
    >
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav className="hidden items-center gap-7 md:flex" aria-label="Main">
          <NavLink to="/app" className={link}>App</NavLink>
          <NavLink to="/playground" className={link}>Playground</NavLink>
          <a href="/#how-it-works" className="text-[15px] font-medium text-muted transition-colors hover:text-fg">Docs</a>
        </nav>
        <div className="flex items-center gap-2">
          <button className="btn size-9 px-0 text-muted hover:text-fg" onClick={toggle} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
            {theme === 'dark' ? <Sun className="size-[18px]" strokeWidth={1.75} /> : <Moon className="size-[18px]" strokeWidth={1.75} />}
          </button>
          {accountId ? (
            <>
              <Link to="/app" className="mono hidden max-w-[180px] truncate text-muted hover:text-fg sm:block" title={accountId}>{accountId}</Link>
              <button className="btn btn-ghost" onClick={() => disconnect()}>
                <LogOut className="size-3.5" strokeWidth={1.75} /> Sign out
              </button>
            </>
          ) : (
            <>
              <button className="hidden text-[15px] font-medium text-muted hover:text-fg sm:block" onClick={connect} disabled={!ready}>Log in</button>
              <button className="btn btn-primary" onClick={connect} disabled={!ready}>Connect wallet</button>
            </>
          )}
        </div>
      </div>
      <nav className="container-page flex gap-6 pb-3 md:hidden" aria-label="Main mobile">
        <NavLink to="/app" className={link}>App</NavLink>
        <NavLink to="/playground" className={link}>Playground</NavLink>
        <a href="/#how-it-works" className="text-[15px] font-medium text-muted">Docs</a>
      </nav>
    </header>
  )
}

function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="container-page flex flex-col items-start justify-between gap-3 py-8 text-[14px] text-muted sm:flex-row sm:items-center">
        <span>Built on NEAR · testnet · NEAR Hackathon 2026</span>
        {CONTRACT_ID ? (
          <a className="underline decoration-line-strong underline-offset-4 hover:text-fg" href={explorerAccount(CONTRACT_ID)} target="_blank" rel="noreferrer">
            View contract <span className="mono">{CONTRACT_ID}</span>
          </a>
        ) : (
          <span>Contract not deployed yet</span>
        )}
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
