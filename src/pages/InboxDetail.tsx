import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { Badge, Near } from '../components/ui'
import { explorerAccount } from '../lib/config'
import { explain, type Explanation } from '../lib/explain'
import { shortKey, timeAgo } from '../lib/near'
import { useAction } from '../lib/useAction'
import { useVault } from '../lib/useVault'
import { tx, useWallet } from '../lib/wallet'

const RISK_TONE = { Low: 'ok', Medium: 'warn', High: 'danger' } as const

export default function InboxDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { accountId, connect } = useWallet()
  const { loading, vault, activity } = useVault(accountId)
  const req = vault?.pending.find((p) => String(p.id) === id)
  const [ex, setEx] = useState<Explanation | null>(null)
  const [reason, setReason] = useState('')
  const asked = useRef<number | null>(null)
  const { busy, run } = useAction()

  useEffect(() => {
    if (!req || asked.current === req.id) return
    asked.current = req.id
    explain(req, activity).then(setEx).catch(() => setEx(null))
  }, [req, activity])

  if (!accountId) {
    return <div className="container-page py-20 text-center"><h1 className="h2">Connect a wallet to review requests</h1><button className="btn btn-accent mt-6" onClick={connect}>Connect wallet</button></div>
  }
  if (loading) return <div className="container-page py-24 text-center text-muted">Loading request…</div>
  if (!req) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="h2">This request is no longer pending</h1>
        <p className="mt-2 text-muted">It was approved, rejected, or its agent was removed.</p>
        <Link to="/app" className="btn btn-accent mt-6">Back to dashboard</Link>
      </div>
    )
  }

  const f = ex?.facts
  const rows: [string, React.ReactNode][] = f
    ? [
        ['Receiver account', f.receiverExists ? (f.receiverIsContract ? 'Exists, is a smart contract' : 'Exists, regular account') : 'Does not exist on testnet'],
        ['Receiver balance', f.receiverExists ? `${f.receiverBalanceNear} NEAR` : 'n/a'],
        ['Paid before', f.priorPayments === 0 ? 'Never' : `${f.priorPayments} time${f.priorPayments === 1 ? '' : 's'}`],
        ['Compared with agent average', f.timesAverage === null ? 'No earlier payments by this agent' : `${f.timesAverage}× the average of ${f.agentAverageNear} NEAR`],
        ['Memo scan', f.memoFlags.length ? f.memoFlags.join('; ') : 'Nothing instruction-like found'],
        ['Why the contract held it', f.contractReason],
      ]
    : []

  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-[720px]">
        <Link to="/app" className="text-[13px] text-muted hover:text-fg">← Dashboard</Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="h2">Request #{req.id}</h1>
          <Badge tone="warn">Pending</Badge>
        </div>
        <p className="mt-3 text-[20px] leading-7 font-light tracking-[-0.01em]">
          <span className="font-normal">{req.agent_name}</span> wants to send <Near yocto={req.amount} className="!text-[18px]" /> to{' '}
          <a className="mono !text-[18px] break-all underline decoration-line-strong underline-offset-4" href={explorerAccount(req.receiver_id)} target="_blank" rel="noreferrer">{req.receiver_id}</a>
        </p>
        <div className="mt-1 text-[13px] text-muted">Asked {timeAgo(req.created_at_ms)} with key <span className="mono">{shortKey(req.agent_key)}</span></div>

        {req.memo && (
          <div className="card mt-6 p-4">
            <div className="text-[13px] font-medium text-muted">Memo from the agent (untrusted text)</div>
            <div className="mono mt-1 break-words whitespace-pre-wrap">{req.memo}</div>
          </div>
        )}

        <div className="card mt-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[15px] font-medium"><Sparkles className="size-4 text-accent-text" strokeWidth={1.75} /> Explanation</div>
            {ex && <Badge tone={RISK_TONE[ex.risk]}>Risk: {ex.risk}</Badge>}
          </div>
          {ex ? (
            <>
              <p className="mt-3">{ex.text}</p>
              <div className="mt-3 text-[13px] text-muted">
                Suggested: <span className="font-medium text-fg">{ex.suggested}</span> · Source: {ex.source} · The risk level comes from fixed rules in code, not from the model.
              </div>
            </>
          ) : (
            <p className="mt-3 text-muted">Checking the receiver on testnet…</p>
          )}
        </div>

        {rows.length > 0 && (
          <div className="card mt-4 overflow-hidden">
            <table className="w-full text-left text-[14px]">
              <caption className="border-b border-line px-5 py-3 text-left text-[15px] font-medium">Facts</caption>
              <tbody className="divide-y divide-line">
                {rows.map(([k, v]) => (
                  <tr key={k}><th scope="row" className="w-[42%] px-5 py-2.5 align-top font-normal text-muted">{k}</th><td className="px-5 py-2.5">{v}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6">
          <label className="field-label" htmlFor="reject-reason">Reason if you reject (stored on-chain)</label>
          <input id="reject-reason" className="input" placeholder="Looks like prompt injection" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="btn btn-primary"
            disabled={!!busy}
            onClick={async () => (await run('Reject', [tx.reject(req.id, reason.trim() || 'Rejected by owner')], 'Request rejected')) && nav('/app')}
          >
            {busy === 'Reject' ? 'Waiting for wallet…' : 'Reject'}
          </button>
          <button
            className="btn btn-ghost"
            disabled={!!busy || !ex || ex.facts.receiverExists === false}
            onClick={async () => (await run('Approve', [tx.approve(req.id, ex?.hash ?? null)], 'Approved and sent')) && nav('/app')}
          >
            {busy === 'Approve' ? 'Waiting for wallet…' : 'Approve and send'}
          </button>
        </div>
        {ex?.facts.receiverExists === false ? (
          <div className="mt-3 rounded-xl bg-[var(--coral-soft)] px-3.5 py-2.5 text-[13px] leading-5 text-coral-text">
            Approve is off because <span className="mono !text-[13px]">{req.receiver_id}</span> does not exist on testnet. NEAR cannot deliver to it, so the payment would bounce back to your vault. Reject it instead.
          </div>
        ) : (
          ex && <div className="mono mt-3 break-all text-[12px] text-muted">If you approve, this explanation’s hash is stored with it: {ex.hash}</div>
        )}
      </div>
    </div>
  )
}
