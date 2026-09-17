import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react'
import { DICTS, Language } from './i18n'
import type { Dict } from './i18n/en'
import { api, inWails, on } from './api/bridge'
import type { GameEvent, Instance, Profile, Progress, ProjectType, SearchResult } from './api/types'

export type Theme = 'light' | 'dark'

/** Which screen is on stage. Kept as plain state — the app is small enough not to need a router. */
export type Screen =
  | { name: 'login' }
  | { name: 'dashboard' }
  | { name: 'create' }
  | { name: 'instance'; id: string }
  /** instanceId/type soft-default the version/loader filters and which instance is
   *  preselected in the Add picker (from an instance's Browse Modrinth button). */
  | { name: 'search'; instanceId?: string; type?: ProjectType }
  /** Full-page view of one search result: description, available versions/loaders,
   *  and which of the player's instances can take it. */
  | { name: 'detail'; result: SearchResult }

/** What the Play button is doing right now. */
export type LaunchState =
  | { status: 'idle' }
  | { status: 'preparing'; instanceId: string; progress: Progress | null }
  | { status: 'error'; instanceId: string; message: string }
  | { status: 'exited'; instanceId: string; exitCode: number; logPath: string }

type AppState = {
  ready: boolean
  theme: Theme; setTheme: (t: Theme) => void
  language: Language; setLanguage: (l: Language) => void
  t: Dict
  screen: Screen; go: (s: Screen) => void
  profile: Profile | null; saveProfile: (p: Profile) => Promise<void>
  nickname: string
  instances: Instance[]; refreshInstances: () => Promise<void>
  privacyOpen: boolean; setPrivacyOpen: (v: boolean) => void
}

/** Changes on every install/download progress tick — kept in its own context
 *  so screens that don't play/launch anything (Nav, Search, dialogs, Decor,
 *  CreateInstance) don't re-render on every tick. */
type LaunchContextValue = { launch: LaunchState; play: (id: string) => Promise<void>; dismissLaunch: () => void }

const Ctx = createContext<AppState | null>(null)
const LaunchCtx = createContext<LaunchContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [theme, setThemeState] = useState<Theme>('dark')
  const [language, setLanguageState] = useState<Language>('en')
  const [screen, go] = useState<Screen>({ name: 'login' })
  const [instances, setInstances] = useState<Instance[]>([])
  const [launch, setLaunch] = useState<LaunchState>({ status: 'idle' })
  const [privacyOpen, setPrivacyOpen] = useState(false)

  const refreshInstances = useCallback(async () => {
    setInstances(await api.ListInstances())
  }, [])

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
      // Dev only (vite in a browser): ?screen=create | instance:<id> jumps straight to a screen.
      if (!inWails) {
        const want = new URLSearchParams(location.search).get('screen')
        if (want) {
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

  // Backend events: download progress and game process state.
  useEffect(() => {
    const offProgress = on('install:progress', (p) => {
      setLaunch((cur) => (cur.status === 'preparing' ? { ...cur, progress: p } : cur))
    })
    const offGame = on('game:state', (ev: GameEvent) => {
      if (ev.running) {
        setLaunch({ status: 'idle' })
      } else if (ev.exitCode !== 0 || ev.error) {
        setLaunch({ status: 'exited', instanceId: ev.instanceId, exitCode: ev.exitCode, logPath: ev.logPath })
      }
      refreshInstances()
    })
    return () => { offProgress(); offGame() }
  }, [refreshInstances])

  const persistPrefs = useCallback(async (patch: Partial<Profile>) => {
    if (!profile) return
    const next = await api.SaveProfile({ ...profile, ...patch })
    setProfile(next)
  }, [profile])

  const setTheme = (t: Theme) => { setThemeState(t); persistPrefs({ theme: t }) }
  const setLanguage = (l: Language) => { setLanguageState(l); persistPrefs({ language: l }) }

  const saveProfile = useCallback(async (p: Profile) => {
    const saved = await api.SaveProfile(p)
    setProfile(saved)
    await refreshInstances()
    go({ name: 'dashboard' })
  }, [refreshInstances])

  const play = useCallback(async (id: string) => {
    setLaunch({ status: 'preparing', instanceId: id, progress: null })
    try {
      await api.LaunchInstance(id)
      await refreshInstances()
    } catch (e) {
      setLaunch({ status: 'error', instanceId: id, message: String((e as Error)?.message ?? e) })
    }
  }, [refreshInstances])

  const dismissLaunch = useCallback(() => setLaunch({ status: 'idle' }), [])

  const value = useMemo<AppState>(() => ({
    ready, theme, setTheme, language, setLanguage, t: DICTS[language],
    screen, go, profile, saveProfile, nickname: profile?.nickname ?? '',
    instances, refreshInstances,
    privacyOpen, setPrivacyOpen,
  }), [ready, theme, language, screen, profile, instances, privacyOpen, refreshInstances, saveProfile]) // eslint-disable-line react-hooks/exhaustive-deps

  const launchValue = useMemo<LaunchContextValue>(() => ({ launch, play, dismissLaunch }), [launch, play, dismissLaunch])

  return (
    <Ctx.Provider value={value}>
      <LaunchCtx.Provider value={launchValue}>{children}</LaunchCtx.Provider>
    </Ctx.Provider>
  )
}

export function useApp(): AppState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp must be used inside <AppProvider>')
  return v
}

export function useLaunch(): LaunchContextValue {
  const v = useContext(LaunchCtx)
  if (!v) throw new Error('useLaunch must be used inside <AppProvider>')
  return v
}
