/**
 * NearLimit mark: two legs that climb toward a ceiling bar, the limit.
 * Drawn in currentColor so it follows the light and dark themes.
 */
export function LogoMark({ className = 'size-5' }: { className?: string }) {
  return (
    <svg viewBox="-4 -4 284 256" className={className} aria-hidden="true" focusable="false">
      <path d="M0 248V66h44l78 84 88-100h44v198h-44V114l-88 100-78-84v118z" fill="currentColor" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" />
      <rect x="104" y="0" width="172" height="33" rx="5" fill="currentColor" />
    </svg>
  )
}
