// Lucide-style stroked icons used across the launcher (stroke 2.75 per the design system).
type P = { size?: number }
const base = (size: number, sw: number) => ({
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: sw, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
})

export const Sun = ({ size = 16 }: P) => (
  <svg {...base(size, 2.75)}><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" /></svg>
)
export const Moon = ({ size = 16 }: P) => (
  <svg {...base(size, 2.75)}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
)
export const Globe = ({ size = 15 }: P) => (
  <svg {...base(size, 2.75)}><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15 15 0 0 1 0 20a15 15 0 0 1 0-20z" /></svg>
)
export const Shield = ({ size = 17 }: P) => (
  <svg {...base(size, 2.75)}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
)
export const Plus = ({ size = 14 }: P) => (
  <svg {...base(size, 3)}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
)
export const Play = ({ size = 13 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="6 3 20 12 6 21 6 3" /></svg>
)
export const X = ({ size = 15 }: P) => (
  <svg {...base(size, 2.75)}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
)
export const Check = ({ size = 12 }: P) => (
  <svg {...base(size, 3.2)}><path d="M20 6 9 17l-5-5" /></svg>
)
export const Folder = ({ size = 14 }: P) => (
  <svg {...base(size, 2.75)}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
)
export const Camera = ({ size = 24 }: P) => (
  <svg {...base(size, 2.2)}><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3.5" /></svg>
)
export const ChevronLeft = ({ size = 14 }: P) => (
  <svg {...base(size, 2.75)}><path d="m15 18-6-6 6-6" /></svg>
)
export const Search = ({ size = 14 }: P) => (
  <svg {...base(size, 2.75)}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
)
export const ChevronDown = ({ size = 14 }: P) => (
  <svg {...base(size, 2.75)}><path d="M6 9l6 6 6-6" /></svg>
)
export const User = ({ size = 16 }: P) => (
  <svg {...base(size, 2.75)}><circle cx="12" cy="8" r="4" /><path d="M4 20.5c0-3.6 3.6-6 8-6s8 2.4 8 6" /></svg>
)
