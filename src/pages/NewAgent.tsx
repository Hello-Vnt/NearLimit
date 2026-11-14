import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, CircleCheck, CircleX, Copy, Download, KeyRound } from 'lucide-react'
import { SetupBanner } from '../components/ui'
import { generateKey, pendingKey, playgroundKey, type StoredAgentKey } from '../lib/agent'
import { AGENT_GAS_ALLOWANCE_NEAR, CONTRACT_ID, DEMO } from '../lib/config'
import { formatNear, parseNear, view, viewAccessKey, type AccessKeyInfo } from '../lib/near'
import type { Agent, Policy } from '../lib/types'
import { useAction } from '../lib/useAction'
import { tx, useWallet } from '../lib/wallet'

const ACCOUNT_RE = /^(?=.{2,64}$)([a-z\d]+[-_])*[a-z\d]+(\.([a-z\d]+[-_])*[a-z\d]+)*$/
const splitList = (s: string) => [...new Set(s.split(/[\s,]+/).map((x) => x.trim().toLowerCase()).filter(Boolean))]

interface Form {
  name: string
  perTx: string
  daily: string
  threshold: string
  allowlistOnly: boolean
  allowlist: string
  blocklist: string
  expires: string
}
const EMPTY: Form = { name: '', perTx: '1', daily: '2', threshold: '0.5', allowlistOnly: true, allowlist: '', blocklist: '', expires: '' }
const SHOPBOT: Form = { ...EMPTY, name: 'ShopBot', allowlist: `${DEMO.coffee}\n${DEMO.hosting}` }

function validate(f: Form): { policy?: Policy; errors: Record<string, string> } {
  const errors: Record<string, string> = {}
  const amt = (k: 'perTx' | 'daily' | 'threshold') => {
    try {
      const y = parseNear(f[k])
      if (k !== 'threshold' && BigInt(y) === 0n) errors[k] = 'Must be more than 0.'
      return y
    } catch {
      errors[k] = 'Enter a NEAR amount, for example 0.5.'
      return '0'
    }
  }
  if (!f.name.trim()) errors.name = 'Give the agent a name.'
  if (f.name.trim().length > 40) errors.name = 'Keep the name under 40 characters.'
  const per = amt('perTx'), daily = amt('daily'), threshold = amt('threshold')
  if (!errors.daily && !errors.perTx && BigInt(daily) < BigInt(per)) errors.daily = 'The daily limit must be at least the per-transaction limit.'
  const allowlist = splitList(f.allowlist), blocklist = splitList(f.blocklist)
  const badA = allowlist.find((a) => !ACCOUNT_RE.test(a)), badB = blocklist.find((a) => !ACCOUNT_RE.test(a))
  if (badA) errors.allowlist = `"${badA}" is not a valid NEAR account id.`
  if (badB) errors.blocklist = `"${badB}" is not a valid NEAR account id.`
  if (f.allowlistOnly && !allowlist.length) errors.allowlist = 'Add at least one account, or switch the allowlist off.'
  let expires_at_ms: number | null = null
  if (f.expires) {
    expires_at_ms = new Date(f.expires).getTime()
    if (!Number.isFinite(expires_at_ms) || expires_at_ms <= Date.now()) errors.expires = 'Pick a time in the future.'
  }
  if (Object.keys(errors).length) return { errors }
  return { errors, policy: { per_tx_limit: per, daily_limit: daily, approval_threshold: threshold, allowlist_only: f.allowlistOnly, allowlist, blocklist, expires_at_ms } }
}

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="field-label" htmlFor={id}>{label}</label>
      {children}
      {error ? <div className="mt-1 text-[13px] text-danger">{error}</div> : hint ? <div className="mt-1 text-[13px] text-muted">{hint}</div> : null}
    </div>
  )
}

function Check2({ ok, children }: { ok: boolean | null; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-[14px]">
      {ok === null ? <span className="mt-1 size-4 shrink-0 animate-pulse rounded-full bg-[var(--border-strong)]" /> : ok ? <CircleCheck className="mt-0.5 size-4 shrink-0 text-ok" /> : <CircleX className="mt-0.5 size-4 shrink-0 text-danger" />}
      <span>{children}</span>
    </li>
  )
}

