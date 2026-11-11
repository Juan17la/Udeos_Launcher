// Udeos design planning: shared behaviour for the four planning pages.
// 1. The doc navigation bar and the theme toggle.
// 2. Line icons (<svg data-i="name">) drawn from one small set, like lucide in the app.
// 3. The app sidebar, built once for every mock window (<aside data-sidebar>).

const ICONS = {
  box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  server: '<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/>',
  shirt: '<path d="M20.4 6.6 16 4a4 4 0 0 1-8 0L3.6 6.6 2 11l4 1v8h12v-8l4-1z"/>',
  package: '<path d="m7.5 4.3 9 5.2M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  play: '<path d="M7 4v16l13-8z" fill="currentColor" stroke="none"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  pencil: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  activity: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  rail: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
  chev: '<path d="m6 9 6 6 6-6"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  sparkles: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15v4M17 17h4"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="m5 12 5 5L20 7"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  filter: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  terminal: '<path d="m5 8 4 4-4 4M12 16h7"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>',
  alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
  brush: '<path d="M18 3 9 12l3 3 9-9zM9 12c-3 0-5 2-5 5 0 1-1 2-2 2 2 2 7 2 9-2l1-2"/>',
}
const svg = (name, cls = 'ic') =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`


const PAGES = [
  ['mockups.html', 'Mockups'],
  ['design-system.html', 'Design system'],
  ['navigation-flow.html', 'Navigation flow'],
  ['vision.html', 'Product vision'],
]

function docNav() {
  const here = location.pathname.split('/').pop() || 'mockups.html'
  const bar = document.createElement('header')
  bar.className = 'doc-nav'
  bar.innerHTML = `
    <a class="brand" href="mockups.html"><span class="logo" style="--sz:28px"><img src="../../frontend/src/assets/icons/ender_pearl.png" alt=""><img src="../../frontend/src/assets/icons/mace.png" alt=""></span>Udeos design planning</a>
    <nav aria-label="Planning pages">${PAGES.map(([href, label]) =>
      `<a href="${href}"${href === here ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</nav>
    <button class="btn sm ghost theme-toggle" type="button" aria-label="Switch theme"></button>`
  document.body.prepend(bar)
  const btn = bar.querySelector('.theme-toggle')
  const paint = () => {
    const dark = document.documentElement.dataset.theme !== 'light'
    btn.innerHTML = dark ? `${svg('sun')}<span>Light theme</span>` : `${svg('moon')}<span>Dark theme</span>`
  }
  btn.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'
    document.documentElement.dataset.theme = next
    try { localStorage.setItem('udeos-planning-theme', next) } catch {}
    paint()
  })
  paint()
}

// <aside data-sidebar data-active="instances" data-new="New Instance" data-activity="2">
function sidebar(el) {
  const active = el.dataset.active || ''
  const newLabel = el.dataset.new
  const activity = el.dataset.activity
  const items = [['instances', 'box', 'Instances'], ['servers', 'server', 'Servers'], ['skins', 'shirt', 'Skins'], ['addons', 'package', 'Addons']]
  el.className = 'sidebar'
  el.innerHTML = `
    <div class="wm"><span class="logo" style="--sz:34px"><img src="../../frontend/src/assets/icons/ender_pearl.png" alt=""><img src="../../frontend/src/assets/icons/mace.png" alt=""></span><span>Udeos Launcher</span></div>
    ${newLabel ? `<span class="btn primary block newbtn">${svg('plus')}<span>${newLabel}</span></span>` : '<div style="height:64px"></div>'}
    ${items.map(([key, icon, label]) => `<div class="item${key === active ? ' on' : ''}">${svg(icon, 'ic ic-lg')}<span>${label}</span></div>`).join('')}
    <div class="spacer"></div>
    <div class="item">${svg('rail', 'ic ic-lg')}<span>Collapse sidebar</span></div>
    <div class="item${el.dataset.activityOpen ? ' on' : ''}">${activity ? '<span class="spin" style="width:20px;height:20px;color:var(--gold)"></span>' : svg('activity', 'ic ic-lg')}<span>Activity</span>${activity ? `<span class="badge">${activity}</span><span class="actbar"><b></b></span>` : ''}</div>
    <div class="me"><span class="face"></span><div><b>Steve</b><small>Switch profile</small></div><span class="chev muted" style="margin-left:auto">${svg('chev')}</span></div>
    <div class="grass"></div>`
}

docNav()
document.querySelectorAll('[data-sidebar]').forEach(sidebar)
document.querySelectorAll('svg[data-i]').forEach((s) => { s.outerHTML = svg(s.dataset.i, s.getAttribute('class') || 'ic') })
