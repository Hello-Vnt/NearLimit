import { useCallback, useState } from 'react'
import { useToast } from '../components/Toasts'
import { useWallet, type Tx } from './wallet'

/** Runs wallet transactions with a busy flag and error toast. */
export function useAction(after?: () => void) {
  const { send } = useWallet()
  const toast = useToast()
  const [busy, setBusy] = useState<string | null>(null)
  const run = useCallback(
    async (label: string, txs: Tx[], done?: string) => {
      setBusy(label)
      try {
        await send(txs)
        if (done) toast({ tone: 'ok', title: done })
        after?.()
        return true
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        if (!/reject|cancel|closed/i.test(msg)) toast({ tone: 'danger', title: `${label} failed`, body: msg.slice(0, 240) })
        return false
      } finally {
        setBusy(null)
      }
    },
    [send, toast, after],
  )
  return { busy, run }
}
