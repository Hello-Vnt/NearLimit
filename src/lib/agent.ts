// Everything the *agent* side can do. It only ever holds the restricted key.
import { Account, KeyPair, KeyPairSigner, providers } from 'near-api-js'
import { CONTRACT_ID, RPC_URL } from './config'
import { parseNear } from './near'
import type { TransferResult } from './types'

export interface StoredAgentKey {
  ownerId: string
  name: string
  publicKey: string
  secretKey: string
}

const PLAYGROUND_KEY = 'ag:playgroundKey'
const PENDING_KEY = 'ag:pendingKey'

function read<T>(store: () => Storage, k: string): T | null {
  try {
    const v = store().getItem(k)
    return v ? (JSON.parse(v) as T) : null
  } catch {
    return null
  }
}
function write(store: () => Storage, k: string, v: unknown | null) {
  try {
    if (v === null) store().removeItem(k)
    else store().setItem(k, JSON.stringify(v))
  } catch {
    /* storage unavailable */
  }
}

export const playgroundKey = {
  get: () => read<StoredAgentKey>(() => localStorage, PLAYGROUND_KEY),
  set: (v: StoredAgentKey | null) => write(() => localStorage, PLAYGROUND_KEY, v),
}
/** Survives the wallet redirect between "generate key" and "reveal key". */
export const pendingKey = {
  get: () => read<StoredAgentKey>(() => sessionStorage, PENDING_KEY),
  set: (v: StoredAgentKey | null) => write(() => sessionStorage, PENDING_KEY, v),
}

export function generateKey(): { publicKey: string; secretKey: string } {
  const kp = KeyPair.fromRandom('ed25519')
  return { publicKey: kp.getPublicKey().toString(), secretKey: kp.toString() }
}

export function publicKeyOf(secretKey: string): string {
  return KeyPair.fromString(secretKey as Parameters<typeof KeyPair.fromString>[0]).getPublicKey().toString()
}

function agentAccount(key: StoredAgentKey) {
  const provider = new providers.JsonRpcProvider({ url: RPC_URL })
  const signer = KeyPairSigner.fromSecretKey(key.secretKey as Parameters<typeof KeyPairSigner.fromSecretKey>[0])
  return new Account(key.ownerId, provider, signer)
}

export interface AgentCallResult {
  result: TransferResult
  txHash: string
}

/** The one thing the agent key is allowed to do. */
export async function requestTransfer(key: StoredAgentKey, receiverId: string, amountNear: string, memo: string): Promise<AgentCallResult> {
  const outcome = await agentAccount(key).callFunctionRaw({
    contractId: CONTRACT_ID,
    methodName: 'request_transfer',
    args: { receiver_id: receiverId, amount: parseNear(amountNear), memo },
    gas: 50_000_000_000_000n,
    deposit: 0n,
    waitUntil: 'EXECUTED_OPTIMISTIC',
  })
  const status = outcome.status as { SuccessValue?: string; Failure?: unknown }
  if (typeof status.SuccessValue !== 'string') throw new Error('Transaction failed: ' + JSON.stringify(status.Failure ?? status))
  const result = JSON.parse(atob(status.SuccessValue)) as TransferResult
  return { result, txHash: outcome.transaction.hash as string }
}

/** Tries to call a method the key is not allowed to call. Expected to throw. */
export async function tryForbiddenCall(key: StoredAgentKey): Promise<string> {
  try {
    await agentAccount(key).callFunctionRaw({
      contractId: CONTRACT_ID,
      methodName: 'withdraw',
      args: { amount: parseNear('1') },
      gas: 30_000_000_000_000n,
      deposit: 0n,
    })
    return 'UNEXPECTED: the call went through'
  } catch (e) {
    return errorText(e)
  }
}

export function errorText(e: unknown): string {
  const any = e as { type?: string; message?: string; kind?: unknown }
  const msg = any?.message ?? String(e)
  return any?.type ? `${any.type}: ${msg}` : msg
}
