import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react'
import { DICTS, Language } from '../i18n'
import type { Dict } from '../i18n/en'
import { api, inWails } from '../api/bridge'
import type { Instance, Profile, ProjectType, SearchResult } from '../api/types'
import { useLaunchController, LaunchController } from './useLaunchController'
import { useContentQueue, ContentQueue } from './useContentQueue'

export type { LaunchState } from './useLaunchController'
export type { ContentJob } from './useContentQueue'

export type Theme = 'light' | 'dark'

/** Which screen is on stage. Kept as plain state — the app is small enough not to need a router. */
export type Screen =
  | { name: 'login' }
  | { name: 'dashboard' }
  | { name: 'create' }
  | { name: 'instance'; id: string }
  /** instanceId (from an instance's Add from Modrinth button) locks the results to
   *  that instance's version/loader and makes Add install with no picker. */
  | { name: 'search'; instanceId?: string; type?: ProjectType }
  /** Full-page view of one search result; instanceId keeps the instance lock
   *  alive across Details → Back. */
  | { name: 'detail'; result: SearchResult; instanceId?: string }

type Entry = { screen: Screen; scrollY: number }

type AppState = {
  ready: boolean
  theme: Theme; setTheme: (t: Theme) => void
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
  setNickname: (name: string) => Promise<void>; removeNickname: (name: string) => Promise<void>
  instances: Instance[]; refreshInstances: () => Promise<void>
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
    const scrollY = window.scrollY
    setNav((cur) => {
      if (JSON.stringify(cur.screen) === JSON.stringify(next)) return cur
      if (next.name === 'login' || next.name === 'dashboard') return { screen: next, history: [], cameBack: false }
      return { screen: next, history: cur.screen.name === 'login' ? cur.history : [...cur.history, { screen: cur.screen, scrollY }].slice(-20), cameBack: false }
    })
    requestAnimationFrame(() => window.scrollTo({ top: 0 }))
  }, [])
  const back = useCallback(() => {
    const last = history[history.length - 1]
    setNav({ screen: last?.screen ?? { name: 'dashboard' }, history: history.slice(0, -1), cameBack: !!last })
    // Two frames: the restored screen commits, then its (cached) content lays out.
    requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo({ top: last?.scrollY ?? 0 })))
  }, [history])
  const [instances, setInstances] = useState<Instance[]>([])
  const [privacyOpen, setPrivacyOpen] = useState(false)

  const refreshInstances = useCallback(async () => {
    setInstances(await api.ListInstances())
  }, [])

  const launch = useLaunchController(refreshInstances)
  const content = useContentQueue(refreshInstances)

  // Boot: load the profile; go straight to the dashboard when one exists.
  useEffect(() => {
    api.GetProfile().then(async (st) => {
      setThemeState(st.profile.theme)
      setLanguageState(st.profile.language)
      if (st.exists) {
        setProfile(st.profile)
        await refreshInstances()
        go({ name: 'dashboard' })
      }
      // Dev only (vite in a browser): ?screen=login | create | search | instance:<id> jumps straight to a screen.
      if (!inWails) {
        const want = new URLSearchParams(location.search).get('screen')
        if (want === 'login') {
          setProfile(null); go({ name: 'login' })
        } else if (want) {
          setProfile(st.profile); await refreshInstances()
          const [name, id] = want.split(':')
          go(name === 'instance' ? { name: 'instance', id } : name === 'create' ? { name: 'create' } : name === 'search' ? { name: 'search' } : { name: 'dashboard' })
        }
      }
      setReady(true)
    })
  }, [refreshInstances])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.lang = language
  }, [theme, language])

  const persistPrefs = useCallback(async (patch: Partial<Profile>) => {
    if (!profile) return
    setProfile(await api.SaveProfile({ ...profile, ...patch }))
  }, [profile])

  const setTheme = (t: Theme) => { setThemeState(t); persistPrefs({ theme: t }) }
  const setLanguage = (l: Language) => { setLanguageState(l); persistPrefs({ language: l }) }

  // Each profile has its own instances: after a switch (or a removal, whose
  // instances move to the active profile) the list is reloaded and the
  // player lands on the dashboard, since the page they were on may belong
  // to the other profile.
  const switchTo = useCallback(async (patch: Partial<Profile>) => {
    await persistPrefs(patch)
    await refreshInstances()
    go({ name: 'dashboard' })
  }, [persistPrefs, refreshInstances, go])
  const setNickname = useCallback((name: string) => switchTo({ nickname: name, nicknames: [name, ...(profile?.nicknames ?? [])] }), [switchTo, profile])
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
    ready, theme, setTheme, language, setLanguage, t: DICTS[language],
    screen, go, previous: history[history.length - 1]?.screen ?? null, back, cameBack, profile, saveProfile, nickname: profile?.nickname ?? '', setNickname, removeNickname,
    instances, refreshInstances,
    privacyOpen, setPrivacyOpen,
  }), [ready, theme, language, screen, history, cameBack, back, profile, instances, privacyOpen, refreshInstances, saveProfile, setNickname, removeNickname]) // eslint-disable-line react-hooks/exhaustive-deps

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