function Reveal({ stash, policy }: { stash: StoredAgentKey; policy: Policy | null }) {
  const nav = useNavigate()
  const [registered, setRegistered] = useState<boolean | null>(null)
  const [key, setKey] = useState<AccessKeyInfo | null>(null)
  const [copied, setCopied] = useState(false)
  const [tick, setTick] = useState(0)
  const { busy, run } = useAction(() => setTick((t) => t + 1))

  useEffect(() => {
    let alive = true
    const check = async () => {
      const [agents, k] = await Promise.all([
        view<Agent[]>('get_agents', { owner: stash.ownerId }).catch(() => [] as Agent[]),
        viewAccessKey(stash.ownerId, stash.publicKey),
      ])
      if (!alive) return
      setRegistered(agents.some((a) => a.public_key === stash.publicKey))
      setKey(k)
    }
    check()
    const id = setInterval(check, 3000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [stash, tick])

  const keyOk = key ? key.exists && !key.fullAccess && key.receiverId === CONTRACT_ID && key.methodNames?.join() === 'request_transfer' : null
  const ready = registered === true && keyOk === true
  const keyFileName = `${stash.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.agentkey.json`
  const file = JSON.stringify({ network: 'testnet', contract: CONTRACT_ID, owner: stash.ownerId, agent: stash.name, public_key: stash.publicKey, private_key: stash.secretKey }, null, 2)

  const done = (toPlayground: boolean) => {
    if (toPlayground) playgroundKey.set(stash)
    pendingKey.set(null)
    nav(toPlayground ? '/playground' : '/app')
  }

  return (
    <div className="mx-auto max-w-[640px]">
      <KeyRound className="size-6" strokeWidth={1.5} />
      <h1 className="h2 mt-4">{ready ? `${stash.name}’s key is ready` : `Setting up ${stash.name}`}</h1>
      <ul className="mt-5 flex flex-col gap-2">
        <Check2 ok={registered}>Agent and policy registered in NearLimit{registered === false && policy && (
          <button className="ml-2 underline" disabled={!!busy} onClick={() => run('Register agent', [tx.addAgent(stash.publicKey, stash.name, policy)])}>Send again</button>
        )}</Check2>
        <Check2 ok={keyOk}>
          Access key added to <span className="mono">{stash.ownerId}</span>
          {key?.exists && !key.fullAccess && (
            <span className="block text-[13px] text-muted">
              Can only call <span className="mono">{key.methodNames?.join(', ')}</span> on <span className="mono">{key.receiverId}</span>, gas allowance {key.allowance ? formatNear(key.allowance) : 'unlimited'} NEAR, no deposits.
            </span>
          )}
          {keyOk === false && <button className="ml-2 underline" disabled={!!busy} onClick={() => run('Add key', [tx.addAgentKey(stash.ownerId, stash.publicKey)])}>Send again</button>}
        </Check2>
      </ul>

      <div className="card mt-6 p-5">
        <div className="text-[13px] font-medium">Private key for the agent</div>
        <div className="mt-1 text-[13px] text-muted">This is the only time it is shown. NearLimit does not keep a copy. Give it to your agent, not your wallet key.</div>
        <div className="mono mt-3 rounded-xl border border-line-strong bg-bg p-3 break-all select-all">{stash.secretKey}</div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            className="btn btn-ghost"
            onClick={() => navigator.clipboard.writeText(stash.secretKey).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }).catch(() => {})}
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {copied ? 'Copied' : 'Copy'}
          </button>
          <a className="btn btn-ghost" download={keyFileName} href={`data:application/json;charset=utf-8,${encodeURIComponent(file)}`}>
            <Download className="size-3.5" /> Download
          </a>
        </div>
      </div>

      <div className="card mt-4 p-5">
        <div className="text-[13px] font-medium">Give this key to a real AI agent</div>
        <div className="mt-1 text-[13px] text-muted">
          Download the key file, then add NearLimit as an MCP server. Claude Code, Codex, Cursor and other MCP clients get three tools: <span className="mono">pay</span>, <span className="mono">check_payment</span> and <span className="mono">spending_status</span>.
        </div>
        <pre className="mono mt-3 overflow-x-auto rounded-xl border border-line-strong bg-bg p-3 !text-[12px] leading-5">{`claude mcp add nearlimit \\
  -e AGENT_KEY_FILE=/path/to/${keyFileName} \\
  -- node /path/to/repo/mcp/server.mjs`}</pre>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <button className="btn btn-primary" disabled={!ready} onClick={() => done(true)}>Use this key in the Playground</button>
        <button className="btn btn-ghost" onClick={() => done(false)}>{ready ? 'I saved it, go to dashboard' : 'Cancel and discard key'}</button>
      </div>
      {!ready && <p className="mt-3 text-[13px] text-muted">Waiting for both transactions to land on testnet. This page checks every 3 seconds.</p>}
    </div>
  )
}

