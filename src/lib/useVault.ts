import { useCallback, useEffect, useRef, useState } from 'react'
import { CONTRACT_ID } from './config'
import { getActivity, getVault } from './near'
import type { Activity, Vault } from './types'

const PAGE = 60

export interface VaultState {
  loading: boolean
  error: string | null
  vault: Vault | null
  /** Newest first. */
  activity: Activity[]
  /** Ids that arrived after the first load, for the slide-in animation. */
  freshIds: Set<number>
  refresh: () => void
}

/** Polls the contract every 3 seconds (Contract Watch heritage). */
export function useVault(owner: string | null, onNew?: (a: Activity) => void): VaultState {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [vault, setVault] = useState<Vault | null>(null)
  const [activity, setActivity] = useState<Activity[]>([])
  const [freshIds, setFreshIds] = useState<Set<number>>(new Set())
  const lastSeen = useRef<number | null>(null)
  const onNewRef = useRef(onNew)
  onNewRef.current = onNew
  const [tick, setTick] = useState(0)
  const refresh = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    lastSeen.current = null
    setVault(null)
    setActivity([])
    setFreshIds(new Set())
    setLoading(true)
  }, [owner])

  useEffect(() => {
    if (!owner || !CONTRACT_ID) {
      setLoading(false)
      return
    }
    let alive = true
    const load = async () => {
      try {
        const v = await getVault(owner)
        if (!alive) return
        let acts: Activity[] = []
        if (v && v.activity_count > 0) {
          const from = Math.max(0, v.activity_count - PAGE)
          acts = (await getActivity(owner, from, PAGE)).reverse()
          if (!alive) return
        }
        const top = acts[0]?.id ?? -1
        if (lastSeen.current !== null && top > lastSeen.current) {
          const fresh = acts.filter((a) => a.id > (lastSeen.current as number))
          setFreshIds(new Set(fresh.map((a) => a.id)))
          fresh.reverse().forEach((a) => onNewRef.current?.(a))
        }
        lastSeen.current = top
        setVault(v)
        setActivity(acts)
        setError(null)
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    const id = setInterval(() => {
      if (!document.hidden) load()
    }, 3000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [owner, tick])

  return { loading, error, vault, activity, freshIds, refresh }
}
