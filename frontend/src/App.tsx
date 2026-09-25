import { AppProvider, useApp } from './state'
import Nav from './components/Nav'
import PrivacyDialog from './components/PrivacyDialog'
import LaunchDialog from './components/LaunchDialog'
import Notifications from './components/Notifications'
import CloseDialog from './components/CloseDialog'
import AutoLoader from './ui/Loader'
import Login from './screens/Login'
import Dashboard from './screens/Dashboard'
import CreateInstance from './screens/CreateInstance'
import InstancePage from './screens/instance/InstancePage'
import Search from './screens/Search'
import ProjectDetail from './screens/ProjectDetail'
import Servers from './screens/Servers'
import ServerPage from './screens/server/ServerPage'
import Skins from './screens/Skins'
import SkinEditor from './screens/SkinEditor'

function Shell() {
  const { ready, screen } = useApp()
  // Boot (profile + instance list) is an async state like any other: a loader, not a blank window.
  if (!ready) return <AutoLoader overlay active />
  return (
    <>
      {screen.name !== 'login' && <Nav />}
      {screen.name === 'login' && <Login />}
      {screen.name === 'dashboard' && <Dashboard />}
      {screen.name === 'create' && <CreateInstance key={String(!!screen.server)} server={screen.server} />}
      {screen.name === 'instance' && <InstancePage id={screen.id} />}
      {screen.name === 'search' && <Search instanceId={screen.instanceId} type={screen.type} />}
      {screen.name === 'servers' && <Servers />}
      {screen.name === 'server' && <ServerPage id={screen.id} />}
      {screen.name === 'detail' && <ProjectDetail result={screen.result} instanceId={screen.instanceId} />}
      {screen.name === 'skins' && <Skins />}
      {screen.name === 'skinEditor' && <SkinEditor key={screen.id ?? ''} id={screen.id} />}
      <LaunchDialog />
      <Notifications />
      <PrivacyDialog />
      <CloseDialog />
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
