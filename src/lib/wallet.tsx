import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { setupWalletSelector, type WalletSelector } from '@near-wallet-selector/core'
import { setupModal, type WalletSelectorModal } from '@near-wallet-selector/modal-ui'
import { setupMyNearWallet } from '@near-wallet-selector/my-near-wallet'
import { setupMeteorWallet } from '@near-wallet-selector/meteor-wallet'
import { transactions, utils } from 'near-api-js'
import { AGENT_GAS_ALLOWANCE_NEAR, CONTRACT_ID, NETWORK_ID } from './config'
import { parseNear } from './near'
import type { Policy } from './types'

const TGAS = 1_000_000_000_000n

export interface Tx {
  receiverId: string
  // near-api-js Action objects
  actions: ReturnType<typeof transactions.functionCall>[]
}

interface WalletCtx {
  ready: boolean
  accountId: string | null
  connect: () => void
  disconnect: () => Promise<void>
  /** Signs and sends one or more transactions. Redirect wallets leave the page here. */
  send: (txs: Tx[]) => Promise<void>
}

const Ctx = createContext<WalletCtx>({
  ready: false,
  accountId: null,
  connect: () => {},
  disconnect: async () => {},
  send: async () => {},
})

export function WalletProvider({ children }: { children: ReactNode }) {
  const selector = useRef<WalletSelector | null>(null)
  const modal = useRef<WalletSelectorModal | null>(null)
  const [ready, setReady] = useState(false)
  const [accountId, setAccountId] = useState<string | null>(null)

  useEffect(() => {
    let sub: { unsubscribe: () => void } | undefined
    let cancelled = false
    setupWalletSelector({
      network: NETWORK_ID,
      modules: [setupMyNearWallet(), setupMeteorWallet()],
    })
      .then((s) => {
        if (cancelled) return
        selector.current = s
        // No contractId here: with one, wallets add a function-call key on
        // connect, which is a paid transaction and fails on an empty account.
        modal.current = setupModal(s, {
          theme: 'auto',
          description: 'Connect a NEAR testnet wallet to manage your vault.',
        })
        const pick = (accounts: { accountId: string; active: boolean }[]) =>
          setAccountId(accounts.find((a) => a.active)?.accountId ?? accounts[0]?.accountId ?? null)
        pick(s.store.getState().accounts)
        sub = s.store.observable.subscribe((state) => pick(state.accounts))
        setReady(true)
      })
      .catch((e) => {
        console.error('Wallet selector failed to start', e)
        setReady(true)
      })
    return () => {
      cancelled = true
      sub?.unsubscribe()
    }
  }, [])

  const connect = useCallback(() => modal.current?.show(), [])
  const disconnect = useCallback(async () => {
    const w = await selector.current?.wallet()
    await w?.signOut()
  }, [])
  const send = useCallback(async (txs: Tx[]) => {
    if (!selector.current) throw new Error('Wallet is not ready yet')
    const w = await selector.current.wallet()
    if (txs.length === 1) {
      await w.signAndSendTransaction({ receiverId: txs[0].receiverId, actions: txs[0].actions })
    } else {
      await w.signAndSendTransactions({ transactions: txs })
    }
  }, [])

  const value = useMemo(() => ({ ready, accountId, connect, disconnect, send }), [ready, accountId, connect, disconnect, send])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useWallet = () => useContext(Ctx)

// ---- transaction builders -------------------------------------------------

const call = (method: string, args: object, depositYocto = '0', tgas = 30n): Tx => ({
  receiverId: CONTRACT_ID,
  actions: [transactions.functionCall(method, args, tgas * TGAS, BigInt(depositYocto))],
})

export const tx = {
  deposit: (near: string) => call('deposit', {}, parseNear(near)),
  withdraw: (near: string) => call('withdraw', { amount: parseNear(near) }),
  addAgent: (public_key: string, name: string, policy: Policy) => call('add_agent', { public_key, name, policy }),
  setAgentActive: (public_key: string, active: boolean) => call('set_agent_active', { public_key, active }),
  removeAgent: (public_key: string) => call('remove_agent', { public_key }),
  setPaused: (paused: boolean) => call('set_paused', { paused }),
  approve: (request_id: number, ai_note_hash: string | null) => call('approve', { request_id, ai_note_hash }, '0', 50n),
  reject: (request_id: number, reason: string) => call('reject', { request_id, reason }),
  /** AddKey on the owner's own account: a key that can only call request_transfer on NearLimit. */
  addAgentKey: (ownerId: string, publicKey: string): Tx => ({
    receiverId: ownerId,
    actions: [
      transactions.addKey(
        utils.PublicKey.fromString(publicKey),
        transactions.functionCallAccessKey(CONTRACT_ID, ['request_transfer'], BigInt(parseNear(AGENT_GAS_ALLOWANCE_NEAR))),
      ),
    ],
  }),
  deleteAgentKey: (ownerId: string, publicKey: string): Tx => ({
    receiverId: ownerId,
    actions: [transactions.deleteKey(utils.PublicKey.fromString(publicKey))],
  }),
}
