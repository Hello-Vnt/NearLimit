import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, CirclePause, Play, Plus, Snowflake, Trash2, Wallet } from 'lucide-react'
import { ActivityFeed, Badge, ExplorerLink, Near, Section, SetupBanner } from '../components/ui'
import { useToast } from '../components/Toasts'
import { formatNear, parseNear, shortKey, timeAgo, todayIndex } from '../lib/near'
import type { Agent, Vault } from '../lib/types'
import { useAction } from '../lib/useAction'
import { useVault } from '../lib/useVault'
import { tx, useWallet } from '../lib/wallet'

function validAmount(v: string): boolean {
  try {
    return BigInt(parseNear(v)) > 0n
  } catch {
    return false
  }
}

function CreateVault({ onDone }: { onDone: () => void }) {
  const [amount, setAmount] = useState('2')
  const { busy, run } = useAction(onDone)
  const ok = validAmount(amount) && BigInt(parseNear(amount)) >= BigInt(parseNear('0.5'))
  return (
    <div className="card mx-auto max-w-[520px] p-8">
      <span className="flex size-11 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-accent-text"><Wallet className="size-5" strokeWidth={1.75} /></span>
      <h1 className="h2 mt-4">Create your vault</h1>
      <p className="mt-2 text-muted">Deposit testnet NEAR into NearLimit. Your agents spend from this vault, never from your wallet. You can withdraw any time.</p>
      <form
        className="mt-6 flex items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (ok) run('Deposit', [tx.deposit(amount)], 'Vault created')
        }}
      >
        <div className="flex-1">
          <label className="field-label" htmlFor="first-deposit">Amount in NEAR (minimum 0.5)</label>
          <input id="first-deposit" className="input mono" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <button className="btn btn-accent h-10" disabled={!ok || !!busy}>{busy ? 'Waiting for wallet…' : 'Create vault'}</button>
      </form>
    </div>
  )
}

function BalanceCard({ vault, refresh }: { vault: Vault; refresh: () => void }) {
  const [mode, setMode] = useState<'deposit' | 'withdraw' | null>(null)
  const [amount, setAmount] = useState('1')
  const { busy, run } = useAction(refresh)
  const tooMuch = mode === 'withdraw' && validAmount(amount) && BigInt(parseNear(amount)) > BigInt(vault.balance)
  return (
    <div className="card p-6">
      <div className="eyebrow">Vault balance</div>
      <div className="stat mt-3">{formatNear(vault.balance, 3)} <span className="text-[20px] text-muted">NEAR</span></div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button className="btn btn-accent" onClick={() => setMode(mode === 'deposit' ? null : 'deposit')}>Deposit</button>
        <button className="btn btn-ghost" onClick={() => setMode(mode === 'withdraw' ? null : 'withdraw')}>Withdraw</button>
        <button
          className={`btn ${vault.paused ? 'btn-primary' : 'btn-danger'}`}
          disabled={!!busy}
          onClick={() => run(vault.paused ? 'Resume' : 'Pause', [tx.setPaused(!vault.paused)], vault.paused ? 'Vault resumed' : 'Vault paused: every agent is blocked')}
        >
          {vault.paused ? <><Play className="size-3.5" /> Resume vault</> : <><CirclePause className="size-3.5" /> Pause vault</>}
        </button>
      </div>
      {mode && (
        <form
          className="mt-4 flex items-end gap-2"
          onSubmit={async (e) => {
            e.preventDefault()
            const ok = await run(mode === 'deposit' ? 'Deposit' : 'Withdraw', [mode === 'deposit' ? tx.deposit(amount) : tx.withdraw(amount)], mode === 'deposit' ? 'Deposited' : 'Withdrawn')
            if (ok) setMode(null)
          }}
        >
          <div className="flex-1">
            <label className="field-label" htmlFor="vault-amount">{mode === 'deposit' ? 'Deposit' : 'Withdraw'} amount in NEAR</label>
            <input id="vault-amount" className="input mono" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
            {tooMuch && <div className="mt-1 text-[13px] text-danger">More than the vault holds.</div>}
          </div>
          <button className="btn btn-primary h-10" disabled={!validAmount(amount) || tooMuch || !!busy}>{busy ? 'Waiting…' : 'Confirm'}</button>
        </form>
      )}
      {vault.paused && <div className="mt-4"><Badge tone="danger">Paused: all agent requests are blocked</Badge></div>}
    </div>
  )
}

