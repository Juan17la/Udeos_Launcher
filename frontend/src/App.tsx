import { AppProvider, useApp } from './state'
import Nav from './components/Nav'
import PrivacyDialog from './components/PrivacyDialog'
import LaunchDialog from './components/LaunchDialog'
import Notifications from './components/Notifications'
import AutoLoader from './ui/Loader'
import Login from './screens/Login'
import Dashboard from './screens/Dashboard'
import CreateInstance from './screens/CreateInstance'
import InstancePage from './screens/instance/InstancePage'
import Search from './screens/Search'
import ProjectDetail from './screens/ProjectDetail'

function Shell() {
  const { ready, screen } = useApp()
  // Boot (profile + instance list) is an async state like any other: a loader, not a blank window.
  if (!ready) return <AutoLoader overlay active />
  return (
    <>
      {screen.name !== 'login' && <Nav />}
      {screen.name === 'login' && <Login />}
      {screen.name === 'dashboard' && <Dashboard />}
      {screen.name === 'create' && <CreateInstance />}
      {screen.name === 'instance' && <InstancePage id={screen.id} />}
      {screen.name === 'search' && <Search instanceId={screen.instanceId} type={screen.type} />}
      {screen.name === 'detail' && <ProjectDetail result={screen.result} instanceId={screen.instanceId} />}
      <LaunchDialog />
      <Notifications />
      <PrivacyDialog />
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
