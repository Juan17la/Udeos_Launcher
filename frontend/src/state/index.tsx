import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react'
import { scroller } from '../utils/scroll'
import { DICTS, Language } from '../i18n'
import type { Dict } from '../i18n/en'
import { api, inWails, on } from '../api/bridge'
import type { AIIntent, CustomColors, Instance, Profile, ProjectType, SearchResult, Server, SkinLibrary } from '../api/types'
import { useLaunchController, LaunchController } from './useLaunchController'
import { useContentQueue, ContentQueue } from './useContentQueue'
import { applyTheme, DEFAULT_COLORS, isDark, Theme } from '../utils/theme'

export type { LaunchState } from './useLaunchController'
export type { ContentJob } from './useContentQueue'

export type { Theme } from '../utils/theme'

/** Which screen is on stage. Kept as plain state — the app is small enough not to need a router. */
export type Screen =
  /** Setup: nickname, language and theme. First run, or adding a profile (adding: Cancel goes back). */
  | { name: 'login'; adding?: boolean }
  | { name: 'dashboard' }
  /** server: the form makes a dedicated server instead of an instance. */
  /** modpack: the server form opens on "From a modpack" with this pack chosen. */
  | { name: 'create'; server?: boolean; modpack?: SearchResult }
  | { name: 'instance'; id: string }
  | { name: 'servers' }
  | { name: 'server'; id: string }
  /** instanceId (from an instance's Add from Modrinth button) locks the results to
   *  that instance's version/loader and makes Add install with no picker. */
  | { name: 'search'; instanceId?: string; type?: ProjectType; prefill?: AIIntent }
  /** The AI advisor, a full page. instanceId: the instance it is adding to (none: the player picks one on Add). */
  | { name: 'ai'; instanceId?: string }
  /** Full-page view of one search result; instanceId keeps the instance lock
   *  alive across Details → Back. */
  | { name: 'detail'; result: SearchResult; instanceId?: string }
  | { name: 'skins' }
  /** id: the library skin to edit; none paints a new one. */
  | { name: 'skinEditor'; id?: string }

type Entry = { screen: Screen; scrollY: number }

type AppState = {
  ready: boolean
  theme: Theme; setTheme: (t: Theme) => void
  /** The five colours of the custom theme. */
  colors: CustomColors; setColors: (c: CustomColors) => void
  /** light or dark, whatever the theme (a custom one by its background): picks the decor and the skin lighting. */
  scheme: 'light' | 'dark'
  /** Shows a language/theme without saving it (the setup screen, before the profile exists). */
  preview: (p: { language?: Language; theme?: Theme; colors?: CustomColors }) => void
  language: Language; setLanguage: (l: Language) => void
  t: Dict
  screen: Screen; go: (s: Screen) => void
  /** The screen Back returns to (the one before the current), or null on the first screen. */
  previous: Screen | null; back: () => void
  /** True when the current screen was reached with Back. */
  cameBack: boolean
  profile: Profile | null; saveProfile: (p: Profile) => Promise<void>
  nickname: string
  /** Switch to, add (a new name) or remove a launcher profile. Each has its own
   *  instances; removing one moves its instances to the active profile (the
   *  next one when the active is removed; the last cannot be). Preferences are shared. */
  setNickname: (name: string, prefs?: { language: Language; theme: Theme; colors: CustomColors }) => Promise<void>; removeNickname: (name: string) => Promise<void>
  /** refreshInstances reloads both lists: game instances and servers. */
  instances: Instance[]; servers: Server[]; refreshInstances: () => Promise<void>
  /** The skin library and what each profile wears (the nav shows the active one's face). */
  skins: SkinLibrary | null; refreshSkins: () => Promise<void>
  privacyOpen: boolean; setPrivacyOpen: (v: boolean) => void
}

/* Three contexts on purpose: launch and content progress tick many times a
 * second, and only Notifications and the Play buttons care. Screens that
 * read only AppState (Nav, Search, dialogs, Decor, CreateInstance) do not
 * re-render on those ticks. */