export function spentToday(a: Agent): bigint {
  return a.day_index === todayIndex() ? BigInt(a.spent_today) : 0n
}

export function SpendCard({ vault }: { vault: Vault }) {
  const spent = vault.agents.reduce((s, a) => s + spentToday(a), 0n)
  const limit = vault.agents.reduce((s, a) => s + BigInt(a.policy.daily_limit), 0n)
  const pct = limit > 0n ? Math.min(100, Number((spent * 1000n) / limit) / 10) : 0
  return (
    <div className="card flex flex-col p-6">
      <div className="eyebrow">Today’s spend</div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="stat">{formatNear(spent, 3)}</span>
        <span className="text-[15px] text-muted">of {formatNear(limit, 3)} NEAR daily limit</span>
      </div>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-[var(--border-strong)]" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Today's spend against the daily limit">
        <div className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--blue))] transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-auto grid grid-cols-2 gap-4 pt-5 text-[13px] text-muted">
        <div><div className="mono text-[15px] text-fg">{formatNear(vault.total_blocked, 3)} NEAR</div>blocked or rejected, all time</div>
        <div><div className="mono text-[15px] text-fg">{formatNear(vault.total_sent, 3)} NEAR</div>sent by agents, all time</div>
      </div>
      <div className="mt-2 text-[12px] text-muted">The daily window resets at 00:00 UTC.</div>
    </div>
  )
}

