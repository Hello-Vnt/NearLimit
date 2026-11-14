// The order of checks in contract/src/lib.rs `request_transfer`, for the
// in-browser demo. mcp/policy.mjs is the same logic for the MCP server.
// The contract is always the source of truth.
import type { Agent, Vault } from './types'

const DAY_MS = 86_400_000

export interface Decision {
  status: 'approved' | 'pending' | 'blocked'
  reason: string
}

export function spentToday(agent: Agent, nowMs = Date.now()): bigint {
  return agent.day_index === Math.floor(nowMs / DAY_MS) ? BigInt(agent.spent_today) : 0n
}

export function predict(vault: Vault, agent: Agent, receiverId: string, amountYocto: string | bigint, nowMs = Date.now()): Decision {
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
