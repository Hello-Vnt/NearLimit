import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type Tone = 'ok' | 'warn' | 'danger' | 'neutral'
interface Toast {
  id: number
  tone: Tone
  title: string
  body?: string
}
const Ctx = createContext<(t: Omit<Toast, 'id'>) => void>(() => {})
export const useToast = () => useContext(Ctx)

let seq = 0
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const push = useCallback((t: Omit<Toast, 'id'>) => {
    const id = ++seq
    setToasts((all) => [...all.slice(-3), { ...t, id }])
    setTimeout(() => setToasts((all) => all.filter((x) => x.id !== id)), 6000)
  }, [])
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="row-in pointer-events-auto rounded-2xl border border-line-strong bg-raised p-4 shadow-lg shadow-black/5">
            <div className="flex items-center gap-2 text-[14px] font-medium">
              <span className="size-2 rounded-full" style={{ background: t.tone === 'neutral' ? 'var(--muted)' : `var(--${t.tone})` }} />
              {t.title}
            </div>
            {t.body && <div className="mt-1 text-[13px] leading-5 break-words text-muted">{t.body}</div>}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