export default function NewAgent() {
  const { accountId, connect } = useWallet()
  const [form, setForm] = useState<Form>(EMPTY)
  const [touched, setTouched] = useState(false)
  const [stash, setStash] = useState<StoredAgentKey | null>(() => pendingKey.get())
  const [policy, setPolicy] = useState<Policy | null>(null)
  const { busy, run } = useAction()
  const { errors, policy: valid } = validate(form)
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }))

  if (!accountId) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="h2">Connect a wallet to add an agent</h1>
        <button className="btn btn-primary mt-6" onClick={connect}>Connect wallet</button>
      </div>
    )
  }
  if (stash && stash.ownerId === accountId) {
    return <div className="container-page py-12"><Reveal stash={stash} policy={policy} /></div>
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (!valid || !CONTRACT_ID) return
    const k = generateKey()
    const s: StoredAgentKey = { ownerId: accountId, name: form.name.trim(), ...k }
    // Stash first: redirect wallets leave the page and come back here.
    pendingKey.set(s)
    setPolicy(valid)
    const ok = await run('Add agent', [tx.addAgent(k.publicKey, s.name, valid), tx.addAgentKey(accountId, k.publicKey)])
    if (ok) setStash(s)
    else pendingKey.set(null)
  }
  const err = (k: string) => (touched ? errors[k] : undefined)

  return (
    <div className="container-page py-12">
      <SetupBanner />
      <div className="mx-auto max-w-[640px]">
        <Link to="/app" className="text-[13px] text-muted hover:text-fg">← Dashboard</Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <h1 className="h2">Add an agent</h1>
          <button type="button" className="btn btn-ghost" onClick={() => { setForm(SHOPBOT); setTouched(false) }}>Fill with the ShopBot demo policy</button>
        </div>
        <p className="mt-2 text-muted">Set what this agent may spend. Then your browser makes a key that can only ask NearLimit for payments.</p>

        <form className="mt-8 flex flex-col gap-5" onSubmit={submit} noValidate>
          <Field id="agent-name" label="Agent name" error={err('name')}>
            <input id="agent-name" className="input" placeholder="ShopBot" value={form.name} onChange={(e) => set('name', e.target.value)} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field id="per-tx" label="Limit per transaction" error={err('perTx')} hint="Anything above is blocked.">
              <input id="per-tx" className="input mono" inputMode="decimal" value={form.perTx} onChange={(e) => set('perTx', e.target.value)} />
            </Field>
            <Field id="daily" label="Daily limit" error={err('daily')} hint="Over this, you are asked.">
              <input id="daily" className="input mono" inputMode="decimal" value={form.daily} onChange={(e) => set('daily', e.target.value)} />
            </Field>
            <Field id="threshold" label="Ask me above" error={err('threshold')} hint="Single payments over this wait for you.">
              <input id="threshold" className="input mono" inputMode="decimal" value={form.threshold} onChange={(e) => set('threshold', e.target.value)} />
            </Field>
          </div>
          <div className="text-[13px] text-muted">All amounts are in NEAR.</div>

          <label className="flex items-start gap-3 text-[14px]">
            <input id="allowlist-only" type="checkbox" className="mt-1 size-4 accent-[var(--fg)]" checked={form.allowlistOnly} onChange={(e) => set('allowlistOnly', e.target.checked)} />
            <span><span className="font-medium">Ask me before paying a new account</span><span className="block text-muted">Payments to accounts outside the allowlist wait for your approval.</span></span>
          </label>
          <Field id="allowlist" label="Allowlist" error={err('allowlist')} hint="Account ids this agent can pay without asking. One per line.">
            <textarea id="allowlist" className="input mono" rows={3} placeholder={`${DEMO.coffee}\n${DEMO.hosting}`} value={form.allowlist} onChange={(e) => set('allowlist', e.target.value)} />
          </Field>
          <Field id="blocklist" label="Blocklist (optional)" error={err('blocklist')} hint="Payments to these accounts are always blocked.">
            <textarea id="blocklist" className="input mono" rows={2} value={form.blocklist} onChange={(e) => set('blocklist', e.target.value)} />
          </Field>
          <Field id="expires" label="Expires (optional)" error={err('expires')} hint="After this time every request from the agent is blocked.">
            <input id="expires" type="datetime-local" className="input sm:max-w-[280px]" value={form.expires} onChange={(e) => set('expires', e.target.value)} />
          </Field>

          <div className="card p-4 text-[13px] leading-5 text-muted">
            Your wallet will ask you to approve two transactions: one registers the agent and its policy in NearLimit, one adds a restricted key to your account. The key can only call <span className="mono">request_transfer</span>, cannot attach NEAR, and can burn at most {AGENT_GAS_ALLOWANCE_NEAR} NEAR in gas.
          </div>
          <div>
            <button className="btn btn-primary" disabled={!!busy || !CONTRACT_ID}>{busy ? 'Waiting for wallet…' : 'Create agent and key'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