export function AgentCard({ agent, owner, refresh, readOnly }: { agent: Agent; owner: string; refresh?: () => void; readOnly?: boolean }) {
  const { busy, run } = useAction(refresh)
  const [confirm, setConfirm] = useState(false)
  const p = agent.policy
  const expired = p.expires_at_ms !== null && Date.now() >= p.expires_at_ms
  const spent = spentToday(agent)
  const pct = Math.min(100, Number((spent * 1000n) / (BigInt(p.daily_limit) || 1n)) / 10)
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[16px] font-medium">{agent.name}</div>
          <div className="mono text-muted" title={agent.public_key}>{shortKey(agent.public_key)} · added {timeAgo(agent.created_at_ms)}</div>
        </div>
        {!agent.active ? <Badge tone="danger">Frozen</Badge> : expired ? <Badge tone="danger">Expired</Badge> : <Badge tone="ok">Active</Badge>}
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-3 text-[13px]">
        <div><dt className="text-muted">Per transaction</dt><dd><Near yocto={p.per_tx_limit} /></dd></div>
        <div><dt className="text-muted">Daily</dt><dd><Near yocto={p.daily_limit} /></dd></div>
        <div><dt className="text-muted">Ask me above</dt><dd><Near yocto={p.approval_threshold} /></dd></div>
      </dl>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--border-strong)]">
        <div className="h-full rounded-full bg-[var(--blue)]" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1.5 text-[12px] text-muted">
        <span className="mono text-[12px]">{formatNear(spent, 3)}</span> spent today ·{' '}
        {p.allowlist_only ? `allowlist of ${p.allowlist.length}` : 'any receiver'}
        {p.blocklist.length ? ` · ${p.blocklist.length} blocked` : ''}
        {p.expires_at_ms ? ` · expires ${new Date(p.expires_at_ms).toLocaleDateString()}` : ''}
      </div>
      {!readOnly && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            className="btn btn-ghost"
            disabled={!!busy}
            onClick={() => run(agent.active ? 'Freeze' : 'Unfreeze', [tx.setAgentActive(agent.public_key, !agent.active)], agent.active ? `${agent.name} frozen` : `${agent.name} unfrozen`)}
          >
            <Snowflake className="size-3.5" /> {agent.active ? 'Freeze' : 'Unfreeze'}
          </button>
          {confirm ? (
            <>
              <button
                className="btn btn-danger"
                disabled={!!busy}
                onClick={() => run('Revoke', [tx.deleteAgentKey(owner, agent.public_key), tx.removeAgent(agent.public_key)], `${agent.name} revoked: key deleted`)}
              >
                Delete key and remove agent
              </button>
              <button className="btn btn-ghost" onClick={() => setConfirm(false)}>Cancel</button>
            </>
          ) : (
            <button className="btn btn-danger" onClick={() => setConfirm(true)}><Trash2 className="size-3.5" /> Revoke</button>
          )}
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const { accountId, connect, ready } = useWallet()
  const toast = useToast()
  const { loading, error, vault, activity, freshIds, refresh } = useVault(accountId, (a) => {
    if (a.kind === 'transfer_pending') toast({ tone: 'warn', title: 'Payment needs your approval', body: `${a.agent_name} wants to send ${formatNear(a.amount)} NEAR to ${a.receiver_id}` })
    if (a.kind === 'transfer_blocked') toast({ tone: 'danger', title: 'Payment blocked', body: `${a.agent_name}: ${formatNear(a.amount)} NEAR to ${a.receiver_id}. ${a.reason}` })
  })

  if (!accountId) {
    return (
      <div className="container-page py-20">
        <SetupBanner />
        <div className="card mx-auto max-w-[520px] p-8 text-center">
          <h1 className="h2">Connect a testnet wallet</h1>
          <p className="mt-2 text-muted">Your vault, agents and approvals live on NEAR testnet under your account.</p>
          <button className="btn btn-accent mt-6" onClick={connect} disabled={!ready}>Connect wallet</button>
        </div>
      </div>
    )
  }

  return (
    <div className="container-page py-10">
      <SetupBanner />
      {error && <div className="card mb-6 p-4 text-[14px] text-danger">Could not read the contract: {error}</div>}
      {loading ? (
        <div className="py-24 text-center text-muted">Loading your vault…</div>
      ) : !vault ? (
        <CreateVault onDone={refresh} />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h1 className="h2">Dashboard</h1>
            <ExplorerLink owner={accountId} />
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <BalanceCard vault={vault} refresh={refresh} />
            <SpendCard vault={vault} />
          </div>

          <Section title="Needs your approval" action={vault.pending.length ? <span className="rounded-full bg-[var(--coral)] px-2 py-0.5 text-[12px] font-semibold text-[var(--coral-fg)]">{vault.pending.length} waiting</span> : undefined}>
            {vault.pending.length === 0 ? (
              <div className="px-5 py-8 text-center text-[14px] text-muted">Nothing is waiting. Payments over a limit or to a new account show up here.</div>
            ) : (
              <ul className="divide-y divide-line">
                {vault.pending.map((r) => (
                  <li key={r.id}>
                    <Link to={`/app/inbox/${r.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5 text-[14px] hover:bg-raised">
                      <Badge tone="warn">Pending</Badge>
                      <span className="min-w-0 flex-1 basis-[220px]">
                        <Near yocto={r.amount} /> <span className="text-muted">to</span> <span className="mono break-all">{r.receiver_id}</span>
                        <span className="block text-[13px] text-muted">{r.agent_name} · {r.reason} · {timeAgo(r.created_at_ms)}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 text-[13px] font-medium text-accent-text">Review <ChevronRight className="size-4" /></span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[15px] font-medium">Agents</h2>
              <Link to="/app/agents/new" className="btn btn-accent"><Plus className="size-3.5" /> Add agent</Link>
            </div>
            {vault.agents.length === 0 ? (
              <div className="card p-8 text-center text-[14px] text-muted">
                No agents yet. Add one to get a restricted key it can spend with.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {vault.agents.map((a) => <AgentCard key={a.public_key} agent={a} owner={accountId} refresh={refresh} />)}
              </div>
            )}
          </div>

          <Section title="Live activity" action={<span className="flex items-center gap-2 text-[12px] text-muted"><span className="size-1.5 animate-pulse rounded-full bg-[var(--accent)]" /> updates every 3s</span>}>
            <ActivityFeed items={activity} freshIds={freshIds} />
          </Section>
        </div>
      )}
    </div>
  )
}
