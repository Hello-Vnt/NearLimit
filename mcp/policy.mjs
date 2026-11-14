// Mirrors the order of checks in contract/src/lib.rs `request_transfer`.
// Used for the dry-run tool, so an agent can learn the outcome before it asks.
// The contract stays the source of truth: this is a prediction only.

export const YOCTO = 10n ** 24n
const DAY_MS = 86_400_000

export function parseNear(v) {
  const s = String(v).trim()
  if (!/^\d+(\.\d{1,24})?$/.test(s)) throw new Error(`"${v}" is not a NEAR amount. Use a decimal string such as "0.1".`)
  const [w, f = ''] = s.split('.')
  return BigInt(w) * YOCTO + BigInt(f.padEnd(24, '0'))
}

export function formatNear(y) {
  const n = BigInt(y)
  const frac = (n % YOCTO).toString().padStart(24, '0').slice(0, 4).replace(/0+$/, '')
  return `${n / YOCTO}${frac ? '.' + frac : ''}`
}

export function spentToday(agent, nowMs = Date.now()) {
  return agent.day_index === Math.floor(nowMs / DAY_MS) ? BigInt(agent.spent_today) : 0n
}

/** Returns { status: 'approved' | 'pending' | 'blocked', reason }. */
export function predict(vault, agent, receiverId, amountYocto, nowMs = Date.now()) {
  const p = agent.policy
  const amount = BigInt(amountYocto)
  if (vault.paused) return { status: 'blocked', reason: 'vault is paused' }
  if (!agent.active) return { status: 'blocked', reason: 'agent is frozen' }
  if (p.expires_at_ms !== null && nowMs >= p.expires_at_ms) return { status: 'blocked', reason: 'agent key has expired' }
  if (p.blocklist.includes(receiverId)) return { status: 'blocked', reason: 'receiver is on the blocklist' }
  if (amount > BigInt(p.per_tx_limit)) return { status: 'blocked', reason: 'over per-transaction limit' }
  if (amount > BigInt(vault.balance)) return { status: 'blocked', reason: 'not enough balance in the vault' }
  if (spentToday(agent, nowMs) + amount > BigInt(p.daily_limit)) return { status: 'pending', reason: 'over daily limit' }
  if (p.allowlist_only && !p.allowlist.includes(receiverId)) return { status: 'pending', reason: 'receiver is not on the allowlist' }
  if (amount > BigInt(p.approval_threshold)) return { status: 'pending', reason: 'over approval threshold' }
  return { status: 'approved', reason: '' }
}
