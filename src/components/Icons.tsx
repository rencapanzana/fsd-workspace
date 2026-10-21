// One authored icon set: 20px grid, 1.6px stroke, square caps. Status marks are shapes, so state never relies on colour alone.
import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement> & { size?: number }
const Svg = ({ size = 18, children, ...p }: P) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6}
    strokeLinecap="square" aria-hidden="true" focusable="false" {...p}>
    {children}
  </svg>
)

// Lowered: an empty pole (waiting for sign-off). Raised: red over yellow (cleared to go live).
export function Flag({ raised = true, size = 18, className = '' }: { raised?: boolean; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" focusable="false"
      className={`${raised ? '' : 'flag-down'} ${className}`}>
      <path d="M5 2.5v16" stroke="currentColor" strokeWidth={1.8} strokeLinecap="square" />
      <g className="flag-cloth">
        <rect x="6" y="3" width="11" height="4.5" fill="var(--flag-red)" />
        <rect x="6" y="7.5" width="11" height="4.5" fill="var(--flag-yellow)" />
      </g>
    </svg>
  )
}

export const Hazard = (p: P) => (
  <Svg {...p}><path d="M10 2.5 17.5 10 10 17.5 2.5 10Z" fill="var(--red)" stroke="var(--red)" /><path d="M10 6.5v4.5M10 13.2v.3" stroke="#fff" strokeWidth={2} /></Svg>
)
export const Ring = (p: P) => <Svg {...p}><circle cx="10" cy="10" r="6.5" /></Svg>
export const HalfRing = (p: P) => (
  <Svg {...p}><circle cx="10" cy="10" r="6.5" /><path d="M10 3.5a6.5 6.5 0 0 1 0 13Z" fill="currentColor" stroke="none" /></Svg>
)
export const Pause = (p: P) => <Svg {...p}><path d="M7 4.5v11M13 4.5v11" strokeWidth={2.2} /></Svg>
export const Check = (p: P) => <Svg {...p}><path d="m4 10.5 4 4 8-9" strokeWidth={2} /></Svg>
export const Search = (p: P) => <Svg {...p}><circle cx="8.5" cy="8.5" r="5" /><path d="m12.5 12.5 4.5 4.5" /></Svg>
export const Plus = (p: P) => <Svg {...p}><path d="M10 4v12M4 10h12" strokeWidth={1.8} /></Svg>
export const Menu = (p: P) => <Svg {...p}><path d="M3 6h14M3 10h14M3 14h14" /></Svg>
export const Close = (p: P) => <Svg {...p}><path d="m5 5 10 10M15 5 5 15" /></Svg>
export const Copy = (p: P) => <Svg {...p}><rect x="7" y="7" width="9" height="10" /><path d="M13 4H4v10" /></Svg>
export const Timer = (p: P) => <Svg {...p}><circle cx="10" cy="11" r="6" /><path d="M10 7.5V11l2.5 1.5M8 2.5h4" /></Svg>
export const Stop = (p: P) => <Svg {...p}><rect x="5.5" y="5.5" width="9" height="9" fill="currentColor" /></Svg>
export const External = (p: P) => <Svg {...p}><path d="M11 4h5v5M16 4l-7 7M14 12v4H4V6h4" /></Svg>
export const Trash = (p: P) => <Svg {...p}><path d="M4 6h12M8 6V4h4v2M6 6l1 11h6l1-11" /></Svg>
export const Back = (p: P) => <Svg {...p}><path d="M12 4 6 10l6 6" strokeWidth={1.8} /></Svg>
export const Sun = (p: P) => <Svg {...p}><circle cx="10" cy="10" r="3.5" /><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M4.3 15.7l1.4-1.4M14.3 5.7l1.4-1.4" /></Svg>
export const Moon = (p: P) => <Svg {...p}><path d="M15.5 12.5A6.5 6.5 0 0 1 7.5 4.5a6.5 6.5 0 1 0 8 8Z" /></Svg>
