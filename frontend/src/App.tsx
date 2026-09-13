import { AppProvider, useApp } from './state'
import Nav from './components/Nav'
import PrivacyDialog from './components/PrivacyDialog'
import LanguageDialog from './components/LanguageDialog'
import ProgressOverlay from './components/ProgressOverlay'
import Login from './screens/Login'
import Dashboard from './screens/Dashboard'
import CreateInstance from './screens/CreateInstance'
import InstancePage from './screens/InstancePage'

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
      <ProgressOverlay />
      <PrivacyDialog />
      <LanguageDialog />
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
