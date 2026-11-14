import type { CSSProperties } from 'react'

export type Mood = 'idle' | 'happy' | 'wait' | 'alert'

/**
 * The NearLimit bot: a glossy lavender diamond with two blinking eyes and a
 * soft glow. `glow` tints the halo (green for approved, coral for blocked…),
 * `look` shifts the eyes (-1 left … 1 right), `mood` changes their shape.
 */
export function BotMascot({
  size = 120,
  glow = '#7a5cf0',
  look = 0,
  mood = 'idle',
  bob = true,
  className = '',
  style,
}: {
  size?: number
  glow?: string
  look?: number
  mood?: Mood
  bob?: boolean
  className?: string
  style?: CSSProperties
}) {
  const body = size * 0.72 // the rotated square's side, so its diagonal fits `size`
  const eyeW = Math.max(3, size * 0.075)
  const eyeH = mood === 'happy' ? eyeW * 1.15 : mood === 'alert' ? eyeW * 2.3 : eyeW * 1.9
  const gap = size * 0.1
  const lookY = mood === 'wait' ? -size * 0.05 : 0
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size, ...style }} aria-hidden="true">
      <div className={`absolute inset-0 flex items-center justify-center ${bob ? 'float-y' : ''}`} style={{ animationDuration: '4.5s' }}>
        <div
          className="flex items-center justify-center transition-[box-shadow] duration-700"
          style={{
            width: body,
            height: body,
            borderRadius: body * 0.3,
            transform: 'rotate(45deg)',
            background: 'radial-gradient(circle at 34% 30%, #ece5ff 0%, #c2b0ff 32%, #a08aff 58%, #7457ec 100%)',
            boxShadow: `inset ${size * 0.02}px ${size * 0.03}px ${size * 0.04}px rgba(255,255,255,.55), inset -${size * 0.05}px -${size * 0.08}px ${size * 0.14}px rgba(70,30,160,.35), 0 0 ${size * 0.32}px ${size * 0.04}px color-mix(in srgb, ${glow} 55%, transparent)`,
          }}
        >
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ gap, transform: `rotate(-45deg) translate(${look * size * 0.07}px, ${lookY}px)` }}
          >
            {[0, 1].map((i) => (
              <span
                key={i}
                className="blink block rounded-full bg-[#141414] transition-[height] duration-300"
                style={{ width: eyeW, height: eyeH, animationDelay: i ? '0.04s' : '0s' }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
