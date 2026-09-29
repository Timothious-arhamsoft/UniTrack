import { useState } from 'react'
import './index.css'
import { Sidebar } from './components'
import { useNotifications } from './hooks'
import { Overview, Chat, Sources, Deadlines, Calendar, Reminders, Settings } from './pages'
import {UniTrackLogo} from './assets'

type Page = 'overview' | 'chat' | 'sources' | 'deadlines' | 'calendar' | 'reminders' | 'settings'

const App = () => {
  const [page, setPage] = useState<Page>('overview')
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Start notification polling at the app root
  useNotifications()

  const renderPage = () => {
    switch (page) {
      case 'overview':  return <Overview onNavigate={(p: string) => setPage(p as Page)} />
      case 'chat':      return <Chat />
      case 'sources':   return <Sources />
      case 'deadlines': return <Deadlines />
      case 'calendar':  return <Calendar />
      case 'reminders': return <Reminders />
      case 'settings':  return <Settings />
      default:          return <Overview onNavigate={(p: string) => setPage(p as Page)} />
    }
  }

  const handleNavigate = (p: string) => {
    setPage(p as Page)
    setMobileOpen(false)
  }

  return (
    <div className="app-layout">
      {/* Mobile Top Header */}
      <div className="mobile-header">
        <button
          className="btn btn-ghost btn-icon"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation"
        >
          ☰
        </button>
        <span style={{ fontWeight: 700, fontSize: '1.1rem', whiteSpace: 'nowrap' }}>
          <span style={{ color: '#b598f3' }}>Uni</span>
          <span style={{ color: '#FCB100' }}>Track</span>
        </span>
          <UniTrackLogo
            size={42}
            showName={false}
            className="mobile-lock-logo"
          />
      </div>

      {/* Sidebar Navigation */}
      <div className={`sidebar-wrapper ${mobileOpen ? 'mobile-open' : ''}`}>
        <Sidebar
          activePage={page}
          onNavigate={handleNavigate}
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
        />
      </div>

      {/* Backdrop overlay for mobile drawer */}
      {mobileOpen && (
        <div
          className="mobile-backdrop"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <main className="app-main">
        <div className="page-container">
          {renderPage()}
        </div>
      </main>
    </div>
  )
}

export default App
