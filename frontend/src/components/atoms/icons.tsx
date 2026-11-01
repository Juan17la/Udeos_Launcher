// Lucide-style stroked icons used across the launcher (stroke 2.75 per the design system).
type P = { size?: number }
const base = (size: number, sw: number) => ({
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: sw, style: { flexShrink: 0 }, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
})

export const Sun = ({ size = 16 }: P) => (
  <svg {...base(size, 2)}><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" /></svg>
)
export const Moon = ({ size = 16 }: P) => (
  <svg {...base(size, 2)}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
)
export const Globe = ({ size = 15 }: P) => (
  <svg {...base(size, 2)}><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15 15 0 0 1 0 20a15 15 0 0 1 0-20z" /></svg>
)
export const Shield = ({ size = 17 }: P) => (
  <svg {...base(size, 2)}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
)
export const Plus = ({ size = 14 }: P) => (
  <svg {...base(size, 2.25)}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
)
export const Play = ({ size = 13 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="6 3 20 12 6 21 6 3" /></svg>
)
export const X = ({ size = 15 }: P) => (
  <svg {...base(size, 2)}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
)
export const Check = ({ size = 12 }: P) => (
  <svg {...base(size, 2.5)}><path d="M20 6 9 17l-5-5" /></svg>
)
export const Folder = ({ size = 14 }: P) => (
  <svg {...base(size, 2)}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
)
export const Camera = ({ size = 24 }: P) => (
  <svg {...base(size, 2.2)}><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3.5" /></svg>
)
export const ChevronLeft = ({ size = 14 }: P) => (
  <svg {...base(size, 2)}><path d="m15 18-6-6 6-6" /></svg>
)
export const Search = ({ size = 14 }: P) => (
  <svg {...base(size, 2)}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
)
export const Hourglass = ({ size = 16 }: P) => (
  <svg {...base(size, 2)}><path d="M6 2.5h12M6 21.5h12M7 2.5c0 5 10 5.5 10 9.5S7 17 7 21.5M17 2.5c0 5-10 5.5-10 9.5s10 5 10 9.5" /></svg>
)
export const Sparkles = ({ size = 14 }: P) => (
  <svg {...base(size, 2)}><path d="M10 3 8.5 8.5 3 10l5.5 1.5L10 17l1.5-5.5L17 10l-5.5-1.5Z" /><path d="M19 15v6M16 18h6" /></svg>
)
export const ChevronDown = ({ size = 14 }: P) => (
  <svg {...base(size, 2)}><path d="M6 9l6 6 6-6" /></svg>
)
export const User = ({ size = 16 }: P) => (
  <svg {...base(size, 2)}><circle cx="12" cy="8" r="4" /><path d="M4 20.5c0-3.6 3.6-6 8-6s8 2.4 8 6" /></svg>
)
export const Pencil = ({ size = 14 }: P) => (
  <svg {...base(size, 2)}><path d="M17 3.5l3.5 3.5L8 19.5H4.5V16z" /></svg>
)
export const Trash = ({ size = 14 }: P) => (
  <svg {...base(size, 2)}><path d="M4 6.5h16M9.5 6.5V4h5v2.5M6.5 6.5l1 14h9l1-14" /></svg>
)
export const ZoomIn = ({ size = 16 }: P) => (
  <svg {...base(size, 2.5)}><circle cx="10.5" cy="10.5" r="6.5" /><path d="M20.5 20.5l-5.5-5.5M10.5 7.5v6M7.5 10.5h6" /></svg>
)
export const ZoomOut = ({ size = 16 }: P) => (
  <svg {...base(size, 2.5)}><circle cx="10.5" cy="10.5" r="6.5" /><path d="M20.5 20.5l-5.5-5.5M7.5 10.5h6" /></svg>
)
export const Reset = ({ size = 16 }: P) => (
  <svg {...base(size, 2.5)}><path d="M3.5 12a8.5 8.5 0 1 0 2.5-6" /><path d="M3.5 3.5V8H8" /></svg>
)
export const Grid = ({ size = 16 }: P) => (
  <svg {...base(size, 2.5)}><path d="M4 4h16v16H4zM9.33 4v16M14.67 4v16M4 9.33h16M4 14.67h16" /></svg>
)
export const Download = ({ size = 12 }: P) => (
  <svg {...base(size, 2)}><path d="M12 3.5v12M6.5 10l5.5 5.5 5.5-5.5M4.5 20.5h15" /></svg>
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
export const Stop = ({ size = 13 }: P) => (
  <svg {...base(size, 2)}><rect x="5" y="5" width="14" height="14" rx="2" /></svg>
)
export const EyeOff = ({ size = 15 }: P) => (
  <svg {...base(size, 2)}><path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 3.9M6.6 6.6C3.9 8.4 2 12 2 12s4 7 10 7a9.7 9.7 0 0 0 4.4-1M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>
)

// Sidebar and loaders.
export const Cube = ({ size = 18 }: P) => (
  <svg {...base(size, 1.9)}><path d="M12 2.5 3.5 7v10L12 21.5 20.5 17V7L12 2.5z" /><path d="M3.5 7 12 11.5 20.5 7M12 11.5v10" /></svg>
)
export const ServerIcon = ({ size = 18 }: P) => (
  <svg {...base(size, 1.9)}><rect x="3" y="3.5" width="18" height="7" rx="2" /><rect x="3" y="13.5" width="18" height="7" rx="2" /><path d="M7 7h.01M7 17h.01" /></svg>
)
export const Shirt = ({ size = 18 }: P) => (
  <svg {...base(size, 1.9)}><path d="M8.5 3 3 6l2 4.5 2.5-1V21h9V9.5l2.5 1L21 6l-5.5-3a3.5 3.5 0 0 1-7 0z" /></svg>
)
export const Package = ({ size = 18 }: P) => (
  <svg {...base(size, 1.9)}><path d="m3.5 7.5 8.5 4.5 8.5-4.5M12 12v9.5M3.5 7.5v9L12 21l8.5-4.5v-9L12 3 3.5 7.5z" /><path d="m7.8 5.2 8.4 4.6" /></svg>
)
export const Pulse = ({ size = 18 }: P) => (
  <svg {...base(size, 1.9)}><path d="M3 12h4l2.5-7 5 14L17 12h4" /></svg>
)
export const ChevronRight = ({ size = 14 }: P) => (
  <svg {...base(size, 2)}><path d="m9 18 6-6-6-6" /></svg>
)
export const Wand = ({ size = 18 }: P) => (
  <svg {...base(size, 1.9)}><path d="m15 4 1 2.5L18.5 7.5 16 8.5 15 11l-1-2.5L11.5 7.5 14 6.5 15 4zM5 21l11-11M18 14l.6 1.4L20 16l-1.4.6L18 18l-.6-1.4L16 16l1.4-.6L18 14z" /></svg>
)
export const List = ({ size = 16 }: P) => (
  <svg {...base(size, 2)}><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" /></svg>
)
export const Tiles = ({ size = 16 }: P) => (
  <svg {...base(size, 2)}><rect x="4" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" /></svg>
)
// A window with its left column: collapse / expand the sidebar.
export const SidebarIcon = ({ size = 16 }: P) => (
  <svg {...base(size, 2)}><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M9 4v16" /></svg>
)