const AppCtx = createContext<AppState | null>(null)
const LaunchCtx = createContext<LaunchController | null>(null)
const ContentCtx = createContext<ContentQueue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [theme, setThemeState] = useState<Theme>('light')
  const [colors, setColorsState] = useState<CustomColors>(DEFAULT_COLORS)
  const [language, setLanguageState] = useState<Language>('en')
  // The screen on stage plus where the player came from (newest last), so
  // Back lands exactly where they were: an instance's page, or Addons with
  // its instance lock. Login and the dashboard are roots: nothing behind
  // them, and Back never returns to the login screen.
  // cameBack: the screen was reached with Back, so it may restore what the
  // player left (Addons keeps its search, page and scroll).
  const [nav, setNav] = useState<{ screen: Screen; history: Entry[]; cameBack: boolean }>({ screen: { name: 'login' }, history: [], cameBack: false })
  const { screen, history, cameBack } = nav
  const go = useCallback((next: Screen) => {
    // Each history entry keeps its scroll so Back lands at the same spot; a new screen starts at the top.
    const scrollY = scroller()?.scrollTop ?? 0
    setNav((cur) => {
      if (JSON.stringify(cur.screen) === JSON.stringify(next)) return cur
      if (next.name === 'login' || next.name === 'dashboard') return { screen: next, history: [], cameBack: false }
      // A finished creation form is never a place to come Back to: skip it, so Back lands where the form was opened from.
      if (cur.screen.name === 'create' && (next.name === 'instance' || next.name === 'server' || next.name === 'servers')) return { screen: next, history: cur.history, cameBack: false }
      return { screen: next, history: cur.screen.name === 'login' ? cur.history : [...cur.history, { screen: cur.screen, scrollY }].slice(-20), cameBack: false }
    })
    requestAnimationFrame(() => scroller()?.scrollTo({ top: 0 }))
  }, [])
  const back = useCallback(() => {
    const last = history[history.length - 1]
    setNav({ screen: last?.screen ?? { name: 'dashboard' }, history: history.slice(0, -1), cameBack: !!last })
    // Two frames: the restored screen commits, then its (cached) content lays out.
    requestAnimationFrame(() => requestAnimationFrame(() => scroller()?.scrollTo({ top: last?.scrollY ?? 0 })))
  }, [history])
  const [instances, setInstances] = useState<Instance[]>([])
  const [servers, setServers] = useState<Server[]>([])
  const [privacyOpen, setPrivacyOpen] = useState(false)

  const refreshInstances = useCallback(async () => {
    const [i, s] = await Promise.all([api.ListInstances(), api.ListServers()])
    setInstances(i); setServers(s)
  }, [])
  const [skins, setSkins] = useState<SkinLibrary | null>(null)
  const refreshSkins = useCallback(async () => { setSkins(await api.ListSkins()) }, [])
  useEffect(() => { if (profile) refreshSkins() }, [profile, refreshSkins])

  // A server started, stopped, finished loading or someone joined: only the
  // servers changed, so skip re-scanning every instance's folders.
  useEffect(() => on('server:state', () => { api.ListServers().then(setServers) }), [])

  const launch = useLaunchController(refreshInstances)
  const content = useContentQueue(refreshInstances)

  // Boot: load the profile; go straight to the dashboard when one exists.
  useEffect(() => {
    api.GetProfile().then(async (st) => {
      setThemeState(st.profile.theme); setColorsState(st.profile.colors ?? DEFAULT_COLORS)
      setLanguageState(st.profile.language)
      if (st.exists) {
        setProfile(st.profile)
        await refreshInstances()
        go({ name: 'dashboard' })
      }
      // Dev only (vite in a browser): ?screen=login | create | search | skins | skinEditor[:<id>] | instance:<id> jumps straight to a screen.
      if (!inWails) {
        const want = new URLSearchParams(location.search).get('screen')
        if (want === 'login') {
          setProfile(null); go({ name: 'login' })
        } else if (want) {
          setProfile(st.profile); await refreshInstances()
          const [name, id] = want.split(':')
          go(name === 'ai' ? { name: 'ai', instanceId: id } : name === 'instance' ? { name: 'instance', id } : name === 'server' ? { name: 'server', id } : name === 'servers' ? { name: 'servers' } : name === 'create' ? { name: 'create' } : name === 'search' ? { name: 'search' }
            : name === 'skins' ? { name: 'skins' } : name === 'skinEditor' ? { name: 'skinEditor', id } : { name: 'dashboard' })
        }
      }
      setReady(true)
    })
  }, [refreshInstances])

  useEffect(() => {
    applyTheme(theme, colors)
    document.documentElement.lang = language
  }, [theme, colors, language])

  const persistPrefs = useCallback(async (patch: Partial<Profile>) => {
    if (!profile) return
    const saved = await api.SaveProfile({ ...profile, ...patch })
    setProfile(saved)
    return saved
  }, [profile])

  const setTheme = (t: Theme) => { setThemeState(t); persistPrefs({ theme: t }) }
  const setLanguage = (l: Language) => { setLanguageState(l); persistPrefs({ language: l }) }
  // A colour picker fires on every drag: show each at once, save once it settles.
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const setColors = (c: CustomColors) => { setColorsState(c); clearTimeout(saveTimer.current); saveTimer.current = setTimeout(() => persistPrefs({ colors: c }), 400) }
  const preview = (p: { language?: Language; theme?: Theme; colors?: CustomColors }) => {
    if (p.language) setLanguageState(p.language)
    if (p.theme) setThemeState(p.theme)
    if (p.colors) setColorsState(p.colors)
  }

  // Each profile has its own instances, skins, language and theme: after a
  // switch (or a removal, whose instances and skins move to the active
  // profile) they are reloaded (skins follow `profile`) and the player lands
  // on the dashboard, since the page they were on may belong to the other profile.
  const switchTo = useCallback(async (patch: Partial<Profile>) => {
    const saved = await persistPrefs(patch)
    if (saved) { setThemeState(saved.theme); setColorsState(saved.colors); setLanguageState(saved.language) }
    await refreshInstances()
    go({ name: 'dashboard' })
  }, [persistPrefs, refreshInstances, go])
  const setNickname = useCallback((name: string, prefs?: { language: Language; theme: Theme; colors: CustomColors }) => switchTo({ nickname: name, nicknames: [name, ...(profile?.nicknames ?? [])], ...prefs }), [switchTo, profile])
  const removeNickname = useCallback((name: string) => {
    const rest = (profile?.nicknames ?? []).filter((n) => n !== name)
    if (rest.length === 0) return Promise.resolve()
    return switchTo({ nicknames: rest, nickname: name === profile?.nickname ? rest[0] : profile?.nickname })
  }, [switchTo, profile])

  const saveProfile = useCallback(async (p: Profile) => {
    setProfile(await api.SaveProfile(p))
    await refreshInstances()
    go({ name: 'dashboard' })
  }, [refreshInstances])

  const value = useMemo<AppState>(() => ({
    ready, theme, setTheme, colors, setColors, preview, scheme: theme === 'custom' ? (isDark(colors.background) ? 'dark' : 'light') : theme, language, setLanguage, t: DICTS[language],
    screen, go, previous: history[history.length - 1]?.screen ?? null, back, cameBack, profile, saveProfile, nickname: profile?.nickname ?? '', setNickname, removeNickname,
    instances, servers, refreshInstances, skins, refreshSkins,
    privacyOpen, setPrivacyOpen,
  }), [ready, theme, colors, language, screen, history, cameBack, back, profile, instances, servers, skins, privacyOpen, refreshInstances, refreshSkins, saveProfile, setNickname, removeNickname]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AppCtx.Provider value={value}>
      <LaunchCtx.Provider value={launch}>
        <ContentCtx.Provider value={content}>{children}</ContentCtx.Provider>
      </LaunchCtx.Provider>
    </AppCtx.Provider>
  )
}

function use<T>(ctx: React.Context<T | null>, name: string): T {
  const v = useContext(ctx)
  if (!v) throw new Error(`${name} must be used inside <AppProvider>`)
  return v
}

export const useApp = () => use(AppCtx, 'useApp')
export const useLaunch = () => use(LaunchCtx, 'useLaunch')
export const useContent = () => use(ContentCtx, 'useContent')
