/**
 * Multiplayer-style cursor: a chunky rounded arrow with a thick dark outline
 * and a bold label pill offset to its lower right. Purple by default.
 */
export function CursorBadge({ label, size = 40, className = '' }: { label?: string; size?: number; className?: string }) {
  return (
    <div className={`pointer-events-none select-none ${className}`} aria-hidden="true">
      <svg viewBox="0 0 40 40" width={size} height={size} className="drop-shadow-[0_6px_10px_rgba(60,30,140,0.35)]">
        {/* thick dark outline */}
        <path
          d="M8.5 6.2 L33 17.6 Q35.2 18.7 32.8 19.6 L22.4 23.1 L18.2 33.3 Q17.2 35.6 16.3 33.2 Z"
          fill="#141414"
          stroke="#141414"
          strokeWidth="7"
          strokeLinejoin="round"
        />
        {/* purple body with a light inner edge */}
        <path
          d="M8.5 6.2 L33 17.6 Q35.2 18.7 32.8 19.6 L22.4 23.1 L18.2 33.3 Q17.2 35.6 16.3 33.2 Z"
          fill="#a68aff"
          stroke="#e9e1ff"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
      {label && (
        <span
          className="ml-[58%] -mt-[6%] inline-block rounded-[12px] px-3.5 py-1.5 font-semibold tracking-[-0.01em] whitespace-nowrap text-white shadow-[0_8px_18px_-6px_rgba(90,60,200,0.55)]"
          style={{ background: '#7a5cf0', fontSize: Math.max(13, size * 0.42) }}
        >
          {label}
        </span>
      )}
    </div>
  )
}
