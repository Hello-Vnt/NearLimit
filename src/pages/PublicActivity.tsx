import { useParams } from 'react-router-dom'
import { ActivityFeed, Badge, Section, SetupBanner } from '../components/ui'
import { explorerAccount } from '../lib/config'
import { formatNear } from '../lib/near'
import { useVault } from '../lib/useVault'
import { AgentCard } from './Dashboard'

export default function PublicActivity() {
  const { owner = '' } = useParams()
  const { loading, error, vault, activity, freshIds } = useVault(owner)
  return (
    <div className="container-page py-10">
      <SetupBanner />
      <div className="eyebrow">Public activity, read-only</div>
      <h1 className="h2 mt-1 flex flex-wrap items-center gap-3">
        <a className="mono !text-[22px] break-all hover:underline" href={explorerAccount(owner)} target="_blank" rel="noreferrer">{owner}</a>
        {vault?.paused && <Badge tone="danger">Paused</Badge>}
      </h1>
      {error && <div className="card mt-6 p-4 text-[14px] text-danger">Could not read the contract: {error}</div>}
      {loading ? (
        <div className="py-24 text-center text-muted">Loading…</div>
      ) : !vault ? (
        <div className="card mt-6 p-8 text-center text-muted">This account has no NearLimit vault on testnet.</div>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          <div className="card grid gap-6 p-6 sm:grid-cols-4">
            {[
              [formatNear(vault.balance, 3), 'NEAR in the vault'],
              [formatNear(vault.total_sent, 3), 'NEAR sent by agents'],
              [formatNear(vault.total_blocked, 3), 'NEAR blocked or rejected'],
              [String(vault.pending.length), 'waiting for the owner'],
            ].map(([n, l]) => (
              <div key={l}><div className="stat !text-[36px] !leading-[40px]">{n}</div><div className="mt-1 text-[13px] text-muted">{l}</div></div>
            ))}
          </div>
          {vault.agents.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              {vault.agents.map((a) => <AgentCard key={a.public_key} agent={a} owner={owner} readOnly />)}
            </div>
          )}
          <Section title="Live activity" action={<span className="flex items-center gap-2 text-[12px] text-muted"><span className="size-1.5 animate-pulse rounded-full bg-[var(--accent)]" /> updates every 3s</span>}>
            <ActivityFeed items={activity} freshIds={freshIds} />
          </Section>
        </div>
      )}
    </div>
  )
}
