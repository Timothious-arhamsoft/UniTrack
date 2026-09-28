import { useState } from 'react'
import './index.css'
import { Sidebar }    from './components'
import { useNotifications } from './hooks'
import { Overview, Sources, Deadlines, Calendar, Reminders, Settings } from './pages'

type Page = 'overview' | 'sources' | 'deadlines' | 'calendar' | 'reminders' | 'settings'

const App = () => {
  const [page,      setPage]      = useState<Page>('overview')
  const [collapsed, setCollapsed] = useState(false)

  // Start notification polling at the app root
  useNotifications()

  const renderPage = () => {
    switch (page) {
      case 'overview':  return <Overview  onNavigate={(p: string) => setPage(p as Page)} />
      case 'sources':   return <Sources   />
      case 'deadlines': return <Deadlines />
      case 'calendar':  return <Calendar  />
      case 'reminders': return <Reminders />
      case 'settings':  return <Settings  />
      default:          return <Overview  onNavigate={(p: string) => setPage(p as Page)} />
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar
        activePage={page}
        onNavigate={(p: string) => setPage(p as Page)}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
      />

      {/* Main content area */}
      <main style={{
        flex: 1,
        overflowY: 'auto',
        padding: '32px',
        minWidth: 0,
      }}>
        {renderPage()}
      </main>
    </div>
  )
}

export default App
