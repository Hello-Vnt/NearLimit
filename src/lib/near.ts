import { CONTRACT_ID, RPC_URL } from './config'
import type { Activity, Vault } from './types'

const YOCTO = 10n ** 24n

/** "0.25" -> "250000000000000000000000". Throws on bad input. */
export function parseNear(v: string): string {
  const s = v.trim()
  if (!/^\d+(\.\d{1,24})?$/.test(s)) throw new Error(`"${v}" is not a valid NEAR amount`)
  const [whole, frac = ''] = s.split('.')
  return (BigInt(whole) * YOCTO + BigInt(frac.padEnd(24, '0'))).toString()
}

/** Yocto string -> "1.25" (trimmed, up to `dp` decimals). */
export function formatNear(yocto: string | bigint, dp = 4): string {
  const n = BigInt(yocto)
  const whole = n / YOCTO
  const frac = (n % YOCTO).toString().padStart(24, '0').slice(0, dp).replace(/0+$/, '')
  return frac ? `${whole}.${frac}` : whole.toString()
}

async function rpc<T>(method: string, params: unknown): Promise<T> {
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 'ag', method, params }),
  })
  const j = await res.json()
  if (j.error) {
    const e = new Error(j.error.cause?.name || j.error.data || j.error.message || 'RPC error')
    ;(e as Error & { cause?: unknown }).cause = j.error
    throw e
  }
  return j.result as T
}

export async function view<T>(method: string, args: object): Promise<T> {
  if (!CONTRACT_ID) throw new Error('Contract is not configured (VITE_CONTRACT_ID)')
  const r = await rpc<{ result: number[] }>('query', {
    request_type: 'call_function',
    finality: 'optimistic',
    account_id: CONTRACT_ID,
    method_name: method,
    args_base64: btoa(JSON.stringify(args)),
  })
  return JSON.parse(new TextDecoder().decode(new Uint8Array(r.result))) as T
}

export const getVault = (owner: string) => view<Vault | null>('get_vault', { owner })
export const getActivity = (owner: string, from: number, limit: number) =>
  view<Activity[]>('get_activity', { owner, from, limit })

export interface AccountInfo {
  exists: boolean
  balance: string
  isContract: boolean
}
export async function viewAccount(accountId: string): Promise<AccountInfo> {
  try {
    const r = await rpc<{ amount: string; code_hash: string }>('query', {
      request_type: 'view_account',
      finality: 'final',
      account_id: accountId,
    })
    return { exists: true, balance: r.amount, isContract: r.code_hash !== '11111111111111111111111111111111' }
  } catch (e) {
    if (e instanceof Error && e.message.includes('UNKNOWN_ACCOUNT')) {
      return { exists: false, balance: '0', isContract: false }
    }
    throw e
  }
}

export interface AccessKeyInfo {
  exists: boolean
  receiverId?: string
  methodNames?: string[]
  allowance?: string | null
  fullAccess?: boolean
}
export async function viewAccessKey(accountId: string, publicKey: string): Promise<AccessKeyInfo> {
  try {
    const r = await rpc<{ permission: 'FullAccess' | { FunctionCall: { receiver_id: string; method_names: string[]; allowance: string | null } } }>(
      'query',
      { request_type: 'view_access_key', finality: 'optimistic', account_id: accountId, public_key: publicKey },
    )
    if (r.permission === 'FullAccess') return { exists: true, fullAccess: true }
    const fc = r.permission.FunctionCall
    return { exists: true, receiverId: fc.receiver_id, methodNames: fc.method_names, allowance: fc.allowance }
  } catch {
    return { exists: false }
  }
}

export const todayIndex = () => Math.floor(Date.now() / 86_400_000)

export function shortKey(pk: string): string {
  const body = pk.replace(/^ed25519:/, '')
  return `${body.slice(0, 6)}…${body.slice(-4)}`
}

export function timeAgo(ms: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000))
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}
