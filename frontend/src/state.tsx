import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react'
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
  /** instanceId (from an instance's Add from Modrinth button) locks the results to
   *  that instance's version/loader and makes Add install with no picker. */
  | { name: 'search'; instanceId?: string; type?: ProjectType }
  /** Full-page view of one search result: description, available versions/loaders,
   *  and which of the player's instances can take it. instanceId keeps the
   *  instance lock alive across Details → Back. */
  | { name: 'detail'; result: SearchResult; instanceId?: string }

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

/** One "add this project to that instance" request, shown as a toast. */
export type ContentJob = {
  id: number
  instanceId: string
  result: SearchResult
  status: 'queued' | 'installing' | 'done' | 'error'
  progress: Progress | null
  /** Rejection reason (status 'error'). */
  message: string
  /** Files added (status 'done'); 0 means the project was already there. */
  count: number
}

/** Install queue for content added from the Addons page. Jobs run one at a
 *  time: the backend's content:progress event carries no job id, so a single
 *  AddContent in flight is the only way to know which toast a tick belongs
 *  to. Like LaunchCtx, it is its own context so progress ticks re-render the
 *  toast host only. */
type ContentContextValue = { jobs: ContentJob[]; enqueue: (instanceId: string, result: SearchResult) => void; dismiss: (id: number) => void }

const Ctx = createContext<AppState | null>(null)
const LaunchCtx = createContext<LaunchContextValue | null>(null)
const ContentCtx = createContext<ContentContextValue | null>(null)

/** How long a finished toast stays before it clears itself. Errors stay until dismissed. */
const DONE_TOAST_MS = 5000

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

  // Content install queue.
  const [jobs, setJobs] = useState<ContentJob[]>([])
  const nextJobId = useRef(1)
  const running = useRef(false)
  const patchJob = (id: number, patch: Partial<ContentJob>) => setJobs((cur) => cur.map((j) => (j.id === id ? { ...j, ...patch } : j)))

  const enqueue = useCallback((instanceId: string, result: SearchResult) => {
    setJobs((cur) => {
      const dup = cur.some((j) => j.instanceId === instanceId && j.result.id === result.id && (j.status === 'queued' || j.status === 'installing'))
      if (dup) return cur
      return [...cur, { id: nextJobId.current++, instanceId, result, status: 'queued', progress: null, message: '', count: 0 }]
    })
  }, [])

  const dismiss = useCallback((id: number) => setJobs((cur) => cur.filter((j) => j.id !== id)), [])

  // Start the next queued job whenever nothing is installing.
  useEffect(() => {
    if (running.current) return
    const next = jobs.find((j) => j.status === 'queued')
    if (!next) return
    running.current = true
    patchJob(next.id, { status: 'installing' })
    api.AddContent(next.instanceId, next.result.id, next.result.projectType)
      .then((entries) => {
        patchJob(next.id, { status: 'done', count: entries.length, progress: null })
        setTimeout(() => dismiss(next.id), DONE_TOAST_MS)
        refreshInstances()
      })
      .catch((e) => patchJob(next.id, { status: 'error', message: String((e as Error)?.message ?? e), progress: null }))
      .finally(() => { running.current = false; setJobs((cur) => [...cur]) }) // re-run this effect for the next job
  }, [jobs, dismiss, refreshInstances])

  useEffect(() => on('content:progress', (p) => {
    setJobs((cur) => cur.map((j) => (j.status === 'installing' ? { ...j, progress: p } : j)))
  }), [])

  const value = useMemo<AppState>(() => ({
    ready, theme, setTheme, language, setLanguage, t: DICTS[language],
    screen, go, profile, saveProfile, nickname: profile?.nickname ?? '',
    instances, refreshInstances,
    privacyOpen, setPrivacyOpen,
  }), [ready, theme, language, screen, profile, instances, privacyOpen, refreshInstances, saveProfile]) // eslint-disable-line react-hooks/exhaustive-deps

  const launchValue = useMemo<LaunchContextValue>(() => ({ launch, play, dismissLaunch }), [launch, play, dismissLaunch])
  const contentValue = useMemo<ContentContextValue>(() => ({ jobs, enqueue, dismiss }), [jobs, enqueue, dismiss])

  return (
    <Ctx.Provider value={value}>
      <LaunchCtx.Provider value={launchValue}>
        <ContentCtx.Provider value={contentValue}>{children}</ContentCtx.Provider>
      </LaunchCtx.Provider>
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

export function useContent(): ContentContextValue {
  const v = useContext(ContentCtx)
  if (!v) throw new Error('useContent must be used inside <AppProvider>')
  return v
}
