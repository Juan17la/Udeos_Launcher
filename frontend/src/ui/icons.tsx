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
export const Pencil = ({ size = 14 }: P) => (
  <svg {...base(size, 2.75)}><path d="M17 3.5l3.5 3.5L8 19.5H4.5V16z" /></svg>
)
export const Download = ({ size = 12 }: P) => (
  <svg {...base(size, 2.75)}><path d="M12 3.5v12M6.5 10l5.5 5.5 5.5-5.5M4.5 20.5h15" /></svg>
)
export const Eraser = ({ size = 16 }: P) => (
  <svg {...base(size, 2.5)}><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" /><path d="M22 21H7" /><path d="m5 11 9 9" /></svg>
)
export const Bucket = ({ size = 16 }: P) => (
  <svg {...base(size, 2.5)}><path d="m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z" /><path d="m5 2 5 5" /><path d="M2 13h15" /><path d="M22 20a2 2 0 1 1-4 0c0-1.6 1.7-2.4 2-4 .3 1.6 2 2.4 2 4Z" /></svg>
)
export const Pipette = ({ size = 16 }: P) => (
  <svg {...base(size, 2.5)}><path d="m2 22 1-1h3l9-9" /><path d="M3 21v-3l9-9" /><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z" /></svg>
)
export const Undo = ({ size = 16 }: P) => (
  <svg {...base(size, 2.5)}><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></svg>
)
export const Redo = ({ size = 16 }: P) => (
  <svg {...base(size, 2.5)}><path d="m15 14 5-5-5-5" /><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" /></svg>
)
