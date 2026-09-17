import { AppProvider, useApp } from './state'
import Nav from './components/Nav'
import PrivacyDialog from './components/PrivacyDialog'
import ProgressOverlay from './components/ProgressOverlay'
import InstallToasts from './components/InstallToasts'
import Login from './screens/Login'
import Dashboard from './screens/Dashboard'
import CreateInstance from './screens/CreateInstance'
import InstancePage from './screens/InstancePage'
import Search from './screens/Search'
import ProjectDetail from './screens/ProjectDetail'

function Shell() {
  const { ready, screen } = useApp()
  if (!ready) return null
  return (
    <>
      {screen.name !== 'login' && <Nav />}
      {screen.name === 'login' && <Login />}
      {screen.name === 'dashboard' && <Dashboard />}
      {screen.name === 'create' && <CreateInstance />}
      {screen.name === 'instance' && <InstancePage id={screen.id} />}
      {screen.name === 'search' && <Search instanceId={screen.instanceId} type={screen.type} />}
      {screen.name === 'detail' && <ProjectDetail result={screen.result} instanceId={screen.instanceId} />}
      <ProgressOverlay />
      <InstallToasts />
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
