import { Component, Fragment, useEffect } from 'react'
import type { ReactNode } from 'react'
import { AppProvider, useApp } from './state'
import BackButton from './components/BackButton'
import Sidebar from './components/Sidebar'
import PrivacyDialog from './components/PrivacyDialog'
import LaunchDialog from './components/LaunchDialog'
import CloseDialog from './components/CloseDialog'
import UpdateDialog from './components/UpdateDialog'
import AutoLoader from './ui/Loader'
import Backdrop from './ui/Backdrop'
import ErrorMessage from './components/ErrorMessage'
import Login from './screens/Login'
import Dashboard from './screens/Dashboard'
import CreateInstance from './screens/CreateInstance'
import InstancePage from './screens/instance/InstancePage'
import Search from './screens/Search'
import Advisor from './screens/Advisor'
import ProjectDetail from './screens/ProjectDetail'
import Servers from './screens/Servers'
import ServerPage from './screens/server/ServerPage'
import Skins from './screens/Skins'
import SkinEditor from './screens/SkinEditor'

/** A page that throws while rendering shows the error instead of a blank window; Back or the nav leave it. */
class PageGuard extends Component<{ screen: unknown; children: ReactNode }, { error?: Error }> {
  state: { error?: Error } = {}
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidUpdate(prev: { screen: unknown }) { if (prev.screen !== this.props.screen && this.state.error) this.setState({ error: undefined }) }
  render() {
    if (!this.state.error) return this.props.children
    return <main className="flex-1 pt-8 px-10"><ErrorMessage message={String(this.state.error.stack ?? this.state.error)} /></main>
  }
}

function Shell() {
  const { ready, screen, language } = useApp()
  // Login has no sidebar: the page takes the whole window (tokens.css, #root[data-bare]).
  useEffect(() => { document.getElementById('root')?.toggleAttribute('data-bare', screen.name === 'login') }, [screen.name])
  // Boot (profile + instance list) is an async state like any other: a loader, not a blank window.
  if (!ready) return <AutoLoader overlay active />
  return (
    <>
      <Backdrop />
      {/* Keyed by language: changing it remounts the nav and the page, so every size and border is laid out fresh for the new text instead of carrying over the old language's. Login is excluded (its own language picker would wipe the typed nickname) and remounts itself instead. */}
      <Fragment key={screen.name === 'login' ? 'login' : language}>
      {screen.name !== 'login' && <Sidebar />}
      {(((['create', 'instance', 'ai', 'server', 'detail', 'skinEditor'] as string[]).includes(screen.name)) || (screen.name === 'search' && !!screen.instanceId)) && (
        <BackButton inner={screen.name === 'create' ? 'px-[max(2rem,calc(50%-280px))]' : ''} />
      )}
      <PageGuard screen={screen}>
      {screen.name === 'login' && <Login key={String(!!screen.adding)} adding={screen.adding} />}
      {screen.name === 'dashboard' && <Dashboard />}
      {screen.name === 'create' && <CreateInstance key={`${!!screen.server}|${screen.modpack?.id ?? ''}`} server={screen.server} modpack={screen.modpack} />}
      {screen.name === 'instance' && <InstancePage id={screen.id} />}
      {/* Keyed by what the page was opened for: Addons for an instance, for a server and plain Addons are different visits, so none inherits another's search, tab or filters. */}
      {screen.name === 'search' && <Search key={`${screen.instanceId ?? ''}|${screen.type ?? ''}|${screen.prefill ? JSON.stringify(screen.prefill) : ''}`} instanceId={screen.instanceId} type={screen.type} prefill={screen.prefill} />}
      {screen.name === 'ai' && <Advisor key={screen.instanceId ?? ''} instanceId={screen.instanceId} />}
      {screen.name === 'servers' && <Servers />}
      {screen.name === 'server' && <ServerPage id={screen.id} />}
      {screen.name === 'detail' && <ProjectDetail result={screen.result} instanceId={screen.instanceId} />}
      {screen.name === 'skins' && <Skins />}
      {screen.name === 'skinEditor' && <SkinEditor key={screen.id ?? ''} id={screen.id} />}
      </PageGuard>
      </Fragment>
      <LaunchDialog />
      <PrivacyDialog />
      <CloseDialog />
      {screen.name !== 'login' && <UpdateDialog />}
    </>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  )
}
