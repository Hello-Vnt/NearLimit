import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Ban, CircleCheck, CirclePause, Info } from 'lucide-react'
import { CONTRACT_ID, explorerAccount } from '../lib/config'
import { TIPS } from '../lib/glossary'
import { Tip } from './Tip'
import { formatNear, shortKey, timeAgo } from '../lib/near'
import type { Activity } from '../lib/types'

export type Tone = 'ok' | 'warn' | 'danger' | 'neutral'

export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

export function StatusBadge({ status }: { status: 'approved' | 'pending' | 'blocked' }) {
  const badge =
    status === 'approved' ? <Badge tone="ok"><CircleCheck className="size-3.5" /> Approved</Badge>
    : status === 'pending' ? <Badge tone="warn"><CirclePause className="size-3.5" /> Pending</Badge>
    : <Badge tone="danger"><Ban className="size-3.5" /> Blocked</Badge>
  return <Tip text={TIPS[status]} focusable>{badge}</Tip>
}

export function Near({ yocto, className = '' }: { yocto: string; className?: string }) {
  return <span className={`mono ${className}`}>{formatNear(yocto)} NEAR</span>
}

export function SetupBanner() {
  if (CONTRACT_ID) return null
  return (
    <div className="card mb-6 flex gap-3 p-4 text-[14px] leading-5">
      <Info className="mt-0.5 size-4 shrink-0 text-muted" />
      <div>
        <div className="font-medium">The contract address is not set</div>
        <div className="text-muted">
          Deploy the contract in <span className="mono">contract/</span> to testnet, put its account id in <span className="mono">VITE_CONTRACT_ID</span> in <span className="mono">.env</span>, and restart. The README has the commands.
        </div>
      </div>
    </div>
  )
}

const KIND: Record<string, { label: string; tone: Tone }> = {
  transfer_approved: { label: 'Approved', tone: 'ok' },
  transfer_pending: { label: 'Pending', tone: 'warn' },
  transfer_blocked: { label: 'Blocked', tone: 'danger' },
  transfer_failed: { label: 'Refunded', tone: 'danger' },
  request_approved: { label: 'Owner approved', tone: 'ok' },
  request_rejected: { label: 'Owner rejected', tone: 'danger' },
  agent_added: { label: 'Agent added', tone: 'neutral' },
  agent_frozen: { label: 'Agent frozen', tone: 'danger' },
  agent_unfrozen: { label: 'Agent unfrozen', tone: 'neutral' },
  agent_removed: { label: 'Agent removed', tone: 'neutral' },
  policy_updated: { label: 'Policy updated', tone: 'neutral' },
  vault_paused: { label: 'Vault paused', tone: 'danger' },
  vault_unpaused: { label: 'Vault resumed', tone: 'neutral' },
  deposit: { label: 'Deposit', tone: 'neutral' },
  withdraw: { label: 'Withdraw', tone: 'neutral' },
}

export function ActivityFeed({ items, freshIds, empty }: { items: Activity[]; freshIds?: Set<number>; empty?: string }) {
  if (!items.length) return <div className="px-5 py-10 text-center text-[14px] text-muted">{empty ?? 'No activity yet.'}</div>
  return (
    <ul className="divide-y divide-line">
      {items.map((a) => {
        const k = KIND[a.kind] ?? { label: a.kind, tone: 'neutral' as Tone }
        return (
          <li key={a.id} className={`flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-[14px] ${freshIds?.has(a.id) ? 'row-in' : ''}`}>
            <span className="w-[128px] shrink-0"><Badge tone={k.tone}>{k.label}</Badge></span>
            <span className="min-w-0 flex-1 basis-[220px]">
              {a.receiver_id ? (
                <>
                  <Near yocto={a.amount} className="text-fg" /> <span className="text-muted">to</span>{' '}
                  <a className="mono break-all hover:underline" href={explorerAccount(a.receiver_id)} target="_blank" rel="noreferrer">{a.receiver_id}</a>
                </>
              ) : BigInt(a.amount) > 0n ? (
                <Near yocto={a.amount} className="text-fg" />
              ) : (
                <span className="text-muted">{a.agent_name || 'Vault'}</span>
              )}
              {a.reason && <span className="block text-[13px] leading-5 text-muted">{a.reason}</span>}
              {a.memo && <span className="block truncate text-[13px] leading-5 text-muted" title={a.memo}>memo: {a.memo}</span>}
            </span>
            <span className="text-[13px] text-muted">
              {a.agent_name && a.receiver_id ? `${a.agent_name} · ` : ''}
              {a.agent_key && !a.agent_name ? `${shortKey(a.agent_key)} · ` : ''}
              <time dateTime={new Date(a.timestamp_ms).toISOString()} title={new Date(a.timestamp_ms).toLocaleString()}>{timeAgo(a.timestamp_ms)}</time>
              <span className="mono ml-2 text-[12px]">#{a.id}</span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}

export function ExplorerLink({ owner }: { owner: string }) {
  return (
    <Link to={`/v/${owner}`} className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-fg">
      Public activity page <ArrowUpRight className="size-3.5" />
    </Link>
  )
}

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <h2 className="text-[15px] font-medium">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}
