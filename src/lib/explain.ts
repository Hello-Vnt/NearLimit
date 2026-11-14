// The AI layer (TxExplain heritage). Advisory only.
// Facts and the risk level are computed in code. The model only writes the sentence.
import { formatNear, viewAccount } from './near'
import type { Activity, PendingRequest } from './types'

export type Risk = 'Low' | 'Medium' | 'High'

export interface Facts {
  receiver: string
  amountNear: string
  contractReason: string
  receiverExists: boolean
  receiverIsContract: boolean
  receiverBalanceNear: string
  priorPayments: number
  agentAverageNear: string | null
  timesAverage: number | null
  memo: string
  memoFlags: string[]
}

export interface Explanation {
  facts: Facts
  risk: Risk
  suggested: 'Approve' | 'Review carefully' | 'Reject'
  text: string
  source: 'NEAR AI Cloud' | 'Rules only'
  hash: string
}

const MEMO_PATTERNS: [RegExp, string][] = [
  [/ignore\s+(all\s+)?(previous|prior|above)/i, 'tells the reader to ignore previous instructions'],
  [/(send|transfer|pay)\s+(all|everything|the\s+rest|\d)/i, 'contains a payment instruction'],
  [/\b(system|assistant|developer)\s*(prompt|message|:)/i, 'imitates a system message'],
  [/\b(urgent|immediately|right now|do not tell|don't tell|secret)\b/i, 'uses pressure or secrecy wording'],
  [/https?:\/\/|www\./i, 'contains a link'],
  [/\b[a-z0-9_-]+\.(testnet|near)\b/i, 'names another account'],
]

export function scanMemo(memo: string): string[] {
  return MEMO_PATTERNS.filter(([re]) => re.test(memo)).map(([, label]) => label)
}

const PAID = new Set(['transfer_approved', 'request_approved'])

export async function computeFacts(req: PendingRequest, activity: Activity[]): Promise<Facts> {
  const acct = await viewAccount(req.receiver_id).catch(() => ({ exists: false, balance: '0', isContract: false }))
  const paid = activity.filter((a) => PAID.has(a.kind))
  const priorPayments = paid.filter((a) => a.receiver_id === req.receiver_id).length
  const mine = paid.filter((a) => a.agent_key === req.agent_key)
  let avg: bigint | null = null
  if (mine.length) avg = mine.reduce((s, a) => s + BigInt(a.amount), 0n) / BigInt(mine.length)
  const times = avg && avg > 0n ? Number((BigInt(req.amount) * 100n) / avg) / 100 : null
  return {
    receiver: req.receiver_id,
    amountNear: formatNear(req.amount),
    contractReason: req.reason,
    receiverExists: acct.exists,
    receiverIsContract: acct.isContract,
    receiverBalanceNear: formatNear(acct.balance, 2),
    priorPayments,
    agentAverageNear: avg === null ? null : formatNear(avg),
    timesAverage: times,
    memo: req.memo,
    memoFlags: scanMemo(req.memo),
  }
}

/** The badge. Code rules only, never the model. */
export function riskOf(f: Facts): Risk {
  let score = 0
  if (!f.receiverExists) score += 2
  if (f.priorPayments === 0) score += 1
  if (f.timesAverage !== null && f.timesAverage >= 3) score += 1
  if (f.memoFlags.length) score += 2
  if (f.memoFlags.length >= 2) score += 1
  if (score >= 3) return 'High'
  if (score >= 1) return 'Medium'
  return 'Low'
}

export function rulesText(f: Facts, risk: Risk): string {
  const parts: string[] = []
  parts.push(f.priorPayments === 0 ? 'First payment to this account.' : `Paid this account ${f.priorPayments} time${f.priorPayments === 1 ? '' : 's'} before.`)
  if (!f.receiverExists) parts.push('The receiver account does not exist on testnet, so a transfer would fail and be refunded.')
  else if (f.receiverIsContract) parts.push('The receiver is a smart contract.')
  if (f.timesAverage !== null && f.timesAverage >= 1.5) parts.push(`The amount is ${f.timesAverage}× this agent's average of ${f.agentAverageNear} NEAR.`)
  if (f.memoFlags.length) parts.push(`The memo ${f.memoFlags.join(' and ')}, which is typical of prompt injection.`)
  parts.push(`Held because: ${f.contractReason}. Risk: ${risk}.`)
  return parts.join(' ')
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function askNearAi(f: Facts, risk: Risk): Promise<string | null> {
  try {
    const ctl = new AbortController()
    const t = setTimeout(() => ctl.abort(), 9000)
    const res = await fetch('/api/explain', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ facts: f, risk }),
      signal: ctl.signal,
    })
    clearTimeout(t)
    if (!res.ok) return null
    const j = (await res.json()) as { text?: string }
    return j.text?.trim() || null
  } catch {
    return null
  }
}

export async function explain(req: PendingRequest, activity: Activity[]): Promise<Explanation> {
  const facts = await computeFacts(req, activity)
  const risk = riskOf(facts)
  const ai = await askNearAi(facts, risk)
  const text = ai ?? rulesText(facts, risk)
  return {
    facts,
    risk,
    suggested: risk === 'High' ? 'Reject' : risk === 'Medium' ? 'Review carefully' : 'Approve',
    text,
    source: ai ? 'NEAR AI Cloud' : 'Rules only',
    hash: await sha256Hex(text),
  }
}
